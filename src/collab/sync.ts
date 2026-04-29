import * as Y from "yjs";

const MSG_STATE_VECTOR = 0;
const MSG_UPDATE = 1;

const SYNC_ORIGIN = "remote";

export interface SyncTransport {
  send: (data: Uint8Array) => void;
  onMessage: (handler: (data: Uint8Array) => void) => () => void;
}

export function startSync(doc: Y.Doc, transport: SyncTransport): () => void {
  const offMsg = transport.onMessage((data) => {
    if (data.length === 0) return;
    const type = data[0];
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

  // Send our state vector last so the receiver can answer; both peers do this
  // independently, so even if one side's initial vector is lost on the wire,
  // the other side's vector will trigger a full diff back.
  const sv = Y.encodeStateVector(doc);
  transport.send(prepend(MSG_STATE_VECTOR, sv));

  return () => {
    offMsg();
    doc.off("update", updateHandler);
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
      channel.send(data as unknown as ArrayBuffer);
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
