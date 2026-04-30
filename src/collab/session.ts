import type { RoomHandle } from "./room";
import type { SyncHandle } from "./sync";

export type ListSessionStatus = "waiting" | "connected";

export interface OpenRoom {
  sessionId: string;
  roomHandle: RoomHandle;
  syncHandle: SyncHandle;
}

export function newSessionId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
