import { useState } from "react";
import type { KitItem } from "../data";
import EditPencilButton from "./EditPencilButton";

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

  function rowClick(e: React.MouseEvent) {
    // Clicks that originate inside an inner control (button/input) or
    // a stop-region (qty wrap, edit form, delete confirm) should not toggle.
    const target = e.target as HTMLElement;
    if (
      target.closest(
        "button, input, .item__qty-wrap, .item__edit-form, .item__delete-confirm"
      )
    ) {
      return;
    }
    onToggle();
  }

  return (
    // The row's onClick is a mouse-only convenience — the keyboard-accessible
    // toggle is the .item__check-btn below. Suppressing the lint rule because
    // adding a redundant onKeyDown here would create two keyboard targets and
    // confuse focus order.
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions
    <li className={`item ${item.checked ? "item--checked" : ""}`} onClick={rowClick}>
      <button
        type="button"
        className="item__check-btn"
        aria-pressed={item.checked}
        aria-label={`${item.checked ? "Unpack" : "Pack"} ${item.title}`}
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
      </button>

      <span className="item__body">
        {editing ? (
          <div className="item__edit-form">
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
              aria-label="Item title"
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
              aria-label="Item description"
            />
          </div>
        ) : (
          <>
            <span className="item__title">{item.title}</span>
            {item.description && (
              <span className="item__desc">{item.description}</span>
            )}
          </>
        )}
      </span>

      {!editing && (
        <EditPencilButton
          className="item__edit"
          onClick={() => {
            setEditTitle(item.title);
            setEditDesc(item.description);
            setEditing(true);
          }}
          ariaLabel={`Edit ${item.title}`}
        />
      )}

      <span className="item__qty-wrap">
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
        <span className="item__delete-confirm">
          <button
            className="btn btn--danger btn--sm"
            onClick={onRemove}
          >
            Remove
          </button>
          <button
            className="btn btn--ghost btn--sm"
            onClick={() => setConfirming(false)}
          >
            Cancel
          </button>
        </span>
      ) : (
        <button
          className="icon-btn icon-btn--danger item__delete"
          onClick={() => setConfirming(true)}
          title="Remove item"
          aria-label={`Remove ${item.title}`}
        >
          <TrashIcon />
        </button>
      )}
    </li>
  );
}
