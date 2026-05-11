import { useEscapeKey } from "../hooks/useEscapeKey";

interface MergeModalProps {
  title: string;
  onMerge: () => void;
  onKeepSeparate: () => void;
}

export default function MergeModal({ title, onMerge, onKeepSeparate }: MergeModalProps) {
  useEscapeKey(onKeepSeparate);

  return (
    // Backdrop click-to-dismiss is a mouse convenience; keyboard users dismiss
    // via Escape (handled by useEscapeKey above), so the missing keydown
    // handler on this <div> is intentional.
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onKeepSeparate();
      }}
    >
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="merge-modal-title"
      >
        <h2 id="merge-modal-title" className="modal__title">
          Merge with your existing list?
        </h2>
        <p className="modal__body">
          You already have a list called <strong>{title}</strong>. Would you
          like to merge your local edits into the shared list, or keep both
          lists separate?
        </p>
        <div className="modal__actions">
          <button className="btn btn--ghost" onClick={onKeepSeparate}>
            Keep separate
          </button>
          <button className="btn btn--primary" onClick={onMerge}>
            Merge into shared list
          </button>
        </div>
      </div>
    </div>
  );
}
