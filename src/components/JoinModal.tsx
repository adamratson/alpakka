import { useEffect, useRef, useState } from "react";
import { createJoinerSession, type JoinerSession } from "../collab/peer";
import { decodeOffer } from "../collab/signaling";

interface JoinModalProps {
  encodedOffer: string;
  onConnected: (session: JoinerSession) => void;
  onCancel: () => void;
}

type Stage =
  | { type: "prompt"; listTitle: string }
  | { type: "preparing" }
  | { type: "ready"; session: JoinerSession }
  | { type: "connected" }
  | { type: "error"; message: string };

export default function JoinModal({ encodedOffer, onConnected, onCancel }: JoinModalProps) {
  const [stage, setStage] = useState<Stage>(() => {
    try {
      return { type: "prompt", listTitle: decodeOffer(encodedOffer).listTitle };
    } catch (err) {
      return { type: "error", message: (err as Error).message };
    }
  });
  const [copied, setCopied] = useState(false);
  const sessionRef = useRef<JoinerSession | null>(null);
  const cancelledRef = useRef(false);
  const startedRef = useRef(false);
  // Tracks whether unmount should close the session. Goes false once we hand
  // the session off to the parent on connect — otherwise the cleanup fires
  // with a stale `stage` from closure and tears down a live connection.
  const ownsSessionRef = useRef(true);

  useEffect(() => {
    cancelledRef.current = false;
    return () => {
      cancelledRef.current = true;
      if (sessionRef.current && ownsSessionRef.current) {
        sessionRef.current.close();
      }
    };
  }, []);

  async function startJoin() {
    if (startedRef.current) return;
    startedRef.current = true;
    setStage({ type: "preparing" });
    try {
      const session = await createJoinerSession(encodedOffer);
      if (cancelledRef.current) {
        session.close();
        return;
      }
      sessionRef.current = session;
      setStage({ type: "ready", session });
      session.ready.then(() => {
        if (cancelledRef.current) return;
        ownsSessionRef.current = false;
        setStage({ type: "connected" });
        onConnected(session);
        setTimeout(onCancel, 800);
      });
    } catch (err) {
      if (cancelledRef.current) return;
      setStage({ type: "error", message: (err as Error).message });
    }
  }

  function copyAnswer() {
    if (stage.type !== "ready") return;
    navigator.clipboard.writeText(stage.session.encodedAnswer).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  function dismiss() {
    cancelledRef.current = true;
    if (sessionRef.current && ownsSessionRef.current) {
      sessionRef.current.close();
    }
    onCancel();
  }

  return (
    <div className="modal-backdrop" onClick={dismiss}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        {stage.type === "prompt" && (
          <>
            <h2 className="modal__title">Join packing list?</h2>
            <p className="modal__body">
              Someone wants to share <strong>"{stage.listTitle}"</strong> with you.
              Joining will add it to your sidebar and keep it in sync.
            </p>
            <div className="modal__actions">
              <button className="btn btn--ghost" onClick={dismiss}>
                Cancel
              </button>
              <button className="btn btn--primary" onClick={startJoin}>
                Join
              </button>
            </div>
          </>
        )}

        {stage.type === "preparing" && (
          <>
            <h2 className="modal__title">Preparing response…</h2>
            <p className="modal__body">Generating your response code.</p>
          </>
        )}

        {stage.type === "ready" && (
          <>
            <h2 className="modal__title">Send back this code</h2>
            <p className="modal__body">
              Copy this and send it to the person who shared the link:
            </p>
            <textarea
              className="modal__textarea"
              readOnly
              rows={4}
              value={stage.session.encodedAnswer}
              onFocus={(e) => e.currentTarget.select()}
            />
            <div className="modal__actions">
              <button className="btn btn--ghost" onClick={dismiss}>
                Cancel
              </button>
              <button className="btn btn--primary" onClick={copyAnswer}>
                {copied ? "Copied" : "Copy code"}
              </button>
            </div>
            <p className="modal__body modal__body--hint">
              Waiting for them to paste it back…
            </p>
          </>
        )}

        {stage.type === "connected" && (
          <>
            <h2 className="modal__title">Connected</h2>
            <p className="modal__body">Edits will sync live.</p>
          </>
        )}

        {stage.type === "error" && (
          <>
            <h2 className="modal__title">Couldn't join</h2>
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

