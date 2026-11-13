// components/Sidebar.tsx
"use client";

import { SidebarMenuContent } from "./SidebarMenuContent";

export function Sidebar() {
  return (
    <div className="clp-nav flex w-full shrink-0 flex-col md:relative md:z-30 md:my-3 md:ml-4 md:w-[68px]">
      <SidebarMenuContent />
    </div>
  );
}