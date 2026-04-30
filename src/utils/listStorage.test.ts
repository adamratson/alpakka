import { describe, it, expect, beforeEach, vi } from "vitest";
import { loadInitial, persistDoc, persistIndex, removeListFromStorage } from "./listStorage";
import { createListDoc, encodeDoc } from "../collab/doc";
import * as Y from "yjs";

describe("listStorage", () => {
  // We use a shared object to store the data for the mock.
  // This object is reset in beforeEach.
  const store: Record<string, string> = {};

  const localStorageMock = {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value.toString();
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      for (const key in store) {
        delete store[key];
      }
    }),
  };

  beforeEach(() => {
    // Clear the store
    for (const key in store) {
      delete store[key];
    }
    // Reset mocks
    vi.clearAllMocks();
    
    // We don't need to re-define the globalThis.localStorage every time 
    // if we just use the mock object.
    Object.defineProperty(globalThis, "localStorage", {
      value: localStorageMock,
      writable: true,
    });
  });

  describe("loadInitial", () => {
    it("should return a default list when localStorage is empty", () => {
      const initialState = loadInitial();
      expect(initialState.lists).toHaveLength(1);
      expect(initialState.activeId).toBeDefined();
      expect(initialState.lists[0].doc).toBeInstanceOf(Y.Doc);
      expect(initialState.lists[0].id).toContain("list-");
    });

    it("should load lists from STORAGE_INDEX (v2)", () => {
      const listId1 = "list-1";
      const listId2 = "list-2";
      const activeId = listId2;
      const sessions = { [listId1]: "session-1" };

      const doc1 = createListDoc({ title: "List 1", sections: [], days: 7 });
      const encoded1 = encodeDoc(doc1);
      localStorage.setItem("alpakka-list:list-1", encoded1);

      const doc2 = createListDoc({ title: "List 2", sections: [], days: 7 });
      const encoded2 = encodeDoc(doc2);
      localStorage.setItem("alpakka-list:list-2", encoded2);

      const index = {
        ids: [listId1, listId2],
        activeId: activeId,
        sessions: sessions,
      };
      localStorage.setItem("alpakka-list-index", JSON.stringify(index));

      const initialState = loadInitial();

      expect(initialState.lists).toHaveLength(2);
      expect(initialState.activeId).toBe(listId2);
      expect(initialState.sessions).toEqual(sessions);
    });

    it("should load lists from alpakka-lists (v1 migration)", () => {
      const v1Data = [
        { id: "v1-1", title: "V1 List 1", days: 5, sections: [] },
        { id: "v1-2", title: "V1 List 2", days: 3, sections: [] },
      ];
      localStorage.setItem("alpakka-lists", JSON.stringify(v1Data));
      localStorage.setItem("alpakka-active", "v1-2");

      const initialState = loadInitial();

      expect(initialState.lists).toHaveLength(2);
      expect(initialState.activeId).toBe("v1-2");
      expect(initialState.lists[0].id).toBe("v1-1");
      expect(initialState.lists[1].id).toBe("v1-2");
      expect(localStorage.getItem("alpakka-lists")).toBeNull();
      expect(localStorage.getItem("alpakka-active")).toBeNull();
    });

    it("should load lists from alpakka-sections (v0 migration)", () => {
      const sections = [{ title: "Section 1", items: [] }];
      localStorage.setItem("alpakka-sections", JSON.stringify(sections));
      localStorage.setItem("alpakka-days", "10");
      localStorage.setItem("alpakka-title", "V0 Title");

      const initialState = loadInitial();

      expect(initialState.lists).toHaveLength(1);
      expect(initialState.activeId).toContain("list-"); 
      expect(localStorage.getItem("alpakka-sections")).toBeNull();
      expect(localStorage.getItem("alpakka-days")).toBeNull();
      expect(localStorage.getItem("alpakka-title")).toBeNull();
    });

    it("should fall through to default when data is corrupted", () => {
      localStorage.setItem("alpakka-list-index", "invalid-json");
      
      const initialState = loadInitial();
      
      expect(initialState.lists).toHaveLength(1);
      expect(initialState.lists[0].id).toContain("list-");
    });
  });

  describe("persistDoc", () => {
    it("should save the encoded doc to localStorage", () => {
      const id = "test-id";
      const doc = new Y.Doc();
      const text = doc.getText("items");
      text.insert(0, "hello");

      persistDoc(id, doc);

      const storedData = localStorage.getItem(`alpakka-list:${id}`);
      expect(storedData).toBeDefined();
      expect(typeof storedData).toBe("string");
    });
  });

  describe("persistIndex", () => {
    it("should save the index to localStorage", () => {
      const index = {
        ids: ["id1", "id2"],
        activeId: "id2",
        sessions: { "id1": "room-1" },
      };

      persistIndex(index);

      const storedIndex = localStorage.getItem("alpakka-list-index");
      expect(storedIndex).not.toBeNull();
      expect(JSON.parse(storedIndex!)).toEqual(index);
    });
  });

  describe("removeListFromStorage", () => {
    it("should remove the specific list doc from localStorage", () => {
      const id = "remove-me";
      localStorage.setItem(`alpakka-list:${id}`, "some-data");

      removeListFromStorage(id);

      expect(localStorage.getItem(`alpakka-list:${id}`)).toBeNull();
    });
  });
});