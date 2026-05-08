// components/Sidebar.tsx
"use client";

import { SidebarHeader } from "./sidebar/SidebarHeader";
import { SidebarMenuContent } from "./sidebar/SidebarMenuContent";

export function Sidebar() {
  return (
    <div className="flex h-screen w-64 flex-col bg-[#242B83] text-white shadow-lg">
      <SidebarHeader />
      <SidebarMenuContent />
    </div>
  );
}