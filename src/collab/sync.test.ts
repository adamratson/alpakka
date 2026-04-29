import { describe, expect, it } from "vitest";
import * as Y from "yjs";
import { createListDoc, listFromDoc, ops } from "./doc";
import { startSync, type SyncTransport } from "./sync";

function pairedTransports(): [SyncTransport, SyncTransport] {
  let aHandler: ((d: Uint8Array) => void) | null = null;
  let bHandler: ((d: Uint8Array) => void) | null = null;
  const aBuffer: Uint8Array[] = [];
  const bBuffer: Uint8Array[] = [];
  return [
    {
      send: (d) => {
        if (bHandler) bHandler(d);
        else bBuffer.push(d);
      },
      onMessage: (h) => {
        aHandler = h;
        aBuffer.splice(0).forEach((d) => h(d));
        return () => {
          aHandler = null;
        };
      },
    },
    {
      send: (d) => {
        if (aHandler) aHandler(d);
        else aBuffer.push(d);
      },
      onMessage: (h) => {
        bHandler = h;
        bBuffer.splice(0).forEach((d) => h(d));
        return () => {
          bHandler = null;
        };
      },
    },
  ];
}

function seedDoc() {
  return createListDoc({
    title: "Trip",
    days: 3,
    sections: [
      {
        id: "s1",
        title: "Bike",
        items: [
          { id: "i1", title: "Tape", quantity: 1, perDay: false, description: "", checked: false },
        ],
      },
    ],
  });
}

describe("startSync", () => {
  it("performs initial sync from host to empty joiner", () => {
    const host = seedDoc();
    const joiner = new Y.Doc();
    const [tA, tB] = pairedTransports();
    startSync(host, tA);
    startSync(joiner, tB);
    expect(listFromDoc("L", joiner)).toEqual(listFromDoc("L", host));
  });

  it("propagates incremental updates after handshake", () => {
    const host = seedDoc();
    const joiner = new Y.Doc();
    const [tA, tB] = pairedTransports();
    startSync(host, tA);
    startSync(joiner, tB);

    ops.toggleItem(host, "s1", "i1");
    ops.setDays(host, 7);
    expect(listFromDoc("L", joiner).sections[0].items[0].checked).toBe(true);
    expect(listFromDoc("L", joiner).days).toBe(7);

    ops.addItem(joiner, "s1", "Pump", "");
    expect(listFromDoc("L", host).sections[0].items.map((i) => i.title)).toContain("Pump");
  });

  it("merges divergent state when both sides have edits before handshake", () => {
    const host = seedDoc();
    const joiner = createListDoc({
      title: "Local",
      days: 1,
      sections: [
        {
          id: "s1",
          title: "Bike",
          items: [
            { id: "i9", title: "Local item", quantity: 1, perDay: false, description: "", checked: false },
          ],
        },
      ],
    });
    const [tA, tB] = pairedTransports();
    startSync(host, tA);
    startSync(joiner, tB);

    expect(listFromDoc("L", host)).toEqual(listFromDoc("L", joiner));
  });

  it("stops forwarding updates after teardown", () => {
    const host = seedDoc();
    const joiner = new Y.Doc();
    const [tA, tB] = pairedTransports();
    const stop = startSync(host, tA);
    startSync(joiner, tB);
    stop();

    ops.toggleItem(host, "s1", "i1");
    expect(listFromDoc("L", joiner).sections[0].items[0].checked).toBe(false);
  });
});
