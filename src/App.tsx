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
import { startSync, type SyncHandle } from "./collab/sync";
import { joinSessionRoom, type RoomHandle } from "./collab/room";
import "./App.css";

const STORAGE_INDEX = "alpakka-list-index";
const STORAGE_LIST_PREFIX = "alpakka-list:";

interface ListEntry {
  id: string;
  doc: Y.Doc;
}

interface PersistedIndex {
  ids: string[];
  activeId: string;
  /** Maps local listId → Trystero room/session id when the list is shared. */
  sessions?: Record<string, string>;
}

interface InitialState {
  lists: ListEntry[];
  activeId: string;
  sessions: Record<string, string>;
}

function loadInitial(): InitialState {
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

interface OpenRoom {
  sessionId: string;
  roomHandle: RoomHandle;
  syncHandle: SyncHandle;
}

type ListSessionStatus = "waiting" | "connected";

function newSessionId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export default function App() {
  const initial = useMemo(loadInitial, []);
  const [lists, setLists] = useState<ListEntry[]>(initial.lists);
  const [activeId, setActiveId] = useState<string>(initial.activeId);
  /** listId -> sessionId (only for shared lists). */
  const [sessions, setSessions] = useState<Record<string, string>>(initial.sessions);
  /** listId -> live status, derived from peer-join/leave events. */
  const [roomStatus, setRoomStatus] = useState<Record<string, ListSessionStatus>>({});
  const [addingSection, setAddingSection] = useState(false);
  const [sharingFor, setSharingFor] = useState<{ id: string; title: string } | null>(null);
  const [joinSessionId, setJoinSessionId] = useState<string | null>(() => {
    const m = window.location.hash.match(/^#join=(.+)$/);
    return m ? decodeURIComponent(m[1]) : null;
  });

  /** Live room/sync handles, kept out of React state because they're not serializable. */
  const openRoomsRef = useRef<Record<string, OpenRoom>>({});
  const persistedIdsRef = useRef<Set<string>>(new Set());

  const docs = useMemo(() => lists.map((l) => l.doc), [lists]);
  useYDocs(docs);

  // Persist any doc that updates, plus the index when lists/activeId/sessions change.
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
    const index: PersistedIndex = {
      ids: lists.map((l) => l.id),
      activeId,
      sessions,
    };
    localStorage.setItem(STORAGE_INDEX, JSON.stringify(index));
    const liveIds = new Set(lists.map((l) => l.id));
    for (const id of persistedIdsRef.current) {
      if (!liveIds.has(id)) {
        localStorage.removeItem(STORAGE_LIST_PREFIX + id);
        persistedIdsRef.current.delete(id);
      }
    }
  }, [lists, activeId, sessions]);

  // Strip the join fragment once we've captured it.
  useEffect(() => {
    if (joinSessionId) {
      history.replaceState(null, "", window.location.pathname + window.location.search);
    }
  }, [joinSessionId]);

  // Catch hash navigation in already-open tabs.
  useEffect(() => {
    const handler = () => {
      const m = window.location.hash.match(/^#join=(.+)$/);
      if (m) setJoinSessionId(decodeURIComponent(m[1]));
    };
    window.addEventListener("hashchange", handler);
    return () => window.removeEventListener("hashchange", handler);
  }, []);

  // Reconcile open rooms against `sessions`. Any sessionId in `sessions`
  // without an open room gets one. Any open room not in `sessions` is closed.
  // This effect runs on mount with persisted sessions, and again whenever the
  // user starts/stops sharing a list.
  useEffect(() => {
    const liveSessions = new Set(Object.values(sessions));

    // Open rooms for newly-shared lists.
    for (const [listId, sessionId] of Object.entries(sessions)) {
      if (openRoomsRef.current[listId]) continue;
      const list = lists.find((l) => l.id === listId);
      if (!list) continue;

      const roomHandle = joinSessionRoom(sessionId);
      const syncHandle = startSync(list.doc, roomHandle.transport);
      openRoomsRef.current[listId] = { sessionId, roomHandle, syncHandle };

      roomHandle.onPeerJoin(() => {
        // A new peer is in the room — provoke a fresh sync handshake so they
        // pull our state.
        syncHandle.resync();
        setRoomStatus((cur) => ({ ...cur, [listId]: "connected" }));
      });
      roomHandle.onPeerLeave(() => {
        if (roomHandle.peerCount() === 0) {
          setRoomStatus((cur) => ({ ...cur, [listId]: "waiting" }));
        }
      });

      // Initial status: alone until someone joins.
      setRoomStatus((cur) => ({ ...cur, [listId]: "waiting" }));
    }

    // Tear down rooms for lists that were unshared, or whose sessionId rotated.
    for (const listId of Object.keys(openRoomsRef.current)) {
      const open = openRoomsRef.current[listId];
      const stillSharedAtSameId = sessions[listId] === open.sessionId;
      if (!stillSharedAtSameId || !liveSessions.has(open.sessionId)) {
        open.syncHandle.stop();
        open.roomHandle.leave().catch(() => {});
        delete openRoomsRef.current[listId];
        setRoomStatus((cur) => {
          const next = { ...cur };
          delete next[listId];
          return next;
        });
      }
    }
  }, [sessions, lists]);

  // Note: no unmount cleanup here. In dev, React StrictMode mounts the
  // component twice and the cleanup would tear down rooms we just opened,
  // leaving the relay confused. In production, true unmount only happens on
  // tab close — the browser closes the underlying WebSockets and the relay
  // times the peer out within a few seconds. Good enough for both.

  const activeEntry = lists.find((l) => l.id === activeId) ?? lists[0];
  if (!activeEntry) return null;

  const activeDoc = activeEntry.doc;
  const activeList = listFromDoc(activeEntry.id, activeDoc);
  const { sections, days } = activeList;
  const allItems = sections.flatMap((s) => s.items);
  const checkedCount = allItems.filter((i) => i.checked).length;

  const activeSessionId = sessions[activeEntry.id];
  const activeStatus = activeSessionId ? roomStatus[activeEntry.id] ?? "waiting" : null;

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

  function moveSection(sectionId: string, toIndex: number) {
    ops.moveSection(activeDoc, sectionId, toIndex);
  }

  function handleImport(file: File) {
    importFromJson(file)
      .then(({ lists: importedLists, activeListId }) => {
        const newEntries = importedLists.map((l) => ({
          id: l.id,
          doc: createListDoc({ title: l.title, days: l.days, sections: l.sections }),
        }));
        setLists(newEntries);
        setActiveId(
          newEntries.find((e) => e.id === activeListId)?.id ?? newEntries[0]?.id ?? ""
        );
      })
      .catch((err: Error) => alert(`Import failed: ${err.message}`));
  }

  function createList() {
    const id = `list-${Date.now()}`;
    const doc = createListDoc({ title: "New kit list", sections: [], days: 7 });
    setLists((prev) => [...prev, { id, doc }]);
    setActiveId(id);
  }

  function deleteList(id: string) {
    setLists((prev) => {
      if (prev.length <= 1) return prev;
      const filtered = prev.filter((l) => l.id !== id);
      if (id === activeId) {
        setActiveId(filtered[0].id);
      }
      return filtered;
    });
    // If the list was shared, also drop its session so the room gets torn down.
    setSessions((prev) => {
      if (!(id in prev)) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }

  function renameList(id: string, title: string) {
    const entry = lists.find((l) => l.id === id);
    if (!entry) return;
    ops.setTitle(entry.doc, title);
  }

  function switchList(id: string) {
    setActiveId(id);
  }

  function startSharingActive() {
    const existing = sessions[activeEntry.id];
    if (existing) {
      // Already sharing — just show the link again.
      setSharingFor({ id: activeEntry.id, title: activeList.title });
      return;
    }
    const sessionId = newSessionId();
    setSessions((prev) => ({ ...prev, [activeEntry.id]: sessionId }));
    setSharingFor({ id: activeEntry.id, title: activeList.title });
  }

  function stopSharing(listId: string) {
    setSessions((prev) => {
      if (!(listId in prev)) return prev;
      const next = { ...prev };
      delete next[listId];
      return next;
    });
  }

  function handleJoin(sessionId: string) {
    // If we already have a list joined to this session, just switch to it.
    const existingListId = Object.entries(sessions).find(
      ([, sid]) => sid === sessionId
    )?.[0];
    if (existingListId) {
      setActiveId(existingListId);
      setJoinSessionId(null);
      return;
    }
    // Otherwise create a new local list and tie it to the session.
    const newId = `list-${Date.now()}`;
    const newDoc = new Y.Doc();
    setLists((prev) => [...prev, { id: newId, doc: newDoc }]);
    setActiveId(newId);
    setSessions((prev) => ({ ...prev, [newId]: sessionId }));
    setJoinSessionId(null);
  }

  const sidebarLists = lists.map(({ id, doc }) => ({ id, title: getListTitle(doc) }));
  const sharedListIds = useMemo(() => new Set(Object.keys(sessions)), [sessions]);
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
        onShare={startSharingActive}
        onStopSharing={
          activeSessionId ? () => stopSharing(activeEntry.id) : undefined
        }
        sessionStatus={activeStatus}
      />

      <div className="app-body">
        <Sidebar
          lists={sidebarLists}
          activeListId={activeId}
          sharedListIds={sharedListIds}
          onSwitch={switchList}
          onCreate={createList}
          onRename={renameList}
          onDelete={deleteList}
        />

        <main className="app-main">
          {sections.map((section, idx) => (
            <KitSectionComponent
              key={section.id}
              section={section}
              days={days}
              index={idx}
              total={sections.length}
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
              onMoveTo={(toIndex) => moveSection(section.id, toIndex)}
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
          sessionId={sessions[sharingFor.id] ?? ""}
          onClose={() => setSharingFor(null)}
        />
      )}

      {joinSessionId && (
        <JoinModal
          sessionId={joinSessionId}
          onJoin={handleJoin}
          onCancel={() => setJoinSessionId(null)}
        />
      )}
    </div>
  );
}
