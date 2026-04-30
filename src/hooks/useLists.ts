import { useEffect, useMemo, useRef, useState } from "react";
import * as Y from "yjs";
import {
  loadInitial,
  persistDoc,
  persistIndex,
  removeListFromStorage,
  type ListEntry,
} from "../utils/listStorage";
import { createListDoc, listFromDoc, ops } from "../collab/doc";
import { useYDocs } from "../collab/useYDocs";
import { startSync } from "../collab/sync";
import { joinSessionRoom } from "../collab/room";
import {
  newSessionId,
  type ListSessionStatus,
  type OpenRoom,
} from "../collab/session";
import { importFromJson } from "../utils/export";
import type { PackingList } from "../data";

export interface UseListsResult {
  lists: ListEntry[];
  activeId: string;
  activeEntry: ListEntry | undefined;
  sessions: Record<string, string>;
  roomStatus: Record<string, ListSessionStatus>;
  setActiveId: (id: string) => void;
  createList: () => void;
  deleteList: (id: string) => void;
  renameList: (id: string, title: string) => void;
  importLists: (file: File) => Promise<void>;
  startSharing: (listId: string) => void;
  stopSharing: (listId: string) => void;
  joinSession: (sessionId: string) => void;
  exportLists: () => PackingList[];
}

export function useLists(): UseListsResult {
  const initial = useMemo(() => loadInitial(), []);
  const [lists, setLists] = useState<ListEntry[]>(initial.lists);
  const [activeId, setActiveId] = useState<string>(initial.activeId);
  /** listId -> sessionId (only for shared lists). */
  const [sessions, setSessions] = useState<Record<string, string>>(initial.sessions);
  /** Set of listIds that currently have at least one connected peer. */
  const [connectedRooms, setConnectedRooms] = useState<Record<string, boolean>>({});

  const roomStatus = useMemo<Record<string, ListSessionStatus>>(() => {
    const out: Record<string, ListSessionStatus> = {};
    for (const listId of Object.keys(sessions)) {
      out[listId] = connectedRooms[listId] ? "connected" : "waiting";
    }
    return out;
  }, [sessions, connectedRooms]);

  /** Live room/sync handles, kept out of React state because they're not serializable. */
  const openRoomsRef = useRef<Record<string, OpenRoom>>({});
  const persistedIdsRef = useRef<Set<string>>(new Set());

  const docs = useMemo(() => lists.map((l) => l.doc), [lists]);
  useYDocs(docs);

  // Persist any doc that updates, plus the index when lists/activeId/sessions change.
  useEffect(() => {
    const handlers: { doc: Y.Doc; handler: () => void }[] = [];
    for (const { id, doc } of lists) {
      const handler = () => persistDoc(id, doc);
      doc.on("update", handler);
      handlers.push({ doc, handler });
      if (!persistedIdsRef.current.has(id)) {
        persistDoc(id, doc);
        persistedIdsRef.current.add(id);
      }
    }
    return () => handlers.forEach(({ doc, handler }) => doc.off("update", handler));
  }, [lists]);

  useEffect(() => {
    persistIndex({ ids: lists.map((l) => l.id), activeId, sessions });
    const liveIds = new Set(lists.map((l) => l.id));
    for (const id of persistedIdsRef.current) {
      if (!liveIds.has(id)) {
        removeListFromStorage(id);
        persistedIdsRef.current.delete(id);
      }
    }
  }, [lists, activeId, sessions]);

  // Reconcile open rooms against `sessions`. Any sessionId in `sessions`
  // without an open room gets one. Any open room not in `sessions` is closed.
  // This effect runs on mount with persisted sessions, and again whenever the
  // user starts/stops sharing a list.
  useEffect(() => {
    const liveSessions = new Set(Object.values(sessions));

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
        setConnectedRooms((cur) => ({ ...cur, [listId]: true }));
      });
      roomHandle.onPeerLeave(() => {
        if (roomHandle.peerCount() === 0) {
          setConnectedRooms((cur) => ({ ...cur, [listId]: false }));
        }
      });
    }

    for (const listId of Object.keys(openRoomsRef.current)) {
      const open = openRoomsRef.current[listId];
      const stillSharedAtSameId = sessions[listId] === open.sessionId;
      if (!stillSharedAtSameId || !liveSessions.has(open.sessionId)) {
        open.syncHandle.stop();
        open.roomHandle.leave().catch(() => {});
        delete openRoomsRef.current[listId];
        setConnectedRooms((cur) => {
          if (!(listId in cur)) return cur;
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
      if (id === activeId) setActiveId(filtered[0].id);
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

  function importLists(file: File): Promise<void> {
    return importFromJson(file).then(({ lists: imported, activeListId }) => {
      const newEntries = imported.map((l) => ({
        id: l.id,
        doc: createListDoc({ title: l.title, days: l.days, sections: l.sections }),
      }));
      setLists(newEntries);
      setActiveId(
        newEntries.find((e) => e.id === activeListId)?.id ?? newEntries[0]?.id ?? ""
      );
    });
  }

  function startSharing(listId: string) {
    if (sessions[listId]) return;
    const sessionId = newSessionId();
    setSessions((prev) => ({ ...prev, [listId]: sessionId }));
  }

  function stopSharing(listId: string) {
    setSessions((prev) => {
      if (!(listId in prev)) return prev;
      const next = { ...prev };
      delete next[listId];
      return next;
    });
  }

  function joinSession(sessionId: string) {
    // If we already have a list joined to this session, just switch to it.
    const existingListId = Object.entries(sessions).find(
      ([, sid]) => sid === sessionId
    )?.[0];
    if (existingListId) {
      setActiveId(existingListId);
      return;
    }
    // Otherwise create a new local list and tie it to the session.
    const newId = `list-${Date.now()}`;
    const newDoc = new Y.Doc();
    setLists((prev) => [...prev, { id: newId, doc: newDoc }]);
    setActiveId(newId);
    setSessions((prev) => ({ ...prev, [newId]: sessionId }));
  }

  function exportLists(): PackingList[] {
    return lists.map(({ id, doc }) => listFromDoc(id, doc));
  }

  return {
    lists,
    activeId,
    activeEntry,
    sessions,
    roomStatus,
    setActiveId,
    createList,
    deleteList,
    renameList,
    importLists,
    startSharing,
    stopSharing,
    joinSession,
    exportLists,
  };
}
