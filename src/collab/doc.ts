import * as Y from "yjs";
import type { KitItem, KitSection, PackingList } from "../data";

type YItem = Y.Map<string | number | boolean>;
type YSection = Y.Map<string | Y.Array<YItem>>;

export function createListDoc(initial?: Omit<PackingList, "id">): Y.Doc {
  const doc = new Y.Doc();
  if (initial) {
    fillDoc(doc, initial);
  }
  return doc;
}

function fillDoc(doc: Y.Doc, list: Omit<PackingList, "id">) {
  doc.transact(() => {
    const meta = doc.getMap("meta");
    meta.set("title", list.title);
    meta.set("days", list.days);

    const sections = doc.getArray<YSection>("sections");
    for (const section of list.sections) {
      sections.push([sectionToY(section)]);
    }
  });
}

function sectionToY(section: KitSection): YSection {
  const map = new Y.Map() as YSection;
  map.set("id", section.id);
  map.set("title", section.title);
  const items = new Y.Array<YItem>();
  for (const item of section.items) {
    items.push([itemToY(item)]);
  }
  map.set("items", items);
  return map;
}

function itemToY(item: KitItem): YItem {
  const map = new Y.Map() as YItem;
  map.set("id", item.id);
  map.set("title", item.title);
  map.set("quantity", item.quantity);
  map.set("perDay", item.perDay);
  map.set("description", item.description);
  map.set("checked", item.checked);
  return map;
}

export function listFromDoc(id: string, doc: Y.Doc): PackingList {
  const meta = doc.getMap("meta");
  const sectionsArr = doc.getArray<YSection>("sections");
  const sections: KitSection[] = [];
  sectionsArr.forEach((sm) => {
    const itemsArr = sm.get("items") as Y.Array<YItem>;
    const items: KitItem[] = [];
    itemsArr.forEach((im) => {
      items.push({
        id: im.get("id") as string,
        title: im.get("title") as string,
        quantity: im.get("quantity") as number,
        perDay: im.get("perDay") as boolean,
        description: im.get("description") as string,
        checked: im.get("checked") as boolean,
      });
    });
    sections.push({
      id: sm.get("id") as string,
      title: sm.get("title") as string,
      items,
    });
  });
  return {
    id,
    title: (meta.get("title") as string) ?? "",
    days: (meta.get("days") as number) ?? 7,
    sections,
  };
}

export function getListTitle(doc: Y.Doc): string {
  return (doc.getMap("meta").get("title") as string) ?? "";
}

function findSection(doc: Y.Doc, sectionId: string): { section: YSection; index: number } | null {
  const sections = doc.getArray<YSection>("sections");
  for (let i = 0; i < sections.length; i++) {
    const s = sections.get(i);
    if (s.get("id") === sectionId) return { section: s, index: i };
  }
  return null;
}

function findItem(section: YSection, itemId: string): { item: YItem; index: number } | null {
  const items = section.get("items") as Y.Array<YItem>;
  for (let i = 0; i < items.length; i++) {
    const it = items.get(i);
    if (it.get("id") === itemId) return { item: it, index: i };
  }
  return null;
}

function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export const ops = {
  setTitle(doc: Y.Doc, title: string) {
    doc.getMap("meta").set("title", title);
  },
  setDays(doc: Y.Doc, days: number) {
    doc.getMap("meta").set("days", days);
  },
  toggleItem(doc: Y.Doc, sectionId: string, itemId: string) {
    const sec = findSection(doc, sectionId);
    if (!sec) return;
    const it = findItem(sec.section, itemId);
    if (!it) return;
    it.item.set("checked", !it.item.get("checked"));
  },
  toggleAll(doc: Y.Doc, sectionId: string, checked: boolean) {
    const sec = findSection(doc, sectionId);
    if (!sec) return;
    doc.transact(() => {
      const items = sec.section.get("items") as Y.Array<YItem>;
      items.forEach((item) => item.set("checked", checked));
    });
  },
  updateQuantity(doc: Y.Doc, sectionId: string, itemId: string, quantity: number) {
    const sec = findSection(doc, sectionId);
    if (!sec) return;
    const it = findItem(sec.section, itemId);
    if (!it) return;
    it.item.set("quantity", quantity);
  },
  updatePerDay(doc: Y.Doc, sectionId: string, itemId: string, perDay: boolean) {
    const sec = findSection(doc, sectionId);
    if (!sec) return;
    const it = findItem(sec.section, itemId);
    if (!it) return;
    it.item.set("perDay", perDay);
  },
  updateItemDetails(
    doc: Y.Doc,
    sectionId: string,
    itemId: string,
    updates: { title?: string; description?: string }
  ) {
    const sec = findSection(doc, sectionId);
    if (!sec) return;
    const it = findItem(sec.section, itemId);
    if (!it) return;
    doc.transact(() => {
      if (updates.title !== undefined) it.item.set("title", updates.title);
      if (updates.description !== undefined) it.item.set("description", updates.description);
    });
  },
  renameSection(doc: Y.Doc, sectionId: string, title: string) {
    const sec = findSection(doc, sectionId);
    if (!sec) return;
    sec.section.set("title", title);
  },
  addItem(doc: Y.Doc, sectionId: string, title: string, description: string): string | null {
    const sec = findSection(doc, sectionId);
    if (!sec) return null;
    const id = newId("item");
    const items = sec.section.get("items") as Y.Array<YItem>;
    items.push([
      itemToY({ id, title, quantity: 1, perDay: false, description, checked: false }),
    ]);
    return id;
  },
  removeItem(doc: Y.Doc, sectionId: string, itemId: string) {
    const sec = findSection(doc, sectionId);
    if (!sec) return;
    const it = findItem(sec.section, itemId);
    if (!it) return;
    const items = sec.section.get("items") as Y.Array<YItem>;
    items.delete(it.index, 1);
  },
  addSection(doc: Y.Doc, title: string): string {
    const id = newId("section");
    const sections = doc.getArray<YSection>("sections");
    sections.push([sectionToY({ id, title, items: [] })]);
    return id;
  },
  removeSection(doc: Y.Doc, sectionId: string) {
    const sec = findSection(doc, sectionId);
    if (!sec) return;
    const sections = doc.getArray<YSection>("sections");
    sections.delete(sec.index, 1);
  },
  moveSection(doc: Y.Doc, sectionId: string, toIndex: number) {
    const sections = doc.getArray<YSection>("sections");
    const sec = findSection(doc, sectionId);
    if (!sec) return;
    const clamped = Math.max(0, Math.min(sections.length - 1, toIndex));
    if (clamped === sec.index) return;

    const itemsArr = sec.section.get("items") as Y.Array<YItem>;
    const data: KitSection = {
      id: sec.section.get("id") as string,
      title: sec.section.get("title") as string,
      items: itemsArr.toArray().map((im) => ({
        id: im.get("id") as string,
        title: im.get("title") as string,
        quantity: im.get("quantity") as number,
        perDay: im.get("perDay") as boolean,
        description: im.get("description") as string,
        checked: im.get("checked") as boolean,
      })),
    };

    doc.transact(() => {
      sections.delete(sec.index, 1);
      sections.insert(clamped, [sectionToY(data)]);
    });
  },
};

export function encodeDoc(doc: Y.Doc): string {
  const update = Y.encodeStateAsUpdate(doc);
  let binary = "";
  for (const byte of update) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export function decodeIntoDoc(doc: Y.Doc, encoded: string) {
  const binary = atob(encoded);
  const update = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) update[i] = binary.charCodeAt(i);
  Y.applyUpdate(doc, update);
}
