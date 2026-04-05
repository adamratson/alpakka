import type { KitItem, KitSection } from "../data";

export interface ImportResult {
  sections: KitSection[];
  days: number;
  listTitle: string;
}

export function importFromJson(file: File): Promise<ImportResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const raw = JSON.parse(e.target?.result as string);

        if (!Array.isArray(raw?.sections)) {
          throw new Error("Invalid format: missing sections array");
        }

        const sections: KitSection[] = raw.sections.map((s: unknown, si: number) => {
          const section = s as Record<string, unknown>;
          if (typeof section.id !== "string" || typeof section.title !== "string") {
            throw new Error(`Section ${si + 1} is missing id or title`);
          }
          if (!Array.isArray(section.items)) {
            throw new Error(`Section "${section.title}" is missing items array`);
          }
          const items: KitItem[] = section.items.map((it: unknown, ii: number) => {
            const item = it as Record<string, unknown>;
            if (typeof item.id !== "string" || typeof item.title !== "string") {
              throw new Error(`Item ${ii + 1} in "${section.title}" is missing id or title`);
            }
            return {
              id: item.id,
              title: item.title,
              quantity: typeof item.quantity === "number" ? item.quantity : 1,
              perDay: item.perDay === true,
              description: typeof item.description === "string" ? item.description : "",
              checked: item.checked === true,
            };
          });
          return { id: section.id, title: section.title, items };
        });

        const days = typeof raw.tripDays === "number" && raw.tripDays >= 1
          ? raw.tripDays
          : 7;

        const listTitle = typeof raw.listTitle === "string" && raw.listTitle.trim()
          ? raw.listTitle.trim()
          : "Bikepacking kit list";

        resolve({ sections, days, listTitle });
      } catch (err) {
        reject(err instanceof Error ? err : new Error("Failed to parse file"));
      }
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsText(file);
  });
}

export function exportToJson(sections: KitSection[], days: number, listTitle: string) {
  const data = {
    exportedAt: new Date().toISOString(),
    listTitle,
    tripDays: days,
    sections: sections.map((s) => ({
      id: s.id,
      title: s.title,
      items: s.items.map((item) => ({
        id: item.id,
        title: item.title,
        quantity: item.quantity,
        perDay: item.perDay,
        totalQuantity: item.perDay ? item.quantity * days : item.quantity,
        description: item.description,
        checked: item.checked,
      })),
    })),
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "bikepacking-kit.json";
  a.click();
  URL.revokeObjectURL(url);
}
