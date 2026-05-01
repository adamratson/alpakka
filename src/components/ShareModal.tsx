import { useState } from "react";
import { useEscapeKey } from "../hooks/useEscapeKey";

interface ShareModalProps {
  listTitle: string;
  sessionId: string;
  onClose: () => void;
}

export default function ShareModal({ listTitle, sessionId, onClose }: ShareModalProps) {
  const [copied, setCopied] = useState(false);
  useEscapeKey(onClose);

  const url = `${window.location.origin}${window.location.pathname}#join=${encodeURIComponent(
    sessionId
  )}`;

  function copyLink() {
    navigator.clipboard.writeText(url).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      },
      () => {
        // No clipboard permission; the input is already selectable.
      }
    );
  }

  return (
    // Backdrop click-to-dismiss is a mouse convenience; keyboard users dismiss
    // via Escape (handled by useEscapeKey above), so the missing keydown
    // handler on this <div> is intentional.
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-modal-title"
      >
        <h2 id="share-modal-title" className="modal__title">Share "{listTitle}"</h2>
        <p className="modal__body">
          Send this link to anyone you want to share the list with. They'll
          stay in sync as long as you both have the app open.
        </p>
        <div className="modal__field">
          <input
            className="modal__input"
            readOnly
            value={url}
            onFocus={(e) => e.currentTarget.select()}
            aria-label="Shareable join link"
            data-testid="share-url"
          />
          <button className="btn btn--ghost" onClick={copyLink}>
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
        <p className="modal__body modal__body--hint">
          The link stays valid; you can close this dialog and reopen it later.
        </p>
        <div className="modal__actions">
          <button className="btn btn--primary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
