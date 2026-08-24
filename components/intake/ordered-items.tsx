import type { ReactNode } from "react";

// Reorders a set of field items to match the clinic's admin-configured order
// (Settings → Form Content), falling back to each item's position in the
// array as given (the registry's default order) when it isn't mentioned in
// `order` at all. Shared by every standardized form's tab component.
export function orderedItems<T extends { key: string }>(order: string[], items: T[]) {
  const known = new Set(items.map((i) => i.key));
  const indexOf = new Map(order.filter((k) => known.has(k)).map((k, i) => [k, i]));
  return [...items].sort((a, b) => (indexOf.get(a.key) ?? 0) - (indexOf.get(b.key) ?? 0));
}

export function OrderedGrid({
  order,
  items,
  cols = 2,
}: {
  order: string[];
  items: { key: string; el: ReactNode; span?: 2 }[];
  cols?: 1 | 2 | 3;
}) {
  const colsClass = cols === 3 ? "sm:grid-cols-3" : cols === 2 ? "sm:grid-cols-2" : "";
  return (
    <div className={`grid grid-cols-1 gap-4 ${colsClass}`}>
      {orderedItems(order, items).map((item) => (
        <div key={item.key} className={item.span === 2 ? "sm:col-span-2" : undefined}>
          {item.el}
        </div>
      ))}
    </div>
  );
}

// Vertical-stack variant, for forms whose fields render as a single column
// of question blocks (HRA, CNA, CCN) rather than a grid.
export function OrderedStack({
  order,
  items,
  gap = "space-y-6",
}: {
  order: string[];
  items: { key: string; el: ReactNode }[];
  gap?: string;
}) {
  return (
    <div className={gap}>
      {orderedItems(order, items).map((item) => (
        <div key={item.key}>{item.el}</div>
      ))}
    </div>
  );
}
