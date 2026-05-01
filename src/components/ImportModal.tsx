import { useEscapeKey } from "../hooks/useEscapeKey";

export type ImportMode = "merge" | "replace";

interface ImportModalProps {
  fileName: string;
  onImport: (mode: ImportMode) => void;
  onCancel: () => void;
}

export default function ImportModal({ fileName, onImport, onCancel }: ImportModalProps) {
  useEscapeKey(onCancel);

  return (
    // Backdrop click-to-dismiss is a mouse convenience; keyboard users dismiss
    // via Escape (handled by useEscapeKey above), so the missing keydown
    // handler on this <div> is intentional.
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-modal-title"
      >
        <h2 id="import-modal-title" className="modal__title">Import data</h2>
        <p className="modal__body">
          How should <strong>{fileName}</strong> be imported? Merging adds the
          imported lists alongside your current ones. Replacing discards your
          current lists.
        </p>
        <div className="modal__actions">
          <button className="btn btn--ghost" onClick={onCancel}>
            Cancel
          </button>
          <button
            className="btn btn--ghost"
            onClick={() => onImport("replace")}
          >
            Replace
          </button>
          <button
            className="btn btn--primary"
            onClick={() => onImport("merge")}
          >
            Merge
          </button>
        </div>
      </div>
    </div>
  );
}
