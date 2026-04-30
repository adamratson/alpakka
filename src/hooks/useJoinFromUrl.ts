import { useEffect, useState } from "react";

function readJoinFromHash(): string | null {
  const m = window.location.hash.match(/^#join=(.+)$/);
  return m ? decodeURIComponent(m[1]) : null;
}

export function useJoinFromUrl(): [string | null, (id: string | null) => void] {
  const [joinSessionId, setJoinSessionId] = useState<string | null>(readJoinFromHash);

  // Strip the join fragment once we've captured it.
  useEffect(() => {
    if (joinSessionId) {
      history.replaceState(null, "", window.location.pathname + window.location.search);
    }
  }, [joinSessionId]);

  // Catch hash navigation in already-open tabs.
  useEffect(() => {
    const handler = () => {
      const next = readJoinFromHash();
      if (next) setJoinSessionId(next);
    };
    window.addEventListener("hashchange", handler);
    return () => window.removeEventListener("hashchange", handler);
  }, []);

  return [joinSessionId, setJoinSessionId];
}
