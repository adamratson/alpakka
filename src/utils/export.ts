import type { KitItem, KitSection, PackingList } from "../data";

export interface ImportResult {
  lists: PackingList[];
  activeListId: string;
}

export function importFromJson(file: File): Promise<ImportResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const raw = JSON.parse(e.target?.result as string);

        // Support both old and new formats
        let lists: PackingList[] = [];
        let activeListId: string;

        // New format: { lists: PackingList[], activeListId: string }
        if (Array.isArray(raw?.lists)) {
          lists = raw.lists.map((listRaw: unknown, li: number) => {
            const list = listRaw as Record<string, unknown>;
            if (typeof list.id !== "string" || typeof list.title !== "string") {
              throw new Error(`List ${li + 1} is missing id or title`);
            }
            if (!Array.isArray(list.sections)) {
              throw new Error(`List "${list.title}" is missing sections array`);
            }

            const sections: KitSection[] = (list.sections as unknown[]).map(
              (s: unknown, si: number) => {
                const section = s as Record<string, unknown>;
                if (typeof section.id !== "string" || typeof section.title !== "string") {
                  throw new Error(`Section ${si + 1} in "${list.title}" is missing id or title`);
                }
                if (!Array.isArray(section.items)) {
                  throw new Error(`Section "${section.title}" is missing items array`);
                }
                const items: KitItem[] = section.items.map((it: unknown, ii: number) => {
                  const item = it as Record<string, unknown>;
                  if (typeof item.id !== "string" || typeof item.title !== "string") {
                    throw new Error(
                      `Item ${ii + 1} in "${section.title}" is missing id or title`
                    );
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
              }
            );

            const days = typeof list.days === "number" && list.days >= 1 ? list.days : 7;

            return {
              id: list.id,
              title: list.title,
              sections,
              days,
            };
          });

          activeListId =
            typeof raw.activeListId === "string" ? raw.activeListId : lists[0]?.id || "";
        } else if (Array.isArray(raw?.sections)) {
          // Old format: single list structure, migrate to new format
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
                throw new Error(
                  `Item ${ii + 1} in "${section.title}" is missing id or title`
                );
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

          const days =
            typeof raw.tripDays === "number" && raw.tripDays >= 1 ? raw.tripDays : 7;

          const title =
            typeof raw.listTitle === "string" && raw.listTitle.trim()
              ? raw.listTitle.trim()
              : "Bikepacking kit list";

          const listId = `list-${Date.now()}`;
          lists = [{ id: listId, title, sections, days }];
          activeListId = listId;
        } else {
          throw new Error("Invalid format: missing sections or lists array");
        }

        resolve({ lists, activeListId });
      } catch (err) {
        reject(err instanceof Error ? err : new Error("Failed to parse file"));
      }
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsText(file);
  });
}

export function exportToJson(lists: PackingList[], activeListId: string) {
  const data = {
    exportedAt: new Date().toISOString(),
    activeListId,
    lists: lists.map((list) => ({
      id: list.id,
      title: list.title,
      days: list.days,
      sections: list.sections.map((s) => ({
        id: s.id,
        title: s.title,
        items: s.items.map((item) => ({
          id: item.id,
          title: item.title,
          quantity: item.quantity,
          perDay: item.perDay,
          totalQuantity: item.perDay ? item.quantity * list.days : item.quantity,
          description: item.description,
          checked: item.checked,
        })),
      })),
    })),
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "alpakka-lists.json";
  a.click();
  URL.revokeObjectURL(url);
}
