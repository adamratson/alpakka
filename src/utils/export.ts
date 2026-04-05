import type { KitSection } from "../data";

export function exportToJson(sections: KitSection[], days: number) {
  const data = {
    exportedAt: new Date().toISOString(),
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
