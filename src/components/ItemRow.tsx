import { useState } from "react";
import type { KitItem } from "../data";

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

interface ItemRowProps {
  item: KitItem;
  days: number;
  onToggle: () => void;
  onUpdateQuantity: (quantity: number) => void;
  onUpdatePerDay: (perDay: boolean) => void;
  onUpdateDetails: (updates: { title?: string; description?: string }) => void;
  onRemove: () => void;
}

export default function ItemRow({
  item,
  days,
  onToggle,
  onUpdateQuantity,
  onUpdatePerDay,
  onUpdateDetails,
  onRemove,
}: ItemRowProps) {
  const [displayQty, setDisplayQty] = useState(String(item.quantity));
  const [prevQty, setPrevQty] = useState(item.quantity);
  const [confirming, setConfirming] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(item.title);
  const [editDesc, setEditDesc] = useState(item.description);

  if (prevQty !== item.quantity) {
    setPrevQty(item.quantity);
    setDisplayQty(String(item.quantity));
  }

  function commitEdit() {
    const titleTrimmed = editTitle.trim();
    if (titleTrimmed && titleTrimmed !== item.title) {
      onUpdateDetails({ title: titleTrimmed, description: editDesc });
    }
    setEditing(false);
  }

  return (
    <li
      className={`item ${item.checked ? "item--checked" : ""}`}
      onClick={onToggle}
    >
      <span className="item__check" aria-hidden="true">
        {item.checked ? (
          <svg viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="7.5" stroke="currentColor" />
            <path
              d="M4.5 8L7 10.5L11.5 5.5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : (
          <svg viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="7.5" stroke="currentColor" />
          </svg>
        )}
      </span>

      <span className="item__body">
        {editing ? (
          <div className="item__edit-form" onClick={(e) => e.stopPropagation()}>
            <input
              className="item__edit-input item__edit-input--title"
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onBlur={commitEdit}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitEdit();
                if (e.key === "Escape") {
                  setEditTitle(item.title);
                  setEditDesc(item.description);
                  setEditing(false);
                }
              }}
              autoFocus
            />
            <input
              className="item__edit-input item__edit-input--desc"
              type="text"
              placeholder="Add description..."
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
              onBlur={commitEdit}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitEdit();
                if (e.key === "Escape") {
                  setEditTitle(item.title);
                  setEditDesc(item.description);
                  setEditing(false);
                }
              }}
            />
          </div>
        ) : (
          <>
            <span
              className="item__title"
              onDoubleClick={() => setEditing(true)}
              title="Double-click to edit"
            >
              {item.title}
            </span>
            {item.description && (
              <span className="item__desc">{item.description}</span>
            )}
          </>
        )}
      </span>

      <span className="item__qty-wrap" onClick={(e) => e.stopPropagation()}>
        <span className="item__qty">
          <span className="item__qty-x">×</span>
          <input
            className="item__qty-input"
            type="number"
            min={1}
            value={displayQty}
            onChange={(e) => {
              setDisplayQty(e.target.value);
              const val = parseInt(e.target.value, 10);
              if (!isNaN(val) && val >= 1) onUpdateQuantity(val);
            }}
            onBlur={() => {
              const val = parseInt(displayQty, 10);
              if (isNaN(val) || val < 1) setDisplayQty(String(item.quantity));
            }}
            aria-label={`Quantity for ${item.title}`}
          />
        </span>
        <button
          className={`item__per-day-btn ${item.perDay ? "item__per-day-btn--active" : ""}`}
          onClick={() => onUpdatePerDay(!item.perDay)}
          title={item.perDay ? "Switch to total quantity" : "Switch to per day"}
        >
          {item.perDay ? "/day" : "total"}
        </button>
        {item.perDay && (
          <span
            className="item__trip-total"
            title={`${item.quantity} × ${days} days`}
          >
            = {item.quantity * days}
          </span>
        )}
      </span>

      {confirming ? (
        <span className="item__delete-confirm" onClick={(e) => e.stopPropagation()}>
          <button
            className="btn btn--danger btn--sm"
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
          >
            Remove
          </button>
          <button
            className="btn btn--ghost btn--sm"
            onClick={(e) => { e.stopPropagation(); setConfirming(false); }}
          >
            Cancel
          </button>
        </span>
      ) : (
        <button
          className="icon-btn icon-btn--danger item__delete"
          onClick={(e) => { e.stopPropagation(); setConfirming(true); }}
          title="Remove item"
          aria-label={`Remove ${item.title}`}
        >
          <TrashIcon />
        </button>
      )}
    </li>
  );
}
