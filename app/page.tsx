"use client";

import {
  DashboardHeader,
  StatisticsGrid,
  RecentOperationsSection,
} from "@/features/home";

export default function Home() {
  return (
    <div>
      <DashboardHeader />
      <StatisticsGrid />
      <RecentOperationsSection />
    </div>
  );
}