interface JoinModalProps {
  sessionId: string;
  onJoin: (sessionId: string) => void;
  onCancel: () => void;
}

export default function JoinModal({ sessionId, onJoin, onCancel }: JoinModalProps) {
  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal__title">Join shared packing list?</h2>
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
