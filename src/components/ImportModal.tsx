export type ImportMode = "merge" | "replace";

interface ImportModalProps {
  fileName: string;
  onImport: (mode: ImportMode) => void;
  onCancel: () => void;
}

export default function ImportModal({ fileName, onImport, onCancel }: ImportModalProps) {
  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal__title">Import data</h2>
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
