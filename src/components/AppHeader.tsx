import { useState, useEffect, useRef } from "react";

interface AppHeaderProps {
  days: number;
  onDaysChange: (days: number) => void;
  checkedItems: number;
  totalItems: number;
  onReset: () => void;
  onExport: () => void;
  onImport: (file: File) => void;
  listTitle: string;
  onListTitleChange: (title: string) => void;
  onClearAll: () => void;
}

export default function AppHeader({
  days,
  onDaysChange,
  checkedItems,
  totalItems,
  onReset,
  onExport,
  onImport,
  listTitle,
  onListTitleChange,
  onClearAll,
}: AppHeaderProps) {
  const [displayDays, setDisplayDays] = useState(String(days));
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(listTitle);
  const [confirmingClear, setConfirmingClear] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDisplayDays(String(days));
  }, [days]);

  useEffect(() => {
    setTitleInput(listTitle);
  }, [listTitle]);

  useEffect(() => {
    if (editingTitle) {
      titleInputRef.current?.focus();
      titleInputRef.current?.select();
    }
  }, [editingTitle]);

  function commitTitle() {
    const trimmed = titleInput.trim();
    if (trimmed) {
      onListTitleChange(trimmed);
    } else {
      setTitleInput(listTitle);
    }
    setEditingTitle(false);
  }

  const progress =
    totalItems === 0 ? 0 : Math.round((checkedItems / totalItems) * 100);

  return (
    <header className="app-header">
      <div className="app-header__top">
        <div className="app-header__title">
          <h1>Pakka</h1>
          {editingTitle ? (
            <input
              ref={titleInputRef}
              className="app-header__title-input"
              type="text"
              value={titleInput}
              onChange={(e) => setTitleInput(e.target.value)}
              onBlur={commitTitle}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitTitle();
                if (e.key === "Escape") {
                  setTitleInput(listTitle);
                  setEditingTitle(false);
                }
              }}
              aria-label="List title"
            />
          ) : (
            <button
              className="app-header__title-btn"
              onClick={() => setEditingTitle(true)}
              title="Click to edit list title"
              aria-label={`List title: ${listTitle}. Click to edit.`}
            >
              {listTitle}
            </button>
          )}
        </div>
        <label className="trip-days">
          <span className="trip-days__label">Trip length</span>
          <span className="trip-days__input-wrap">
            <input
              className="trip-days__input"
              type="number"
              min={1}
              value={displayDays}
              onChange={(e) => {
                setDisplayDays(e.target.value);
                const val = parseInt(e.target.value, 10);
                if (!isNaN(val) && val >= 1) onDaysChange(val);
              }}
              onBlur={() => {
                const val = parseInt(displayDays, 10);
                if (isNaN(val) || val < 1) setDisplayDays(String(days));
              }}
              aria-label="Trip length in days"
            />
            <span className="trip-days__unit">days</span>
          </span>
        </label>
        <div className="app-header__actions">
          <button className="btn btn--ghost" onClick={onReset}>
            Reset
          </button>
          {confirmingClear ? (
            <span className="clear-all-confirm">
              <span className="clear-all-confirm__label">Clear all gear?</span>
              <button
                className="btn btn--danger btn--sm"
                onClick={() => {
                  onClearAll();
                  setConfirmingClear(false);
                }}
              >
                Clear
              </button>
              <button
                className="btn btn--ghost btn--sm"
                onClick={() => setConfirmingClear(false)}
              >
                Cancel
              </button>
            </span>
          ) : (
            <button
              className="btn btn--ghost"
              onClick={() => setConfirmingClear(true)}
            >
              Clear all
            </button>
          )}
          <button
            className="btn btn--ghost"
            onClick={() => fileInputRef.current?.click()}
          >
            Import JSON
          </button>
          <button className="btn btn--primary" onClick={onExport}>
            Export JSON
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            style={{ display: "none" }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                onImport(file);
                e.target.value = "";
              }
            }}
          />
        </div>
      </div>
      <div className="progress">
        <div className="progress__track">
          <div className="progress__fill" style={{ width: `${progress}%` }} />
        </div>
        <span className="progress__label">
          {checkedItems} / {totalItems} packed
        </span>
      </div>
    </header>
  );
}
