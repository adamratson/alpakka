import { useState, useEffect } from "react";

interface AppHeaderProps {
  days: number;
  onDaysChange: (days: number) => void;
  checkedItems: number;
  totalItems: number;
  onReset: () => void;
  onExport: () => void;
}

export default function AppHeader({
  days,
  onDaysChange,
  checkedItems,
  totalItems,
  onReset,
  onExport,
}: AppHeaderProps) {
  const [displayDays, setDisplayDays] = useState(String(days));

  useEffect(() => {
    setDisplayDays(String(days));
  }, [days]);

  const progress =
    totalItems === 0 ? 0 : Math.round((checkedItems / totalItems) * 100);

  return (
    <header className="app-header">
      <div className="app-header__top">
        <div className="app-header__title">
          <h1>Pakka</h1>
          <p>Bikepacking kit list</p>
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
          <button className="btn btn--primary" onClick={onExport}>
            Export JSON
          </button>
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
