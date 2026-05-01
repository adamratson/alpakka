import { useEscapeKey } from "../hooks/useEscapeKey";

interface JoinModalProps {
  sessionId: string;
  onJoin: (sessionId: string) => void;
  onCancel: () => void;
}

export default function JoinModal({ sessionId, onJoin, onCancel }: JoinModalProps) {
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
        aria-labelledby="join-modal-title"
      >
        <h2 id="join-modal-title" className="modal__title">
          Join shared packing list?
        </h2>
        <p className="modal__body">
          Someone shared a packing list with you. Joining adds it to your
          sidebar and keeps it in sync as long as you both have the app open.
        </p>
        <div className="modal__actions">
          <button className="btn btn--ghost" onClick={onCancel}>
            Cancel
          </button>
          <button
            className="btn btn--primary"
            onClick={() => onJoin(sessionId)}
          >
            Join
          </button>
        </div>
      </div>
    </div>
  );
}
