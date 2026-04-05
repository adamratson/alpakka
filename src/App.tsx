import { useState, useEffect } from "react";
import { initialSections } from "./data";
import type { KitSection } from "./data";
import AppHeader from "./components/AppHeader";
import KitSectionComponent from "./components/KitSection";
import { AddSectionForm, AddSectionButton } from "./components/AddSectionForm";
import { exportToJson, importFromJson } from "./utils/export";
import "./App.css";

export default function App() {
  const [sections, setSections] = useState<KitSection[]>(() => {
    try {
      const saved = localStorage.getItem("pakka-sections");
      return saved ? (JSON.parse(saved) as KitSection[]) : initialSections;
    } catch {
      return initialSections;
    }
  });

  const [days, setDays] = useState<number>(() => {
    try {
      const saved = localStorage.getItem("pakka-days");
      return saved ? parseInt(saved, 10) : 7;
    } catch {
      return 7;
    }
  });

  const [listTitle, setListTitle] = useState<string>(() => {
    try {
      const saved = localStorage.getItem("pakka-title");
      return saved ? saved : "Bikepacking kit list";
    } catch {
      return "Bikepacking kit list";
    }
  });

  const [addingSection, setAddingSection] = useState(false);

  useEffect(() => {
    localStorage.setItem("pakka-sections", JSON.stringify(sections));
  }, [sections]);

  useEffect(() => {
    localStorage.setItem("pakka-days", String(days));
  }, [days]);

  useEffect(() => {
    localStorage.setItem("pakka-title", listTitle);
  }, [listTitle]);

  const allItems = sections.flatMap((s) => s.items);
  const checkedCount = allItems.filter((i) => i.checked).length;

  function updateSection(sectionId: string, updater: (s: KitSection) => KitSection) {
    setSections((prev) =>
      prev.map((s) => (s.id === sectionId ? updater(s) : s))
    );
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
    setSections((prev) => [...prev, { id, title, items: [] }]);
    setAddingSection(false);
  }

  function removeSection(sectionId: string) {
    setSections((prev) => prev.filter((s) => s.id !== sectionId));
  }

  function handleImport(file: File) {
    importFromJson(file)
      .then(({ sections, days, listTitle }) => {
        setSections(sections);
        setDays(days);
        setListTitle(listTitle);
      })
      .catch((err: Error) => alert(`Import failed: ${err.message}`));
  }

  function resetAll() {
    setSections((prev) =>
      prev.map((s) => ({
        ...s,
        items: s.items.map((item) => ({ ...item, checked: false })),
      }))
    );
  }

  function clearAllGear() {
    setSections([]);
  }

  return (
    <div className="app">
      <AppHeader
        days={days}
        onDaysChange={setDays}
        checkedItems={checkedCount}
        totalItems={allItems.length}
        onReset={resetAll}
        onExport={() => exportToJson(sections, days, listTitle)}
        onImport={handleImport}
        listTitle={listTitle}
        onListTitleChange={setListTitle}
        onClearAll={clearAllGear}
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
  );
}
