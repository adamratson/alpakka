import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as Y from "yjs";
import type { SyncTransport } from "../collab/sync";

interface FakeRoom {
  sessionId: string;
  peerJoinHandlers: Array<(peerId: string) => void>;
  peerLeaveHandlers: Array<(peerId: string) => void>;
  peerCount: number;
  leave: ReturnType<typeof vi.fn>;
  transport: SyncTransport;
}

interface FakeSyncHandle {
  doc: Y.Doc;
  transport: SyncTransport;
  resync: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
}

const harness = vi.hoisted(() => ({
  rooms: [] as FakeRoom[],
  syncHandles: [] as FakeSyncHandle[],
  nextSessionId: 0,
}));

vi.mock("../collab/room", async () => {
  const { vi } = await import("vitest");
  return {
    joinSessionRoom: vi.fn((sessionId: string) => {
      const transport: SyncTransport = {
        send: () => {},
        onMessage: () => () => {},
      };
      const room: FakeRoom = {
        sessionId,
        peerJoinHandlers: [],
        peerLeaveHandlers: [],
        peerCount: 0,
        leave: vi.fn().mockResolvedValue(undefined),
        transport,
      };
      harness.rooms.push(room);
      return {
        transport,
        onPeerJoin: (fn: (peerId: string) => void) => {
          room.peerJoinHandlers.push(fn);
        },
        onPeerLeave: (fn: (peerId: string) => void) => {
          room.peerLeaveHandlers.push(fn);
        },
        peerCount: () => room.peerCount,
        leave: room.leave,
      };
    }),
  };
});

vi.mock("../collab/sync", async () => {
  const { vi } = await import("vitest");
  return {
    startSync: vi.fn((doc: Y.Doc, transport: SyncTransport) => {
      const handle: FakeSyncHandle = {
        doc,
        transport,
        resync: vi.fn(),
        stop: vi.fn(),
      };
      harness.syncHandles.push(handle);
      return handle;
    }),
  };
});

vi.mock("../collab/session", async () => {
  const { vi } = await import("vitest");
  return {
    newSessionId: vi.fn(() => `mock-session-${++harness.nextSessionId}`),
  };
});

vi.mock("../collab/useYDocs", () => ({ useYDocs: vi.fn() }));

vi.mock("../utils/listStorage", async () => {
  const { vi } = await import("vitest");
  return {
    loadInitial: vi.fn(() => ({ lists: [], activeId: "", sessions: {} })),
    persistDoc: vi.fn(),
    persistIndex: vi.fn(),
    removeListFromStorage: vi.fn(),
  };
});

import { useLists } from "./useLists";
import * as listStorage from "../utils/listStorage";

function findRoom(sessionId: string): FakeRoom {
  const room = harness.rooms.find((r) => r.sessionId === sessionId);
  if (!room) throw new Error(`no room for sessionId ${sessionId}`);
  return room;
}

function findSyncHandle(doc: Y.Doc): FakeSyncHandle {
  const handle = harness.syncHandles.find((h) => h.doc === doc);
  if (!handle) throw new Error(`no sync handle for doc`);
  return handle;
}

function emitPeerJoin(sessionId: string, peerId = "peer-1") {
  const room = findRoom(sessionId);
  room.peerCount += 1;
  room.peerJoinHandlers.forEach((fn) => fn(peerId));
}

function emitPeerLeave(sessionId: string, peerId = "peer-1") {
  const room = findRoom(sessionId);
  room.peerCount = Math.max(0, room.peerCount - 1);
  room.peerLeaveHandlers.forEach((fn) => fn(peerId));
}

describe("useLists collaboration", () => {
  beforeEach(() => {
    harness.rooms.length = 0;
    harness.syncHandles.length = 0;
    harness.nextSessionId = 0;
    vi.clearAllMocks();
  });

  describe("starting a share", () => {
    it("opens a Trystero room with the freshly minted session id", () => {
      const { result } = renderHook(() => useLists());
      act(() => result.current.createList());
      const listId = result.current.lists[0].id;

      act(() => result.current.startSharing(listId));

      const sessionId = result.current.sessions[listId];
      expect(sessionId).toBe("mock-session-1");
      expect(harness.rooms).toHaveLength(1);
      expect(harness.rooms[0].sessionId).toBe(sessionId);
    });

    it("starts sync for the shared list's doc using the room's transport", () => {
      const { result } = renderHook(() => useLists());
      act(() => result.current.createList());
      const listId = result.current.lists[0].id;
      const doc = result.current.lists[0].doc;

      act(() => result.current.startSharing(listId));

      expect(harness.syncHandles).toHaveLength(1);
      expect(harness.syncHandles[0].doc).toBe(doc);
      expect(harness.syncHandles[0].transport).toBe(harness.rooms[0].transport);
    });

    it("reports waiting status until a peer joins", () => {
      const { result } = renderHook(() => useLists());
      act(() => result.current.createList());
      const listId = result.current.lists[0].id;

      act(() => result.current.startSharing(listId));

      expect(result.current.roomStatus[listId]).toBe("waiting");
    });

    it("does not open a duplicate room when sharing the same list twice", () => {
      const { result } = renderHook(() => useLists());
      act(() => result.current.createList());
      const listId = result.current.lists[0].id;

      act(() => result.current.startSharing(listId));
      act(() => result.current.startSharing(listId));

      expect(harness.rooms).toHaveLength(1);
    });
  });

  describe("peer presence", () => {
    it("flips status to connected and triggers a resync when a peer joins", () => {
      const { result } = renderHook(() => useLists());
      act(() => result.current.createList());
      const listId = result.current.lists[0].id;
      act(() => result.current.startSharing(listId));

      const sessionId = result.current.sessions[listId];
      const sync = findSyncHandle(result.current.lists[0].doc);

      act(() => emitPeerJoin(sessionId));

      expect(result.current.roomStatus[listId]).toBe("connected");
      expect(sync.resync).toHaveBeenCalledTimes(1);
    });

    it("returns to waiting when the last peer leaves", () => {
      const { result } = renderHook(() => useLists());
      act(() => result.current.createList());
      const listId = result.current.lists[0].id;
      act(() => result.current.startSharing(listId));
      const sessionId = result.current.sessions[listId];

      act(() => emitPeerJoin(sessionId));
      expect(result.current.roomStatus[listId]).toBe("connected");

      act(() => emitPeerLeave(sessionId));
      expect(result.current.roomStatus[listId]).toBe("waiting");
    });

    it("stays connected while at least one peer remains", () => {
      const { result } = renderHook(() => useLists());
      act(() => result.current.createList());
      const listId = result.current.lists[0].id;
      act(() => result.current.startSharing(listId));
      const sessionId = result.current.sessions[listId];

      act(() => emitPeerJoin(sessionId, "peer-A"));
      act(() => emitPeerJoin(sessionId, "peer-B"));
      expect(result.current.roomStatus[listId]).toBe("connected");

      act(() => emitPeerLeave(sessionId, "peer-A"));
      expect(result.current.roomStatus[listId]).toBe("connected");

      act(() => emitPeerLeave(sessionId, "peer-B"));
      expect(result.current.roomStatus[listId]).toBe("waiting");
    });
  });

  describe("stopping a share", () => {
    it("tears down the sync and leaves the room", () => {
      const { result } = renderHook(() => useLists());
      act(() => result.current.createList());
      const listId = result.current.lists[0].id;
      act(() => result.current.startSharing(listId));

      const sync = harness.syncHandles[0];
      const room = harness.rooms[0];

      act(() => result.current.stopSharing(listId));

      expect(sync.stop).toHaveBeenCalledTimes(1);
      expect(room.leave).toHaveBeenCalledTimes(1);
      expect(result.current.sessions[listId]).toBeUndefined();
      expect(result.current.roomStatus[listId]).toBeUndefined();
    });

    it("tears down the room when the shared list is deleted", () => {
      const { result } = renderHook(() => useLists());
      act(() => {
        result.current.createList();
        result.current.createList();
      });
      const listId = result.current.lists[0].id;
      act(() => result.current.startSharing(listId));

      const sync = harness.syncHandles[0];
      const room = harness.rooms[0];

      act(() => result.current.deleteList(listId));

      expect(sync.stop).toHaveBeenCalledTimes(1);
      expect(room.leave).toHaveBeenCalledTimes(1);
      expect(result.current.sessions[listId]).toBeUndefined();
    });
  });

  describe("multiple shared lists", () => {
    it("opens independent rooms with distinct session ids", () => {
      const { result } = renderHook(() => useLists());
      act(() => {
        result.current.createList();
        result.current.createList();
      });
      const idA = result.current.lists[0].id;
      const idB = result.current.lists[1].id;

      act(() => result.current.startSharing(idA));
      act(() => result.current.startSharing(idB));

      const sidA = result.current.sessions[idA];
      const sidB = result.current.sessions[idB];
      expect(sidA).not.toBe(sidB);
      expect(harness.rooms).toHaveLength(2);
      expect(harness.rooms.map((r) => r.sessionId).sort()).toEqual(
        [sidA, sidB].sort()
      );
    });

    it("tracks status per list independently", () => {
      const { result } = renderHook(() => useLists());
      act(() => {
        result.current.createList();
        result.current.createList();
      });
      const idA = result.current.lists[0].id;
      const idB = result.current.lists[1].id;
      act(() => result.current.startSharing(idA));
      act(() => result.current.startSharing(idB));

      const sidA = result.current.sessions[idA];
      act(() => emitPeerJoin(sidA));

      expect(result.current.roomStatus[idA]).toBe("connected");
      expect(result.current.roomStatus[idB]).toBe("waiting");
    });

    it("only tears down the room for the unshared list", () => {
      const { result } = renderHook(() => useLists());
      act(() => {
        result.current.createList();
        result.current.createList();
      });
      const idA = result.current.lists[0].id;
      const idB = result.current.lists[1].id;
      act(() => result.current.startSharing(idA));
      act(() => result.current.startSharing(idB));

      const roomA = harness.rooms[0];
      const roomB = harness.rooms[1];
      const syncA = harness.syncHandles[0];
      const syncB = harness.syncHandles[1];

      act(() => result.current.stopSharing(idA));

      expect(syncA.stop).toHaveBeenCalled();
      expect(roomA.leave).toHaveBeenCalled();
      expect(syncB.stop).not.toHaveBeenCalled();
      expect(roomB.leave).not.toHaveBeenCalled();
      expect(result.current.sessions[idB]).toBeDefined();
    });
  });

  describe("joining a session via shared link", () => {
    it("creates a new list bound to the inbound session id and opens its room", () => {
      const { result } = renderHook(() => useLists());
      act(() => result.current.createList());
      expect(result.current.lists).toHaveLength(1);

      act(() => result.current.joinSession("inbound-session"));

      expect(result.current.lists).toHaveLength(2);
      const joinedListId = result.current.lists[1].id;
      expect(result.current.sessions[joinedListId]).toBe("inbound-session");
      expect(result.current.activeId).toBe(joinedListId);
      expect(harness.rooms.some((r) => r.sessionId === "inbound-session")).toBe(
        true
      );
    });

    it("switches to the existing list when joining a session already in our store", () => {
      const { result } = renderHook(() => useLists());
      act(() => result.current.createList());
      const sharedId = result.current.lists[0].id;
      act(() => result.current.startSharing(sharedId));
      const sessionId = result.current.sessions[sharedId];

      // Move active away first so we can prove the join switches us back.
      act(() => result.current.createList());
      const otherId = result.current.lists[1].id;
      act(() => result.current.setActiveId(otherId));
      expect(result.current.activeId).toBe(otherId);

      const roomCountBefore = harness.rooms.length;

      act(() => result.current.joinSession(sessionId));

      expect(result.current.activeId).toBe(sharedId);
      expect(result.current.lists).toHaveLength(2);
      expect(harness.rooms.length).toBe(roomCountBefore);
    });
  });

  describe("persistence", () => {
    it("persists the sessions map alongside list ids", () => {
      const { result } = renderHook(() => useLists());
      act(() => result.current.createList());
      const listId = result.current.lists[0].id;

      act(() => result.current.startSharing(listId));

      const calls = vi.mocked(listStorage.persistIndex).mock.calls;
      const lastCall = calls[calls.length - 1][0];
      expect(lastCall.sessions).toEqual({ [listId]: "mock-session-1" });
      expect(lastCall.ids).toEqual([listId]);
    });

    it("persists the sessions map without the entry after stopping", () => {
      const { result } = renderHook(() => useLists());
      act(() => result.current.createList());
      const listId = result.current.lists[0].id;
      act(() => result.current.startSharing(listId));

      act(() => result.current.stopSharing(listId));

      const calls = vi.mocked(listStorage.persistIndex).mock.calls;
      const lastCall = calls[calls.length - 1][0];
      expect(lastCall.sessions).toEqual({});
    });
  });
});
