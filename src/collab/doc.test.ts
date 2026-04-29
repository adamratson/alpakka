import { describe, expect, it } from "vitest";
import * as Y from "yjs";
import { createListDoc, decodeIntoDoc, encodeDoc, listFromDoc, ops } from "./doc";

function makeDoc() {
  return createListDoc({
    title: "Trip",
    days: 3,
    sections: [
      {
        id: "s1",
        title: "Bike",
        items: [
          { id: "i1", title: "Tape", quantity: 1, perDay: false, description: "", checked: false },
          { id: "i2", title: "Tubes", quantity: 2, perDay: false, description: "spare", checked: false },
        ],
      },
      {
        id: "s2",
        title: "Food",
        items: [
          { id: "i3", title: "Bars", quantity: 3, perDay: true, description: "", checked: false },
        ],
      },
    ],
  });
}

describe("listFromDoc", () => {
  it("round-trips initial state", () => {
    const doc = makeDoc();
    const list = listFromDoc("L1", doc);
    expect(list.id).toBe("L1");
    expect(list.title).toBe("Trip");
    expect(list.days).toBe(3);
    expect(list.sections).toHaveLength(2);
    expect(list.sections[0].items[0]).toEqual({
      id: "i1",
      title: "Tape",
      quantity: 1,
      perDay: false,
      description: "",
      checked: false,
    });
    expect(list.sections[1].items[0].perDay).toBe(true);
  });
});

describe("ops mutations", () => {
  it("setTitle / setDays update meta", () => {
    const doc = makeDoc();
    ops.setTitle(doc, "Renamed");
    ops.setDays(doc, 10);
    const l = listFromDoc("L1", doc);
    expect(l.title).toBe("Renamed");
    expect(l.days).toBe(10);
  });

  it("toggleItem flips checked", () => {
    const doc = makeDoc();
    ops.toggleItem(doc, "s1", "i1");
    expect(listFromDoc("L1", doc).sections[0].items[0].checked).toBe(true);
    ops.toggleItem(doc, "s1", "i1");
    expect(listFromDoc("L1", doc).sections[0].items[0].checked).toBe(false);
  });

  it("toggleAll sets all items in a section", () => {
    const doc = makeDoc();
    ops.toggleAll(doc, "s1", true);
    const list = listFromDoc("L1", doc);
    expect(list.sections[0].items.every((i) => i.checked)).toBe(true);
    expect(list.sections[1].items.every((i) => i.checked)).toBe(false);
  });

  it("updateQuantity / updatePerDay set fields", () => {
    const doc = makeDoc();
    ops.updateQuantity(doc, "s1", "i2", 5);
    ops.updatePerDay(doc, "s1", "i2", true);
    const item = listFromDoc("L1", doc).sections[0].items[1];
    expect(item.quantity).toBe(5);
    expect(item.perDay).toBe(true);
  });

  it("updateItemDetails sets title and description independently", () => {
    const doc = makeDoc();
    ops.updateItemDetails(doc, "s1", "i1", { title: "Gaffer tape" });
    expect(listFromDoc("L1", doc).sections[0].items[0].title).toBe("Gaffer tape");
    expect(listFromDoc("L1", doc).sections[0].items[0].description).toBe("");
    ops.updateItemDetails(doc, "s1", "i1", { description: "for fixes" });
    expect(listFromDoc("L1", doc).sections[0].items[0].title).toBe("Gaffer tape");
    expect(listFromDoc("L1", doc).sections[0].items[0].description).toBe("for fixes");
  });

  it("renameSection updates section title", () => {
    const doc = makeDoc();
    ops.renameSection(doc, "s2", "Snacks");
    expect(listFromDoc("L1", doc).sections[1].title).toBe("Snacks");
  });

  it("addItem appends and returns id", () => {
    const doc = makeDoc();
    const id = ops.addItem(doc, "s1", "Pump", "mini");
    expect(id).toBeTruthy();
    const items = listFromDoc("L1", doc).sections[0].items;
    expect(items).toHaveLength(3);
    expect(items[2]).toMatchObject({
      id,
      title: "Pump",
      quantity: 1,
      perDay: false,
      description: "mini",
      checked: false,
    });
  });

  it("removeItem deletes by id", () => {
    const doc = makeDoc();
    ops.removeItem(doc, "s1", "i1");
    const items = listFromDoc("L1", doc).sections[0].items;
    expect(items).toHaveLength(1);
    expect(items[0].id).toBe("i2");
  });

  it("addSection / removeSection mutate top-level array", () => {
    const doc = makeDoc();
    const id = ops.addSection(doc, "Tools");
    expect(listFromDoc("L1", doc).sections.map((s) => s.title)).toEqual([
      "Bike",
      "Food",
      "Tools",
    ]);
    ops.removeSection(doc, id);
    expect(listFromDoc("L1", doc).sections.map((s) => s.title)).toEqual(["Bike", "Food"]);
  });

  it("ops on missing ids are no-ops", () => {
    const doc = makeDoc();
    ops.toggleItem(doc, "missing-section", "i1");
    ops.toggleItem(doc, "s1", "missing-item");
    ops.removeItem(doc, "s1", "missing-item");
    ops.removeSection(doc, "missing-section");
    expect(listFromDoc("L1", doc)).toEqual(listFromDoc("L1", makeDoc()));
  });
});

describe("encodeDoc / decodeIntoDoc", () => {
  it("round-trips state via base64", () => {
    const a = makeDoc();
    ops.setTitle(a, "Encoded");
    ops.toggleItem(a, "s1", "i1");
    const encoded = encodeDoc(a);
    const b = new Y.Doc();
    decodeIntoDoc(b, encoded);
    expect(listFromDoc("L1", b)).toEqual(listFromDoc("L1", a));
  });
});

describe("concurrent edits via Yjs sync", () => {
  function pair(): [Y.Doc, Y.Doc, () => void] {
    const a = makeDoc();
    const b = new Y.Doc();
    Y.applyUpdate(b, Y.encodeStateAsUpdate(a));
    let connected = true;
    const aHandler = (update: Uint8Array, _origin: unknown, _doc: Y.Doc, tx: Y.Transaction) => {
      if (connected && tx.origin !== "remote") Y.applyUpdate(b, update, "remote");
    };
    const bHandler = (update: Uint8Array, _origin: unknown, _doc: Y.Doc, tx: Y.Transaction) => {
      if (connected && tx.origin !== "remote") Y.applyUpdate(a, update, "remote");
    };
    a.on("update", aHandler);
    b.on("update", bHandler);
    const disconnect = () => {
      connected = false;
    };
    return [a, b, disconnect];
  }

  it("propagates a single edit", () => {
    const [a, b] = pair();
    ops.toggleItem(a, "s1", "i1");
    expect(listFromDoc("L", b).sections[0].items[0].checked).toBe(true);
  });

  it("merges concurrent edits to different items", () => {
    const [a, b, disconnect] = pair();
    disconnect();
    ops.toggleItem(a, "s1", "i1");
    ops.updateQuantity(b, "s1", "i2", 9);
    Y.applyUpdate(b, Y.encodeStateAsUpdate(a), "remote");
    Y.applyUpdate(a, Y.encodeStateAsUpdate(b), "remote");
    const la = listFromDoc("L", a);
    const lb = listFromDoc("L", b);
    expect(la).toEqual(lb);
    expect(la.sections[0].items[0].checked).toBe(true);
    expect(la.sections[0].items[1].quantity).toBe(9);
  });

  it("merges concurrent edits to the same field deterministically", () => {
    const [a, b, disconnect] = pair();
    disconnect();
    ops.updateItemDetails(a, "s1", "i1", { title: "From A" });
    ops.updateItemDetails(b, "s1", "i1", { title: "From B" });
    Y.applyUpdate(b, Y.encodeStateAsUpdate(a), "remote");
    Y.applyUpdate(a, Y.encodeStateAsUpdate(b), "remote");
    const la = listFromDoc("L", a);
    const lb = listFromDoc("L", b);
    expect(la).toEqual(lb);
    expect(["From A", "From B"]).toContain(la.sections[0].items[0].title);
  });

  it("survives add+remove race in the same section", () => {
    const [a, b, disconnect] = pair();
    disconnect();
    ops.addItem(a, "s1", "From A", "");
    ops.removeItem(b, "s1", "i1");
    Y.applyUpdate(b, Y.encodeStateAsUpdate(a), "remote");
    Y.applyUpdate(a, Y.encodeStateAsUpdate(b), "remote");
    const la = listFromDoc("L", a);
    const lb = listFromDoc("L", b);
    expect(la).toEqual(lb);
    const titles = la.sections[0].items.map((i) => i.title);
    expect(titles).toContain("From A");
    expect(titles).not.toContain("Tape");
    expect(titles).toContain("Tubes");
  });

  it("converges after edits during disconnect", () => {
    const [a, b, disconnect] = pair();
    disconnect();
    ops.toggleAll(a, "s1", true);
    ops.addSection(a, "Camp");
    ops.renameSection(b, "s2", "Snacks");
    ops.setDays(b, 14);
    Y.applyUpdate(b, Y.encodeStateAsUpdate(a), "remote");
    Y.applyUpdate(a, Y.encodeStateAsUpdate(b), "remote");
    expect(listFromDoc("L", a)).toEqual(listFromDoc("L", b));
    const la = listFromDoc("L", a);
    expect(la.sections.map((s) => s.title)).toEqual(["Bike", "Snacks", "Camp"]);
    expect(la.days).toBe(14);
    expect(la.sections[0].items.every((i) => i.checked)).toBe(true);
  });
});
