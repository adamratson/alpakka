import { useState } from "react";

interface AddItemFormProps {
  onAdd: (title: string, description: string) => void;
  onCancel: () => void;
}

export default function AddItemForm({ onAdd, onCancel }: AddItemFormProps) {
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") onAdd(title, desc);
    if (e.key === "Escape") onCancel();
  }

  return (
    <li className="item-form">
      <div className="item-form__fields">
        <input
          className="item-form__input item-form__input--title"
          placeholder="Item name"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          autoFocus
        />
        <input
          className="item-form__input item-form__input--desc"
          placeholder="Description (optional)"
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          onKeyDown={handleKeyDown}
        />
      </div>
      <div className="item-form__actions">
        <button
          className="btn btn--primary btn--sm"
          onClick={() => onAdd(title, desc)}
          disabled={!title.trim()}
        >
          Add
        </button>
        <button className="btn btn--ghost btn--sm" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </li>
  );
}
