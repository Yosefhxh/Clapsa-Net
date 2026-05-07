// components/Sidebar.tsx
"use client";

import { SidebarHeader } from "./sidebar/SidebarHeader";
import { SidebarMenuContent } from "./sidebar/SidebarMenuContent";

export function Sidebar() {
  return (
    <div className="flex flex-col h-full bg-[#242B83] w-64 text-white shadow-lg">
      <SidebarHeader />
      <SidebarMenuContent />
    </div>
  );
}