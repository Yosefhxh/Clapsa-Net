"use client";

import { tabs, OperationTabId } from "../types";

export interface OperationTabsNavProps {
  activeTab: OperationTabId;
  onTabChange: (tab: OperationTabId) => void;
}

export function OperationTabsNav({ activeTab, onTabChange }: OperationTabsNavProps) {
  return (
    <nav className="overflow-x-auto">
      <ul className="flex items-center gap-1 min-w-max">
        {tabs.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <li key={tab.id}>
              <button
                type="button"
                onClick={() => onTabChange(tab.id)}
                className={`clp-tab ${active ? "clp-tab-activa" : ""}`}
              >
                {tab.label}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
