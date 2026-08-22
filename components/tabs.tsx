"use client";

import { useState, type ReactNode } from "react";

export function Tabs({
  tabs,
  defaultTabId,
}: {
  tabs: { id: string; label: string; content: ReactNode }[];
  defaultTabId?: string;
}) {
  const initialTabId = defaultTabId && tabs.some((tab) => tab.id === defaultTabId) ? defaultTabId : tabs[0]?.id;
  const [active, setActive] = useState(initialTabId);

  return (
    <div>
      <div className="flex gap-1 overflow-x-auto border-b border-stone-200 bg-white px-8 print:hidden">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActive(tab.id)}
            className={`shrink-0 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
              active === tab.id
                ? "border-charcoal text-charcoal"
                : "border-transparent text-stone-500 hover:text-stone-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {tabs.map((tab) => (
        <div key={tab.id} hidden={active !== tab.id}>
          {tab.content}
        </div>
      ))}
    </div>
  );
}
