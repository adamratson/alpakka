import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useLists } from "./useLists";
import * as Y from "yjs";

// Mocking external dependencies that involve networking or complex side effects
vi.mock("../collab/room", () => ({
  joinSessionRoom: vi.fn(() => ({
    transport: {},
    onPeerJoin: vi.fn(),
    onPeerLeave: vi.fn(),
    leave: vi.fn().mockResolvedValue(undefined),
    peerCount: vi.fn().mockReturnValue(0),
  })),
}));

vi.mock("../collab/sync", () => ({
  startSync: vi.fn(() => ({
    resync: vi.fn(),
    stop: vi.fn(),
  })),
}));

vi.mock("../collab/session", () => ({
  newSessionId: vi.fn(() => "mock-session-id"),
}));

vi.mock("../collab/useYDocs", () => ({
  useYDocs: vi.fn(),
}));

// Mocking listStorage to avoid real localStorage interaction in this hook test
vi.mock("../utils/listStorage", () => ({
  loadInitial: vi.fn(() => ({
    lists: [],
    activeId: "",
    sessions: {},
  })),
  persistDoc: vi.fn(),
  persistIndex: vi.fn(),
  removeListFromStorage: vi.fn(),
}));

describe("useLists", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should initialize with default values from loadInitial", () => {
    const { result } = renderHook(() => useLists());

    expect(result.current.lists).toHaveLength(0);
    expect(result.current.activeId).toBe("");
    expect(result.current.sessions).toEqual({});
  });

  it("should create a new list", () => {
    const { result } = renderHook(() => useLists());

    act(() => {
      result.current.createList();
    });

    expect(result.current.lists).toHaveLength(1);
    expect(result.current.activeId).toContain("list-");
    expect(result.current.lists[0].doc).toBeInstanceOf(Y.Doc);
  });

  it("should rename a list", () => {
    const { result } = renderHook(() => useLists());

    act(() => {
      result.current.createList();
    });

    const targetId = result.current.lists[0].id;
    const newTitle = "New Renamed Title";

    act(() => {
      result.current.renameList(targetId, newTitle);
    });

    expect(result.current.lists[0].id).toBe(targetId);
  });

  it("should delete a list when more than one exists", () => {
    const { result } = renderHook(() => useLists());

    act(() => {
      result.current.createList();
      result.current.createList();
    });

    expect(result.current.lists).toHaveLength(2);
    const targetId = result.current.lists[0].id;
    const survivorId = result.current.lists[1].id;

    act(() => {
      result.current.deleteList(targetId);
    });

    expect(result.current.lists).toHaveLength(1);
    expect(result.current.lists[0].id).toBe(survivorId);
  });

  it("should not delete the last remaining list", () => {
    const { result } = renderHook(() => useLists());

    act(() => {
      result.current.createList();
    });

    const targetId = result.current.lists[0].id;

    act(() => {
      result.current.deleteList(targetId);
    });

    expect(result.current.lists).toHaveLength(1);
    expect(result.current.activeId).toBe(targetId);
  });

  it("should switch activeId when deleting the current active list", () => {
    const { result } = renderHook(() => useLists());

    act(() => {
      result.current.createList(); // list 1
      result.current.createList(); // list 2
    });

    const firstId = result.current.lists[0].id;
    const secondId = result.current.lists[1].id;
    
    act(() => {
      result.current.setActiveId(firstId);
    });
    expect(result.current.activeId).toBe(firstId);

    act(() => {
      result.current.deleteList(firstId);
    });

    expect(result.current.lists).toHaveLength(1);
    expect(result.current.activeId).toBe(secondId);
  });

  it("should start sharing a list", () => {
    const { result } = renderHook(() => useLists());

    act(() => {
      result.current.createList();
    });

    const listId = result.current.lists[0].id;

    act(() => {
      result.current.startSharing(listId);
    });

    expect(result.current.sessions[listId]).toBeDefined();
    expect(result.current.sessions[listId]).toBe("mock-session-id");
  });

  it("should stop sharing a list", () => {
    const { result } = renderHook(() => useLists());

    act(() => {
      result.current.createList();
    });

    const listId = result.current.lists[0].id;

    act(() => {
      result.current.startSharing(listId);
    });
    expect(result.current.sessions[listId]).toBeDefined();

    act(() => {
      result.current.stopSharing(listId);
    });

    expect(result.current.sessions[listId]).toBeUndefined();
  });

  it("should join a session", () => {
    const { result } = renderHook(() => useLists());

    act(() => {
      result.current.createList();
    });

    const sessionId = "new-session-id";

    act(() => {
      result.current.joinSession(sessionId);
    });

    expect(result.current.lists).toHaveLength(2);
    expect(result.current.sessions[result.current.lists[1].id]).toBe(sessionId);
    expect(result.current.activeId).toBe(result.current.lists[1].id);
  });
});