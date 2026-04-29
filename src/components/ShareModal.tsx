import { useState } from "react";

interface ShareModalProps {
  listTitle: string;
  sessionId: string;
  onClose: () => void;
}

export default function ShareModal({ listTitle, sessionId, onClose }: ShareModalProps) {
  const [copied, setCopied] = useState(false);

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
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal__title">Share "{listTitle}"</h2>
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
