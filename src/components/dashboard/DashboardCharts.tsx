"use client";

import { GrowthLineChart } from "@/components/dashboard/GrowthLineChart";
import { SourcePieChart } from "@/components/dashboard/SourcePieChart";
import { ProvinceMapChart } from "@/components/dashboard/ProvinceMapChart";

type MonthlyGrowthItem = {
  month: string;
  count: number;
};

type SourceItem = {
  source: string;
  count: number;
};

type ProvinceItem = {
  province: string;
  count: number;
};

interface DashboardChartsProps {
  monthlyGrowth: MonthlyGrowthItem[];
  sourceDistribution: SourceItem[];
  provinceDensity: ProvinceItem[];
}

export function DashboardCharts({
  monthlyGrowth,
  sourceDistribution,
  provinceDensity,
}: DashboardChartsProps) {
  return (
    <div className="grid gap-4 xl:grid-cols-3">
      <GrowthLineChart data={monthlyGrowth} />
      <SourcePieChart data={sourceDistribution} />
      <ProvinceMapChart data={provinceDensity} />
    </div>
  );
}
