import { useState } from "react";

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

interface AddSectionFormProps {
  onAdd: (title: string) => void;
  onCancel: () => void;
}

export function AddSectionForm({ onAdd, onCancel }: AddSectionFormProps) {
  const [title, setTitle] = useState("");

  return (
    <div className="section-form">
      <input
        className="section-form__input"
        placeholder="Section name"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onAdd(title);
          if (e.key === "Escape") onCancel();
        }}
        autoFocus
      />
      <div className="section-form__actions">
        <button
          className="btn btn--primary"
          onClick={() => onAdd(title)}
          disabled={!title.trim()}
        >
          Add section
        </button>
        <button className="btn btn--ghost" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}

interface AddSectionButtonProps {
  onClick: () => void;
}

export function AddSectionButton({ onClick }: AddSectionButtonProps) {
  return (
    <button className="add-section-btn" onClick={onClick}>
      <PlusIcon />
      Add section
    </button>
  );
}
