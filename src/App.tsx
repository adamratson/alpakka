import { useState, useEffect } from "react";
import { initialSections } from "./data";
import type { PackingList, KitSection } from "./data";
import AppHeader from "./components/AppHeader";
import Sidebar from "./components/Sidebar";
import KitSectionComponent from "./components/KitSection";
import { AddSectionForm, AddSectionButton } from "./components/AddSectionForm";
import { exportToJson, importFromJson } from "./utils/export";
import "./App.css";

export default function App() {
  const [lists, setLists] = useState<PackingList[]>(() => {
    try {
      // Check for new format first
      const saved = localStorage.getItem("alpakka-lists");
      if (saved) {
        return JSON.parse(saved) as PackingList[];
      }

      // Migrate from old format if available
      const oldSections = localStorage.getItem("alpakka-sections");
      const oldDays = localStorage.getItem("alpakka-days");
      const oldTitle = localStorage.getItem("alpakka-title");

      if (oldSections) {
        // Old format exists, migrate it
        const migratedList: PackingList = {
          id: `list-${Date.now()}`,
          title: oldTitle || "Bikepacking kit list",
          sections: JSON.parse(oldSections),
          days: oldDays ? parseInt(oldDays, 10) : 7,
        };
        // Clear old keys after migration
        localStorage.removeItem("alpakka-sections");
        localStorage.removeItem("alpakka-days");
        localStorage.removeItem("alpakka-title");
        return [migratedList];
      }

      // No saved data, use initial state
      return [
        {
          id: `list-${Date.now()}`,
          title: "Bikepacking kit list",
          sections: initialSections,
          days: 7,
        },
      ];
    } catch {
      return [
        {
          id: `list-${Date.now()}`,
          title: "Bikepacking kit list",
          sections: initialSections,
          days: 7,
        },
      ];
    }
  });

  const [activeListId, setActiveListId] = useState<string>(() => {
    try {
      // Try to restore from localStorage
      const saved = localStorage.getItem("alpakka-active");
      if (saved) return saved;
      // If no saved active ID, try to get it from the lists
      const listsSaved = localStorage.getItem("alpakka-lists");
      if (listsSaved) {
        const parsed = JSON.parse(listsSaved) as PackingList[];
        if (parsed.length > 0) return parsed[0].id;
      }
    } catch {
      // fall through
    }
    // Fallback: will be synced in useEffect
    return "__pending__";
  });

  // Sync activeListId with lists if it becomes invalid
  useEffect(() => {
    if (activeListId === "__pending__" || (!lists.find(l => l.id === activeListId) && lists.length > 0)) {
      setActiveListId(lists[0].id);
    }
  }, [lists, activeListId]);

  const [addingSection, setAddingSection] = useState(false);

  useEffect(() => {
    localStorage.setItem("alpakka-lists", JSON.stringify(lists));
  }, [lists]);

  useEffect(() => {
    // Don't save "__pending__" to localStorage
    if (activeListId !== "__pending__") {
      localStorage.setItem("alpakka-active", activeListId);
    }
  }, [activeListId]);

  const activeList = lists.find((l) => l.id === activeListId);
  // Don't render until we have a valid active list
  if (!activeList || activeListId === "__pending__") return null;

  const { sections, days } = activeList;
  const allItems = sections.flatMap((s) => s.items);
  const checkedCount = allItems.filter((i) => i.checked).length;

  // Helper to update the active list
  function updateActiveList(updater: (list: PackingList) => PackingList) {
    setLists((prev) =>
      prev.map((l) => (l.id === activeListId ? updater(l) : l))
    );
  }

  // Helper to update a section in the active list
  function updateSection(
    sectionId: string,
    updater: (s: KitSection) => KitSection
  ) {
    updateActiveList((list) => ({
      ...list,
      sections: list.sections.map((s) => (s.id === sectionId ? updater(s) : s)),
    }));
  }

  function toggleItem(sectionId: string, itemId: string) {
    updateSection(sectionId, (s) => ({
      ...s,
      items: s.items.map((item) =>
        item.id === itemId ? { ...item, checked: !item.checked } : item
      ),
    }));
  }

  function toggleAll(sectionId: string, checked: boolean) {
    updateSection(sectionId, (s) => ({
      ...s,
      items: s.items.map((item) => ({ ...item, checked })),
    }));
  }

  function updateQuantity(sectionId: string, itemId: string, quantity: number) {
    updateSection(sectionId, (s) => ({
      ...s,
      items: s.items.map((item) =>
        item.id === itemId ? { ...item, quantity } : item
      ),
    }));
  }

  function updatePerDay(sectionId: string, itemId: string, perDay: boolean) {
    updateSection(sectionId, (s) => ({
      ...s,
      items: s.items.map((item) =>
        item.id === itemId ? { ...item, perDay } : item
      ),
    }));
  }

  function addItem(sectionId: string, title: string, description: string) {
    const id = `item-${Date.now()}`;
    updateSection(sectionId, (s) => ({
      ...s,
      items: [
        ...s.items,
        { id, title, quantity: 1, perDay: false, description, checked: false },
      ],
    }));
  }

  function removeItem(sectionId: string, itemId: string) {
    updateSection(sectionId, (s) => ({
      ...s,
      items: s.items.filter((item) => item.id !== itemId),
    }));
  }

  function addSection(title: string) {
    const id = `section-${Date.now()}`;
    updateActiveList((list) => ({
      ...list,
      sections: [...list.sections, { id, title, items: [] }],
    }));
    setAddingSection(false);
  }

  function removeSection(sectionId: string) {
    updateActiveList((list) => ({
      ...list,
      sections: list.sections.filter((s) => s.id !== sectionId),
    }));
  }

  function resetAll() {
    updateActiveList((list) => ({
      ...list,
      sections: list.sections.map((s) => ({
        ...s,
        items: s.items.map((item) => ({ ...item, checked: false })),
      })),
    }));
  }

  function handleDaysChange(newDays: number) {
    updateActiveList((list) => ({
      ...list,
      days: newDays,
    }));
  }

  function handleImport(file: File) {
    importFromJson(file)
      .then(({ lists: importedLists, activeListId: importedActiveId }) => {
        setLists(importedLists);
        setActiveListId(importedActiveId);
      })
      .catch((err: Error) => alert(`Import failed: ${err.message}`));
  }

  function createList() {
    const id = `list-${Date.now()}`;
    setLists((prev) => [
      ...prev,
      {
        id,
        title: "New kit list",
        sections: [],
        days: 7,
      },
    ]);
    setActiveListId(id);
  }

  function deleteList(id: string) {
    setLists((prev) => {
      const filtered = prev.filter((l) => l.id !== id);
      if (filtered.length === 0) {
        // Don't allow deleting the last list
        return prev;
      }
      // If we're deleting the active list, switch to the first remaining
      if (id === activeListId) {
        setActiveListId(filtered[0].id);
      }
      return filtered;
    });
  }

  function renameList(id: string, title: string) {
    setLists((prev) =>
      prev.map((l) => (l.id === id ? { ...l, title } : l))
    );
  }

  function switchList(id: string) {
    setActiveListId(id);
  }

  return (
    <div className="app">
      <AppHeader
        days={days}
        onDaysChange={handleDaysChange}
        checkedItems={checkedCount}
        totalItems={allItems.length}
        onReset={resetAll}
        onExport={() => exportToJson(lists, activeListId)}
        onImport={handleImport}
      />

      <div className="app-body">
        <Sidebar
          lists={lists}
          activeListId={activeListId}
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
              onUpdateQuantity={(itemId, qty) =>
                updateQuantity(section.id, itemId, qty)
              }
              onUpdatePerDay={(itemId, pd) => updatePerDay(section.id, itemId, pd)}
              onAddItem={(title, desc) => addItem(section.id, title, desc)}
              onRemoveItem={(itemId) => removeItem(section.id, itemId)}
              onRemoveSection={() => removeSection(section.id)}
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
    </div>
  );
}
