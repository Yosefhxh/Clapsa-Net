"use client";

import { DashboardHeader } from "@/features/home/components/DashboardHeader";
import { StatisticsGrid } from "@/features/home/components/StatisticsGrid";
import { RecentOperationsSection } from "@/features/home/components/RecentOperationsSection";

export default function Home() {
  return (
    <div>
      <DashboardHeader />
      <StatisticsGrid />
      <RecentOperationsSection />
    </div>
  );
}