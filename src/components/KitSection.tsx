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

interface KitSectionProps {
  section: KitSectionType;
  days: number;
  onToggleItem: (itemId: string) => void;
  onToggleAll: (checked: boolean) => void;
  onUpdateQuantity: (itemId: string, quantity: number) => void;
  onUpdatePerDay: (itemId: string, perDay: boolean) => void;
  onRemoveItem: (itemId: string) => void;
  onRemoveSection: () => void;
  onAddItem: (title: string, description: string) => void;
}

export default function KitSection({
  section,
  days,
  onToggleItem,
  onToggleAll,
  onUpdateQuantity,
  onUpdatePerDay,
  onRemoveItem,
  onRemoveSection,
  onAddItem,
}: KitSectionProps) {
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const allChecked =
    section.items.length > 0 && section.items.every((i) => i.checked);
  const someChecked = !allChecked && section.items.some((i) => i.checked);

  function handleAddItem(title: string, description: string) {
    const trimmed = title.trim();
    if (!trimmed) return;
    onAddItem(trimmed, description.trim());
    setIsAddingItem(false);
  }

  return (
    <section className="kit-section">
      <div className="kit-section__header">
        <h2 className="kit-section__title">{section.title}</h2>
        <div className="kit-section__header-actions">
          {section.items.length > 0 && (
            <button
              className={`section-btn ${allChecked ? "section-btn--active" : ""}`}
              onClick={() => onToggleAll(!allChecked)}
            >
              {allChecked ? "Unpack all" : someChecked ? "Pack rest" : "Pack all"}
            </button>
          )}
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
    </section>
  );
}
