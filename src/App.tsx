import { useEffect, useMemo, useRef, useState } from "react";
import * as Y from "yjs";
import { initialSections } from "./data";
import type { KitSection, PackingList } from "./data";
import AppHeader from "./components/AppHeader";
import Sidebar from "./components/Sidebar";
import KitSectionComponent from "./components/KitSection";
import { AddSectionForm, AddSectionButton } from "./components/AddSectionForm";
import ShareModal from "./components/ShareModal";
import JoinModal from "./components/JoinModal";
import { exportToJson, importFromJson } from "./utils/export";
import {
  createListDoc,
  decodeIntoDoc,
  encodeDoc,
  getListTitle,
  listFromDoc,
  ops,
} from "./collab/doc";
import { useYDocs } from "./collab/useYDocs";
import { startSync } from "./collab/sync";
import type { HostSession, JoinerSession } from "./collab/peer";
import "./App.css";

const STORAGE_INDEX = "alpakka-list-index";
const STORAGE_LIST_PREFIX = "alpakka-list:";

interface ListEntry {
  id: string;
  doc: Y.Doc;
}

function loadInitial(): { lists: ListEntry[]; activeId: string } {
  try {
    const indexRaw = localStorage.getItem(STORAGE_INDEX);
    if (indexRaw) {
      const index = JSON.parse(indexRaw) as { ids: string[]; activeId: string };
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
        return { lists, activeId };
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
      return { lists, activeId };
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
      return { lists: [{ id, doc }], activeId: id };
    }
  } catch {
    // fall through to seed
  }

  const id = `list-${Date.now()}`;
  const doc = createListDoc({ title: "Kit list", sections: initialSections, days: 7 });
  return { lists: [{ id, doc }], activeId: id };
}

interface ActiveSession {
  listId: string;
  role: "host" | "joiner";
  pc: RTCPeerConnection;
  stopSync: () => void;
}

type SessionStatus = "connecting" | "connected" | "disconnected" | null;

export default function App() {
  const [{ lists, activeId }, setState] = useState(loadInitial);
  const [addingSection, setAddingSection] = useState(false);
  const [sharingFor, setSharingFor] = useState<{ id: string; doc: Y.Doc; title: string } | null>(null);
  const [joinOffer, setJoinOffer] = useState<string | null>(() => {
    const m = window.location.hash.match(/^#join=(.+)$/);
    return m ? decodeURIComponent(m[1]) : null;
  });
  const [session, setSession] = useState<ActiveSession | null>(null);
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>(null);

  // Strip the join fragment from the URL once we've captured it, so a reload
  // doesn't re-prompt and so the URL bar isn't cluttered.
  useEffect(() => {
    if (joinOffer) {
      history.replaceState(null, "", window.location.pathname + window.location.search);
    }
  }, [joinOffer]);

  // Detect #join=... that arrives via hash navigation in an already-open tab.
  useEffect(() => {
    const handler = () => {
      const m = window.location.hash.match(/^#join=(.+)$/);
      if (m) setJoinOffer(decodeURIComponent(m[1]));
    };
    window.addEventListener("hashchange", handler);
    return () => window.removeEventListener("hashchange", handler);
  }, []);

  const docs = useMemo(() => lists.map((l) => l.doc), [lists]);
  useYDocs(docs);

  const persistedIdsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    const handlers: { doc: Y.Doc; handler: () => void }[] = [];
    for (const { id, doc } of lists) {
      const handler = () => {
        localStorage.setItem(STORAGE_LIST_PREFIX + id, encodeDoc(doc));
      };
      doc.on("update", handler);
      handlers.push({ doc, handler });
      if (!persistedIdsRef.current.has(id)) {
        localStorage.setItem(STORAGE_LIST_PREFIX + id, encodeDoc(doc));
        persistedIdsRef.current.add(id);
      }
    }
    return () => handlers.forEach(({ doc, handler }) => doc.off("update", handler));
  }, [lists]);

  useEffect(() => {
    localStorage.setItem(
      STORAGE_INDEX,
      JSON.stringify({ ids: lists.map((l) => l.id), activeId })
    );
    const liveIds = new Set(lists.map((l) => l.id));
    for (const id of persistedIdsRef.current) {
      if (!liveIds.has(id)) {
        localStorage.removeItem(STORAGE_LIST_PREFIX + id);
        persistedIdsRef.current.delete(id);
      }
    }
  }, [lists, activeId]);

  const activeEntry = lists.find((l) => l.id === activeId) ?? lists[0];
  if (!activeEntry) return null;

  const activeDoc = activeEntry.doc;
  const activeList = listFromDoc(activeEntry.id, activeDoc);
  const { sections, days } = activeList;
  const allItems = sections.flatMap((s) => s.items);
  const checkedCount = allItems.filter((i) => i.checked).length;

  function handleDaysChange(newDays: number) {
    ops.setDays(activeDoc, newDays);
  }

  function toggleItem(sectionId: string, itemId: string) {
    ops.toggleItem(activeDoc, sectionId, itemId);
  }

  function toggleAll(sectionId: string, checked: boolean) {
    ops.toggleAll(activeDoc, sectionId, checked);
  }

  function updateQuantity(sectionId: string, itemId: string, quantity: number) {
    ops.updateQuantity(activeDoc, sectionId, itemId, quantity);
  }

  function updatePerDay(sectionId: string, itemId: string, perDay: boolean) {
    ops.updatePerDay(activeDoc, sectionId, itemId, perDay);
  }

  function updateItemDetails(
    sectionId: string,
    itemId: string,
    updates: { title?: string; description?: string }
  ) {
    ops.updateItemDetails(activeDoc, sectionId, itemId, updates);
  }

  function renameSection(sectionId: string, title: string) {
    ops.renameSection(activeDoc, sectionId, title);
  }

  function addItem(sectionId: string, title: string, description: string) {
    ops.addItem(activeDoc, sectionId, title, description);
  }

  function removeItem(sectionId: string, itemId: string) {
    ops.removeItem(activeDoc, sectionId, itemId);
  }

  function addSection(title: string) {
    ops.addSection(activeDoc, title);
    setAddingSection(false);
  }

  function removeSection(sectionId: string) {
    ops.removeSection(activeDoc, sectionId);
  }

  function handleImport(file: File) {
    importFromJson(file)
      .then(({ lists: importedLists, activeListId }) => {
        const newEntries = importedLists.map((l) => ({
          id: l.id,
          doc: createListDoc({ title: l.title, days: l.days, sections: l.sections }),
        }));
        setState({
          lists: newEntries,
          activeId:
            newEntries.find((e) => e.id === activeListId)?.id ?? newEntries[0]?.id ?? "",
        });
      })
      .catch((err: Error) => alert(`Import failed: ${err.message}`));
  }

  function createList() {
    const id = `list-${Date.now()}`;
    const doc = createListDoc({ title: "New kit list", sections: [], days: 7 });
    setState((prev) => ({ lists: [...prev.lists, { id, doc }], activeId: id }));
  }

  function deleteList(id: string) {
    setState((prev) => {
      if (prev.lists.length <= 1) return prev;
      const filtered = prev.lists.filter((l) => l.id !== id);
      const nextActive = id === prev.activeId ? filtered[0].id : prev.activeId;
      return { lists: filtered, activeId: nextActive };
    });
  }

  function renameList(id: string, title: string) {
    const entry = lists.find((l) => l.id === id);
    if (!entry) return;
    ops.setTitle(entry.doc, title);
  }

  function switchList(id: string) {
    setState((prev) => ({ ...prev, activeId: id }));
  }

  function endSession() {
    if (session) {
      session.stopSync();
      session.pc.close();
    }
    setSession(null);
    setSessionStatus(null);
  }

  function handleStale() {
    // Same end state as the pc.connectionstatechange path, just driven by
    // application-level liveness instead of waiting on ICE consent.
    setSessionStatus((cur) => (cur === "connected" ? "disconnected" : cur));
  }

  function watchDisconnect(pc: RTCPeerConnection, next: ActiveSession) {
    // ICE flickers briefly all the time (Wi-Fi roaming, momentary packet loss).
    // Surfacing "disconnected" instantly produces a flashy UI for blips that
    // recover on their own. Wait a beat before showing it; recovery cancels.
    // "failed"/"closed" are terminal — those fire immediately.
    const GRACE_MS = 5000;
    let stopped = false;
    let graceTimer: ReturnType<typeof setTimeout> | null = null;

    const fire = () => {
      if (stopped) return;
      stopped = true;
      next.stopSync();
      setSessionStatus((cur) => (cur === "connected" ? "disconnected" : cur));
    };

    const cancelGrace = () => {
      if (graceTimer) {
        clearTimeout(graceTimer);
        graceTimer = null;
      }
    };

    const onChange = () => {
      const s = pc.connectionState;
      if (s === "connected") {
        // Recovered from a transient flicker before the grace period expired.
        cancelGrace();
      } else if (s === "disconnected") {
        if (!stopped && !graceTimer) {
          graceTimer = setTimeout(() => {
            graceTimer = null;
            fire();
          }, GRACE_MS);
        }
      } else if (s === "failed" || s === "closed") {
        cancelGrace();
        fire();
      }
    };
    pc.addEventListener("connectionstatechange", onChange);
  }

  async function handleHostConnected(host: HostSession) {
    if (!sharingFor) return;
    endSession();
    const { id, doc } = sharingFor;
    const transport = await host.ready;
    const stopSync = startSync(doc, transport, { onStale: handleStale });
    const next: ActiveSession = { listId: id, role: "host", pc: host.pc, stopSync };
    setSession(next);
    setSessionStatus("connected");
    watchDisconnect(host.pc, next);
  }

  async function handleJoinerConnected(joiner: JoinerSession) {
    endSession();
    const newId = `list-${Date.now()}`;
    const newDoc = new Y.Doc();
    setState((prev) => ({
      lists: [...prev.lists, { id: newId, doc: newDoc }],
      activeId: newId,
    }));
    const transport = await joiner.ready;
    const stopSync = startSync(newDoc, transport, { onStale: handleStale });
    const next: ActiveSession = { listId: newId, role: "joiner", pc: joiner.pc, stopSync };
    setSession(next);
    setSessionStatus("connected");
    watchDisconnect(joiner.pc, next);
  }

  function handleLeaveSession() {
    endSession();
  }

  function handleReshare() {
    if (!session || session.role !== "host") return;
    const entry = lists.find((l) => l.id === session.listId);
    if (!entry) return;
    endSession();
    setSharingFor({ id: entry.id, doc: entry.doc, title: getListTitle(entry.doc) });
  }

  const sidebarLists = lists.map(({ id, doc }) => ({ id, title: getListTitle(doc) }));
  const exportLists = (): PackingList[] =>
    lists.map(({ id, doc }) => listFromDoc(id, doc));

  return (
    <div className="app">
      <AppHeader
        days={days}
        onDaysChange={handleDaysChange}
        checkedItems={checkedCount}
        totalItems={allItems.length}
        onExport={() => exportToJson(exportLists(), activeId)}
        onImport={handleImport}
        onShare={() =>
          setSharingFor({
            id: activeEntry.id,
            doc: activeDoc,
            title: activeList.title,
          })
        }
        sessionStatus={sessionStatus}
        onLeaveSession={session ? handleLeaveSession : undefined}
        onReshare={session?.role === "host" ? handleReshare : undefined}
      />

      <div className="app-body">
        <Sidebar
          lists={sidebarLists}
          activeListId={activeId}
          sharedListId={session?.listId}
          onSwitch={switchList}
          onCreate={createList}
          onRename={renameList}
          onDelete={deleteList}
        />

        <main className="app-main">
          {sections.map((section) => (
            <KitSectionComponent
              key={section.id}
              section={section}
              days={days}
              onToggleItem={(itemId) => toggleItem(section.id, itemId)}
              onToggleAll={(checked) => toggleAll(section.id, checked)}
              onUpdateQuantity={(itemId, qty) => updateQuantity(section.id, itemId, qty)}
              onUpdatePerDay={(itemId, pd) => updatePerDay(section.id, itemId, pd)}
              onUpdateItemDetails={(itemId, updates) =>
                updateItemDetails(section.id, itemId, updates)
              }
              onAddItem={(title, desc) => addItem(section.id, title, desc)}
              onRemoveItem={(itemId) => removeItem(section.id, itemId)}
              onRemoveSection={() => removeSection(section.id)}
              onRenameSection={(title) => renameSection(section.id, title)}
            />
          ))}

          {addingSection ? (
            <AddSectionForm
              onAdd={addSection}
              onCancel={() => setAddingSection(false)}
            />
          ) : (
            <AddSectionButton onClick={() => setAddingSection(true)} />
          )}
        </main>
      </div>

      {sharingFor && (
        <ShareModal
          listTitle={sharingFor.title}
          onConnected={handleHostConnected}
          onCancel={() => setSharingFor(null)}
        />
      )}

      {joinOffer && (
        <JoinModal
          encodedOffer={joinOffer}
          onConnected={handleJoinerConnected}
          onCancel={() => setJoinOffer(null)}
        />
      )}
    </div>
  );
}
