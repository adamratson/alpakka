import * as Y from "yjs";

const MSG_STATE_VECTOR = 0;
const MSG_UPDATE = 1;
const MSG_HEARTBEAT = 2;

const SYNC_ORIGIN = "remote";

const DEFAULT_HEARTBEAT_MS = 3000;
const DEFAULT_STALE_MS = 10000;

export interface SyncTransport {
  send: (data: Uint8Array) => void;
  onMessage: (handler: (data: Uint8Array) => void) => () => void;
}

export interface SyncOptions {
  /** Called once when no message has been received for `staleMs`. */
  onStale?: () => void;
  /** How often we emit our own heartbeat. */
  heartbeatMs?: number;
  /** How long without any inbound message before we declare staleness. */
  staleMs?: number;
  /** Override the clock — used by tests. */
  now?: () => number;
  /** Override timer scheduling — used by tests. */
  setInterval?: (fn: () => void, ms: number) => unknown;
  /** Pair to the override above. */
  clearInterval?: (handle: unknown) => void;
}

export interface SyncHandle {
  stop: () => void;
  /**
   * Re-broadcast the local state vector to provoke any peers into sending
   * back the diffs we don't have. Used when a new peer joins or a peer
   * reconnects after going away.
   */
  resync: () => void;
  /**
   * Reset the stale-detection clock without sending anything. Useful when
   * the transport itself reports that a peer (re)joined: we don't yet have
   * traffic from them, but we know the connection is fresh.
   */
  noteActivity: () => void;
}

export function startSync(
  doc: Y.Doc,
  transport: SyncTransport,
  options: SyncOptions = {}
): SyncHandle {
  const heartbeatMs = options.heartbeatMs ?? DEFAULT_HEARTBEAT_MS;
  const staleMs = options.staleMs ?? DEFAULT_STALE_MS;
  const now = options.now ?? (() => Date.now());
  const setIntervalFn = options.setInterval ?? globalThis.setInterval;
  const clearIntervalFn = options.clearInterval ?? globalThis.clearInterval;

  let lastReceived = now();
  let stopped = false;
  let staleFired = false;

  const offMsg = transport.onMessage((data) => {
    lastReceived = now();
    if (data.length === 0) return;
    const type = data[0];
    if (type === MSG_HEARTBEAT) return;
    const payload = data.subarray(1);
    if (type === MSG_STATE_VECTOR) {
      const diff = Y.encodeStateAsUpdate(doc, payload);
      transport.send(prepend(MSG_UPDATE, diff));
    } else if (type === MSG_UPDATE) {
      Y.applyUpdate(doc, payload, SYNC_ORIGIN);
    }
  });

  const updateHandler = (update: Uint8Array, origin: unknown) => {
    if (origin === SYNC_ORIGIN) return;
    transport.send(prepend(MSG_UPDATE, update));
  };
  doc.on("update", updateHandler);

  const sendStateVector = () => {
    transport.send(prepend(MSG_STATE_VECTOR, Y.encodeStateVector(doc)));
  };
  sendStateVector();

  const heartbeatHandle = setIntervalFn(() => {
    if (stopped) return;
    transport.send(new Uint8Array([MSG_HEARTBEAT]));
  }, heartbeatMs);

  const livenessHandle = setIntervalFn(() => {
    if (stopped || staleFired) return;
    if (now() - lastReceived > staleMs) {
      staleFired = true;
      options.onStale?.();
    }
  }, Math.max(500, Math.floor(heartbeatMs / 2)));

  return {
    stop: () => {
      stopped = true;
      (clearIntervalFn as (h: unknown) => void)(heartbeatHandle);
      (clearIntervalFn as (h: unknown) => void)(livenessHandle);
      offMsg();
      doc.off("update", updateHandler);
    },
    resync: () => {
      if (stopped) return;
      // Reset staleness too — a fresh peer is live by definition, even
      // before they reply.
      lastReceived = now();
      staleFired = false;
      sendStateVector();
    },
    noteActivity: () => {
      if (stopped) return;
      lastReceived = now();
      staleFired = false;
    },
  };
}

function prepend(type: number, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(data.length + 1);
  out[0] = type;
  out.set(data, 1);
  return out;
}

export function dataChannelTransport(channel: RTCDataChannel): SyncTransport {
  channel.binaryType = "arraybuffer";

  // Attach the message listener eagerly so we don't drop messages that arrive
  // between channel.open and startSync(). Buffer until a sync handler is set.
  let active: ((d: Uint8Array) => void) | null = null;
  const buffered: Uint8Array[] = [];
  channel.addEventListener("message", (e: MessageEvent) => {
    const data = e.data instanceof ArrayBuffer ? new Uint8Array(e.data) : null;
    if (!data) return;
    if (active) active(data);
    else buffered.push(data);
  });

  return {
    send: (data) => {
      // The channel can transition out of "open" between checks (laptop sleep,
      // network change, peer close). Guard so heartbeats and CRDT updates
      // don't surface as unhandled errors — the liveness check will fire.
      if (channel.readyState !== "open") return;
      try {
        channel.send(data as unknown as ArrayBuffer);
      } catch {
        // Same race; ignore.
      }
    },
    onMessage: (handler) => {
      active = handler;
      const queue = buffered.splice(0);
      queue.forEach((d) => handler(d));
      return () => {
        active = null;
      };
    },
  };
}
