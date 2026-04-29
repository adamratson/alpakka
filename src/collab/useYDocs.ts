import { useEffect, useState } from "react";
import * as Y from "yjs";

export function useYDocs(docs: Y.Doc[]): number {
  const [version, setVersion] = useState(0);
  useEffect(() => {
    const handler = () => setVersion((v) => v + 1);
    docs.forEach((d) => d.on("update", handler));
    return () => {
      docs.forEach((d) => d.off("update", handler));
    };
  }, [docs]);
  return version;
}
