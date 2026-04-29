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
    const handle = startSync(host, tA);
    startSync(joiner, tB);
    handle.stop();

    ops.toggleItem(host, "s1", "i1");
    expect(listFromDoc("L", joiner).sections[0].items[0].checked).toBe(false);
  });
});

describe("heartbeat liveness", () => {
  // Drive a fake clock and timer so we can fast-forward without real waits.
  function fakeTimers() {
    let nowMs = 0;
    const intervals: { ms: number; fn: () => void; lastFire: number }[] = [];
    return {
      now: () => nowMs,
      advance: (ms: number) => {
        const target = nowMs + ms;
        // Walk the clock forward, firing any due intervals along the way.
        while (true) {
          let nextFireAt = Infinity;
          let nextEntry: typeof intervals[number] | null = null;
          for (const e of intervals) {
            const due = e.lastFire + e.ms;
            if (due < nextFireAt) {
              nextFireAt = due;
              nextEntry = e;
            }
          }
          if (nextEntry === null || nextFireAt > target) break;
          nowMs = nextFireAt;
          nextEntry.lastFire = nextFireAt;
          nextEntry.fn();
        }
        nowMs = target;
      },
      setInterval: (fn: () => void, ms: number) => {
        const entry = { ms, fn, lastFire: nowMs };
        intervals.push(entry);
        return entry;
      },
      clearInterval: (h: unknown) => {
        const i = intervals.indexOf(h as typeof intervals[number]);
        if (i >= 0) intervals.splice(i, 1);
      },
    };
  }

  it("calls onStale when no inbound traffic for staleMs", () => {
    const doc = seedDoc();
    const transport: SyncTransport = {
      send: () => {}, // sends go nowhere — peer is silent
      onMessage: () => () => {},
    };
    const t = fakeTimers();
    let stale = false;

    startSync(doc, transport, {
      onStale: () => {
        stale = true;
      },
      heartbeatMs: 1000,
      staleMs: 5000,
      now: t.now,
      setInterval: t.setInterval,
      clearInterval: t.clearInterval,
    });

    t.advance(4000);
    expect(stale).toBe(false);
    t.advance(2000); // total 6000ms — past stale threshold
    expect(stale).toBe(true);
  });

  it("does not fire onStale while heartbeats keep arriving", () => {
    const doc = seedDoc();
    let receive: ((d: Uint8Array) => void) = () => {};
    const transport: SyncTransport = {
      send: () => {},
      onMessage: (h) => {
        receive = h;
        return () => {};
      },
    };
    const t = fakeTimers();
    let stale = false;

    startSync(doc, transport, {
      onStale: () => {
        stale = true;
      },
      heartbeatMs: 1000,
      staleMs: 5000,
      now: t.now,
      setInterval: t.setInterval,
      clearInterval: t.clearInterval,
    });

    // Simulate the peer's heartbeat every 1s for 20s.
    for (let i = 0; i < 20; i++) {
      t.advance(1000);
      receive(new Uint8Array([2])); // MSG_HEARTBEAT
    }
    expect(stale).toBe(false);
  });

  it("fires onStale at most once even after long idle", () => {
    const doc = seedDoc();
    const transport: SyncTransport = {
      send: () => {},
      onMessage: () => () => {},
    };
    const t = fakeTimers();
    let count = 0;

    startSync(doc, transport, {
      onStale: () => {
        count++;
      },
      heartbeatMs: 1000,
      staleMs: 5000,
      now: t.now,
      setInterval: t.setInterval,
      clearInterval: t.clearInterval,
    });

    t.advance(60000);
    expect(count).toBe(1);
  });
});
