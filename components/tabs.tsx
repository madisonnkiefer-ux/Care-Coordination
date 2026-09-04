"use client";

import { useState, type ReactNode } from "react";

export function Tabs({
  tabs,
  defaultTabId,
  layout = "horizontal",
}: {
  tabs: { id: string; label: string; content: ReactNode }[];
  defaultTabId?: string;
  layout?: "horizontal" | "vertical";
}) {
  const initialTabId = defaultTabId && tabs.some((tab) => tab.id === defaultTabId) ? defaultTabId : tabs[0]?.id;
  const [active, setActive] = useState(initialTabId);

  if (layout === "vertical") {
    return (
      <div className="flex flex-col sm:flex-row">
        <div className="flex shrink-0 gap-1 overflow-x-auto border-b border-stone-200 p-4 sm:w-56 sm:flex-col sm:overflow-visible sm:border-b-0 sm:border-r sm:p-6 print:hidden">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActive(tab.id)}
              className={`shrink-0 rounded-md px-3 py-2 text-left text-sm font-medium transition-colors ${
                active === tab.id ? "bg-stone-100 text-charcoal" : "text-stone-500 hover:bg-stone-50 hover:text-stone-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="min-w-0 flex-1">
          {tabs.map((tab) => (
            <div key={tab.id} hidden={active !== tab.id}>
              {tab.content}
            </div>
          ))}
        </div>
      </div>
    );
  }

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
