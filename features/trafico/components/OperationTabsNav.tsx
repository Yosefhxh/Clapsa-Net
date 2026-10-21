"use client";

import { tabs, OperationTabId } from "@/features/trafico/types/trafico-types";

export interface OperationTabsNavProps {
  activeTab: OperationTabId;
  onTabChange: (tab: OperationTabId) => void;
}

export function OperationTabsNav({ activeTab, onTabChange }: OperationTabsNavProps) {
  return (
    <nav className="bg-white border border-slate-100 rounded-xl shadow-sm p-2 overflow-x-auto">
      <ul className="flex items-center gap-2 min-w-max">
        {tabs.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <li key={tab.id}>
              <button
                type="button"
                onClick={() => onTabChange(tab.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? "bg-aduanaBlue text-white"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                }`}
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
