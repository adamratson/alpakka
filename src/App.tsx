import { useState } from "react";
import AppHeader from "./components/AppHeader";
import Sidebar from "./components/Sidebar";
import KitSectionComponent from "./components/KitSection";
import { AddSectionForm, AddSectionButton } from "./components/AddSectionForm";
import ShareModal from "./components/ShareModal";
import JoinModal from "./components/JoinModal";
import { exportToJson } from "./utils/export";
import { getListTitle, listFromDoc, ops } from "./collab/doc";
import { useLists } from "./hooks/useLists";
import { useJoinFromUrl } from "./hooks/useJoinFromUrl";
import "./App.css";

export default function App() {
  const {
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
  } = useLists();

  const [addingSection, setAddingSection] = useState(false);
  const [sharingListId, setSharingListId] = useState<string | null>(null);
  const [joinSessionId, setJoinSessionId] = useJoinFromUrl();

  if (!activeEntry) return null;

  const activeDoc = activeEntry.doc;
  const activeList = listFromDoc(activeEntry.id, activeDoc);
  const { sections, days } = activeList;
  const allItems = sections.flatMap((s) => s.items);
  const checkedCount = allItems.filter((i) => i.checked).length;

  const activeSessionId = sessions[activeEntry.id];
  const activeStatus = activeSessionId ? roomStatus[activeEntry.id] ?? "waiting" : null;
  const sharingList = sharingListId ? lists.find((l) => l.id === sharingListId) : null;

  function handleShare() {
    startSharing(activeEntry!.id);
    setSharingListId(activeEntry!.id);
  }

  function handleImport(file: File) {
    importLists(file).catch((err: Error) => alert(`Import failed: ${err.message}`));
  }

  function handleJoin(sessionId: string) {
    joinSession(sessionId);
    setJoinSessionId(null);
  }

  return (
    <div className="app">
      <AppHeader
        days={days}
        onDaysChange={(d) => ops.setDays(activeDoc, d)}
        checkedItems={checkedCount}
        totalItems={allItems.length}
        onExport={() => exportToJson(exportLists(), activeId)}
        onImport={handleImport}
        onShare={handleShare}
        onStopSharing={
          activeSessionId ? () => stopSharing(activeEntry.id) : undefined
        }
        sessionStatus={activeStatus}
      />

      <div className="app-body">
        <Sidebar
          lists={lists.map(({ id, doc }) => ({ id, title: getListTitle(doc) }))}
          activeListId={activeId}
          sharedListIds={new Set(Object.keys(sessions))}
          onSwitch={setActiveId}
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
              onToggleItem={(itemId) => ops.toggleItem(activeDoc, section.id, itemId)}
              onToggleAll={(checked) => ops.toggleAll(activeDoc, section.id, checked)}
              onUpdateQuantity={(itemId, qty) =>
                ops.updateQuantity(activeDoc, section.id, itemId, qty)
              }
              onUpdatePerDay={(itemId, pd) =>
                ops.updatePerDay(activeDoc, section.id, itemId, pd)
              }
              onUpdateItemDetails={(itemId, updates) =>
                ops.updateItemDetails(activeDoc, section.id, itemId, updates)
              }
              onAddItem={(title, desc) => ops.addItem(activeDoc, section.id, title, desc)}
              onRemoveItem={(itemId) => ops.removeItem(activeDoc, section.id, itemId)}
              onRemoveSection={() => ops.removeSection(activeDoc, section.id)}
              onRenameSection={(title) => ops.renameSection(activeDoc, section.id, title)}
              onMoveTo={(toIndex) => ops.moveSection(activeDoc, section.id, toIndex)}
            />
          ))}

          {addingSection ? (
            <AddSectionForm
              onAdd={(title) => {
                ops.addSection(activeDoc, title);
                setAddingSection(false);
              }}
              onCancel={() => setAddingSection(false)}
            />
          ) : (
            <AddSectionButton onClick={() => setAddingSection(true)} />
          )}
        </main>
      </div>

      {sharingList && (
        <ShareModal
          listTitle={getListTitle(sharingList.doc)}
          sessionId={sessions[sharingList.id] ?? ""}
          onClose={() => setSharingListId(null)}
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
