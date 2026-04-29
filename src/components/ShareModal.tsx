import { useEffect, useRef, useState } from "react";
import { createHostSession, type HostSession } from "../collab/peer";

interface ShareModalProps {
  listTitle: string;
  onConnected: (session: HostSession) => void;
  onCancel: () => void;
}

type Stage =
  | { type: "preparing" }
  | { type: "ready"; url: string; session: HostSession }
  | { type: "applying" }
  | { type: "connected" }
  | { type: "error"; message: string };

export default function ShareModal({ listTitle, onConnected, onCancel }: ShareModalProps) {
  const [stage, setStage] = useState<Stage>({ type: "preparing" });
  const [answer, setAnswer] = useState("");
  const [copied, setCopied] = useState(false);
  const sessionRef = useRef<HostSession | null>(null);
  const cancelledRef = useRef(false);
  const startedRef = useRef(false);

  useEffect(() => {
    cancelledRef.current = false;
    if (startedRef.current) return () => { cancelledRef.current = true; };
    startedRef.current = true;
    let cleanupChannel: (() => void) | null = null;
    createHostSession(listTitle)
      .then((session) => {
        if (cancelledRef.current) {
          session.close();
          return;
        }
        sessionRef.current = session;
        const url = `${window.location.origin}${window.location.pathname}#join=${session.encodedOffer}`;
        setStage({ type: "ready", url, session });
        session.ready.then(() => {
          if (cancelledRef.current) return;
          setStage({ type: "connected" });
          onConnected(session);
          const timer = setTimeout(onCancel, 800);
          cleanupChannel = () => clearTimeout(timer);
        });
      })
      .catch((err: Error) => {
        if (cancelledRef.current) return;
        setStage({ type: "error", message: err.message });
      });

    return () => {
      cancelledRef.current = true;
      cleanupChannel?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function applyAnswer() {
    const session = sessionRef.current;
    if (!session) return;
    setStage({ type: "applying" });
    try {
      await session.acceptAnswer(answer.trim());
    } catch (err) {
      setStage({ type: "error", message: (err as Error).message });
    }
  }

  function copyLink() {
    if (stage.type !== "ready") return;
    navigator.clipboard.writeText(stage.url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  function dismiss() {
    cancelledRef.current = true;
    if (stage.type !== "connected" && sessionRef.current) {
      sessionRef.current.close();
    }
    onCancel();
  }

  return (
    <div className="modal-backdrop" onClick={dismiss}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal__title">Share "{listTitle}"</h2>

        {stage.type === "preparing" && (
          <p className="modal__body">Preparing invite link…</p>
        )}

        {stage.type === "ready" && (
          <>
            <p className="modal__body">
              <strong>1.</strong> Send this link to the other person:
            </p>
            <div className="modal__field">
              <input
                className="modal__input"
                readOnly
                value={stage.url}
                onFocus={(e) => e.currentTarget.select()}
              />
              <button className="btn btn--ghost" onClick={copyLink}>
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <p className="modal__body">
              <strong>2.</strong> They'll send back a code. Paste it here:
            </p>
            <textarea
              className="modal__textarea"
              placeholder="Paste the response code here"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              rows={4}
            />
            <div className="modal__actions">
              <button className="btn btn--ghost" onClick={dismiss}>
                Cancel
              </button>
              <button
                className="btn btn--primary"
                disabled={!answer.trim()}
                onClick={applyAnswer}
              >
                Connect
              </button>
            </div>
          </>
        )}

        {stage.type === "applying" && <p className="modal__body">Connecting…</p>}

        {stage.type === "connected" && (
          <p className="modal__body">Connected. Edits will sync live.</p>
        )}

        {stage.type === "error" && (
          <>
            <p className="modal__body modal__body--error">{stage.message}</p>
            <div className="modal__actions">
              <button className="btn btn--primary" onClick={dismiss}>
                Close
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
