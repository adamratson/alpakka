import { useState, useEffect, useRef } from "react";

interface AppHeaderProps {
  days: number;
  onDaysChange: (days: number) => void;
  checkedItems: number;
  totalItems: number;
  onExport: () => void;
  onImport: (file: File) => void;
  onShare: () => void;
  sessionStatus?: "waiting" | "connected" | null;
  onStopSharing?: () => void;
}

export default function AppHeader({
  days,
  onDaysChange,
  checkedItems,
  totalItems,
  onExport,
  onImport,
  onShare,
  sessionStatus,
  onStopSharing,
}: AppHeaderProps) {
  const [displayDays, setDisplayDays] = useState(String(days));
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDisplayDays(String(days));
  }, [days]);

  const progress =
    totalItems === 0 ? 0 : Math.round((checkedItems / totalItems) * 100);

  return (
    <header className="app-header">
      <div className="app-header__top">
        <h1>Alpakka</h1>
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
          {sessionStatus && (
            <span
              className={`session-pill session-pill--${sessionStatus}`}
              aria-live="polite"
            >
              {sessionStatus === "connected" && "● Connected"}
              {sessionStatus === "waiting" && "● Waiting…"}
            </span>
          )}
          {sessionStatus ? (
            <>
              <button className="btn btn--ghost" onClick={onShare}>
                Show link
              </button>
              {onStopSharing && (
                <button className="btn btn--ghost" onClick={onStopSharing}>
                  Stop sharing
                </button>
              )}
            </>
          ) : (
            <button className="btn btn--ghost" onClick={onShare}>
              Share
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
