import * as Y from "yjs";
import { initialSections } from "../data";
import type { KitSection, PackingList } from "../data";
import { createListDoc, decodeIntoDoc, encodeDoc } from "../collab/doc";

const STORAGE_INDEX = "alpakka-list-index";
const STORAGE_LIST_PREFIX = "alpakka-list:";

export interface ListEntry {
  id: string;
  doc: Y.Doc;
}

export interface PersistedIndex {
  ids: string[];
  activeId: string;
  /** Maps local listId → Trystero room/session id when the list is shared. */
  sessions?: Record<string, string>;
}

export interface InitialState {
  lists: ListEntry[];
  activeId: string;
  sessions: Record<string, string>;
}

export function loadInitial(): InitialState {
  try {
    const indexRaw = localStorage.getItem(STORAGE_INDEX);
    if (indexRaw) {
      const index = JSON.parse(indexRaw) as PersistedIndex;
      const lists: ListEntry[] = [];
      for (const id of index.ids) {
        const encoded = localStorage.getItem(STORAGE_LIST_PREFIX + id);
        if (!encoded) continue;
        const doc = new Y.Doc();
        decodeIntoDoc(doc, encoded);
        lists.push({ id, doc });
      }
      if (lists.length > 0) {
        const activeId = lists.find((l) => l.id === index.activeId)?.id ?? lists[0].id;
        return { lists, activeId, sessions: index.sessions ?? {} };
      }
    }

    const v1 = localStorage.getItem("alpakka-lists");
    if (v1) {
      const parsed = JSON.parse(v1) as PackingList[];
      const lists = parsed.map((l) => ({
        id: l.id,
        doc: createListDoc({ title: l.title, days: l.days, sections: l.sections }),
      }));
      const activeId = localStorage.getItem("alpakka-active") ?? lists[0]?.id ?? "";
      localStorage.removeItem("alpakka-lists");
      localStorage.removeItem("alpakka-active");
      return { lists, activeId, sessions: {} };
    }

    const v0Sections = localStorage.getItem("alpakka-sections");
    if (v0Sections) {
      const sections = JSON.parse(v0Sections) as KitSection[];
      const days = parseInt(localStorage.getItem("alpakka-days") ?? "7", 10);
      const title = localStorage.getItem("alpakka-title") ?? "Kit list";
      const id = `list-${Date.now()}`;
      const doc = createListDoc({ title, sections, days });
      localStorage.removeItem("alpakka-sections");
      localStorage.removeItem("alpakka-days");
      localStorage.removeItem("alpakka-title");
      return { lists: [{ id, doc }], activeId: id, sessions: {} };
    }
  } catch {
    // fall through to seed
  }

  const id = `list-${Date.now()}`;
  const doc = createListDoc({ title: "Kit list", sections: initialSections, days: 7 });
  return { lists: [{ id, doc }], activeId: id, sessions: {} };
}

export function persistDoc(id: string, doc: Y.Doc): void {
  localStorage.setItem(STORAGE_LIST_PREFIX + id, encodeDoc(doc));
}

export function persistIndex(index: PersistedIndex): void {
  localStorage.setItem(STORAGE_INDEX, JSON.stringify(index));
}

export function removeListFromStorage(id: string): void {
  localStorage.removeItem(STORAGE_LIST_PREFIX + id);
}
