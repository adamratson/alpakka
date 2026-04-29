import { useState } from "react";
import type { KitSection as KitSectionType } from "../data";
import ItemRow from "./ItemRow";
import AddItemForm from "./AddItemForm";

const TrashIcon = () => (
  <svg viewBox="0 0 16 16" fill="none">
    <path
      d="M3 4h10M6 4V2.5h4V4M6.5 7v5M9.5 7v5M4 4l.75 8.5h6.5L12 4"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const PlusIcon = () => (
  <svg viewBox="0 0 16 16" fill="none">
    <path
      d="M8 3v10M3 8h10"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
);

const ChevronIcon = ({ collapsed }: { collapsed: boolean }) => (
  <svg
    viewBox="0 0 16 16"
    fill="none"
    style={{ transform: collapsed ? "rotate(-90deg)" : "rotate(0deg)", transition: "transform 0.2s" }}
  >
    <path
      d="M6 4l4 4-4 4"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const UpIcon = () => (
  <svg viewBox="0 0 16 16" fill="none">
    <path
      d="M4 10l4-4 4 4"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const DownIcon = () => (
  <svg viewBox="0 0 16 16" fill="none">
    <path
      d="M4 6l4 4 4-4"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

interface KitSectionProps {
  section: KitSectionType;
  days: number;
  index: number;
  total: number;
  onToggleItem: (itemId: string) => void;
  onToggleAll: (checked: boolean) => void;
  onUpdateQuantity: (itemId: string, quantity: number) => void;
  onUpdatePerDay: (itemId: string, perDay: boolean) => void;
  onUpdateItemDetails: (itemId: string, updates: { title?: string; description?: string }) => void;
  onRemoveItem: (itemId: string) => void;
  onRemoveSection: () => void;
  onAddItem: (title: string, description: string) => void;
  onRenameSection: (title: string) => void;
  onMoveTo: (toIndex: number) => void;
}

export default function KitSection({
  section,
  days,
  index,
  total,
  onToggleItem,
  onToggleAll,
  onUpdateQuantity,
  onUpdatePerDay,
  onUpdateItemDetails,
  onRemoveItem,
  onRemoveSection,
  onAddItem,
  onRenameSection,
  onMoveTo,
}: KitSectionProps) {
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(section.title);

  const allChecked =
    section.items.length > 0 && section.items.every((i) => i.checked);
  const someChecked = !allChecked && section.items.some((i) => i.checked);

  function handleAddItem(title: string, description: string) {
    const trimmed = title.trim();
    if (!trimmed) return;
    onAddItem(trimmed, description.trim());
    setIsAddingItem(false);
  }

  function commitTitleEdit() {
    const trimmed = titleInput.trim();
    if (trimmed && trimmed !== section.title) {
      onRenameSection(trimmed);
    }
    setEditingTitle(false);
  }

  return (
    <section className="kit-section">
      <div className="kit-section__header">
        <button
          className="kit-section__collapse-btn"
          onClick={() => setIsCollapsed(!isCollapsed)}
          title={isCollapsed ? "Expand section" : "Collapse section"}
          aria-label={`${isCollapsed ? "Expand" : "Collapse"} section ${section.title}`}
        >
          <ChevronIcon collapsed={isCollapsed} />
        </button>
        {editingTitle ? (
          <input
            className="kit-section__title-input"
            type="text"
            value={titleInput}
            onChange={(e) => setTitleInput(e.target.value)}
            onBlur={commitTitleEdit}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitTitleEdit();
              if (e.key === "Escape") {
                setTitleInput(section.title);
                setEditingTitle(false);
              }
            }}
            autoFocus
          />
        ) : (
          <h2
            className="kit-section__title"
            onDoubleClick={() => setEditingTitle(true)}
            title="Double-click to rename"
          >
            {section.title}
          </h2>
        )}
        <div className="kit-section__header-actions">
          {section.items.length > 0 && (
            <button
              className={`section-btn ${allChecked ? "section-btn--active" : ""}`}
              onClick={() => onToggleAll(!allChecked)}
            >
              {allChecked ? "Unpack all" : someChecked ? "Pack rest" : "Pack all"}
            </button>
          )}
          <div className="kit-section__move">
            <button
              className="icon-btn icon-btn--move"
              onClick={() => onMoveTo(index - 1)}
              disabled={index === 0}
              title="Move section up"
              aria-label={`Move section ${section.title} up`}
            >
              <UpIcon />
            </button>
            <button
              className="icon-btn icon-btn--move"
              onClick={() => onMoveTo(index + 1)}
              disabled={index >= total - 1}
              title="Move section down"
              aria-label={`Move section ${section.title} down`}
            >
              <DownIcon />
            </button>
          </div>
          {confirmingDelete ? (
            <span className="section-delete-confirm">
              <span className="section-delete-confirm__label">Remove section?</span>
              <button
                className="btn btn--danger btn--sm"
                onClick={onRemoveSection}
              >
                Remove
              </button>
              <button
                className="btn btn--ghost btn--sm"
                onClick={() => setConfirmingDelete(false)}
              >
                Cancel
              </button>
            </span>
          ) : (
            <button
              className="icon-btn icon-btn--danger"
              onClick={() => setConfirmingDelete(true)}
              title="Remove section"
              aria-label={`Remove section ${section.title}`}
            >
              <TrashIcon />
            </button>
          )}
        </div>
      </div>

      {!isCollapsed && (
        <>
          <ul className="item-list">
            {section.items.length === 0 && !isAddingItem && (
              <li className="item-list__empty">No items yet</li>
            )}

            {section.items.map((item) => (
              <ItemRow
                key={item.id}
                item={item}
                days={days}
                onToggle={() => onToggleItem(item.id)}
                onUpdateQuantity={(qty) => onUpdateQuantity(item.id, qty)}
                onUpdatePerDay={(pd) => onUpdatePerDay(item.id, pd)}
                onUpdateDetails={(updates) => onUpdateItemDetails(item.id, updates)}
                onRemove={() => onRemoveItem(item.id)}
              />
            ))}

            {isAddingItem && (
              <AddItemForm
                onAdd={handleAddItem}
                onCancel={() => setIsAddingItem(false)}
              />
            )}
          </ul>

          {!isAddingItem && (
            <button className="add-item-btn" onClick={() => setIsAddingItem(true)}>
              <PlusIcon />
              Add item
            </button>
          )}
        </>
      )}
    </section>
  );
}
