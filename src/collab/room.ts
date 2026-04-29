import { joinRoom, type Room } from "trystero";
import type { SyncTransport } from "./sync";

const APP_ID = "alpakka-collab-v1";
const ACTION_NAMESPACE = "sync";

export interface RoomHandle {
  transport: SyncTransport;
  onPeerJoin: (fn: (peerId: string) => void) => void;
  onPeerLeave: (fn: (peerId: string) => void) => void;
  peerCount: () => number;
  leave: () => Promise<void>;
}

export function joinSessionRoom(sessionId: string): RoomHandle {
  const room: Room = joinRoom({ appId: APP_ID }, sessionId);
  const [send, receive] = room.makeAction<Uint8Array>(ACTION_NAMESPACE);

  let active: ((data: Uint8Array) => void) | null = null;
  const buffered: Uint8Array[] = [];

  receive((data) => {
    // makeAction<Uint8Array> guarantees the type, but Trystero re-encodes via
    // the wire protocol so the in-memory class identity may not be exactly
    // Uint8Array — copy through a fresh view to be safe.
    const u8 = ArrayBuffer.isView(data)
      ? new Uint8Array(data.buffer, data.byteOffset, data.byteLength)
      : new Uint8Array(data as unknown as ArrayBuffer);
    if (active) active(u8);
    else buffered.push(u8);
  });

  const transport: SyncTransport = {
    send: (data) => {
      // Broadcasts to all peers in the room. Yjs sync is idempotent so
      // multi-peer is safe; for our 2-peer scope it's just one delivery.
      send(data).catch(() => {
        // Empty room or peer just dropped. Silent — the liveness check is
        // the canonical signal for "really gone".
      });
    },
    onMessage: (handler) => {
      active = handler;
      buffered.splice(0).forEach((d) => handler(d));
      return () => {
        active = null;
      };
    },
  };

  return {
    transport,
    onPeerJoin: (fn) => {
      room.onPeerJoin(fn);
    },
    onPeerLeave: (fn) => {
      room.onPeerLeave(fn);
    },
    peerCount: () => Object.keys(room.getPeers()).length,
    leave: () => room.leave(),
  };
}
