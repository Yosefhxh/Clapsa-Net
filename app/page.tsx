"use client";

import { DashboardHeader } from "./components/home/DashboardHeader";
import { StatisticsGrid } from "./components/home/StatisticsGrid";
import { RecentOperationsSection } from "./components/home/RecentOperationsSection";

export default function Home() {
  return (
    <div>
      <DashboardHeader />
      <StatisticsGrid />
      <RecentOperationsSection />
    </div>
  );
}