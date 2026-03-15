"use client";

import { useMemo, useState } from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
  ZoomableGroup,
} from "react-simple-maps";
import {
  Line,
  LineChart,
  Pie,
  PieChart,
  Cell,
  CartesianGrid,
  Tooltip,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

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

type GeoFeature = {
  rsmKey: string;
  properties: {
    shapeName?: string;
  };
};

const PIE_COLORS = ["#2563eb", "#0891b2", "#16a34a", "#f59e0b", "#db2777", "#7c3aed"];
const VIETNAM_GEO_URL = "/maps/vn-adm1.geojson";
const MAP_PROJECTION_CONFIG = {
  center: [108, 16] as [number, number],
  scale: 1400,
};

function formatMonthLabel(value: string): string {
  const [yearText, monthText] = value.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  if (!year || !month) return value;

  return new Date(Date.UTC(year, month - 1, 1)).toLocaleString("en-US", {
    month: "short",
    year: "2-digit",
  });
}

function sourceLabel(source: string): string {
  return source.charAt(0).toUpperCase() + source.slice(1);
}

function normalizeProvinceName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase()
    .replace(/^(thanh pho|tp\.?|tinh|province|city)\s+/g, "")
    .replace(/[-–—_/.,]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getProvinceFill(count: number, maxCount: number): string {
  if (count <= 0 || maxCount <= 0) {
    return "hsl(225 35% 92%)";
  }

  const ratio = count / maxCount;
  const lightness = 90 - ratio * 42;
  return `hsl(228 72% ${lightness}%)`;
}

export function DashboardCharts({
  monthlyGrowth,
  sourceDistribution,
  provinceDensity,
}: DashboardChartsProps) {
  const [zoom, setZoom] = useState(1);

  const maxProvinceCount = provinceDensity.reduce(
    (max, item) => Math.max(max, item.count),
    0
  );

  const provinceCountMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of provinceDensity) {
      map.set(normalizeProvinceName(item.province), item.count);
    }
    return map;
  }, [provinceDensity]);

  const totalProvinceContacts = provinceDensity.reduce(
    (sum, item) => sum + item.count,
    0
  );

  const topProvinces = [...provinceDensity].sort((a, b) => b.count - a.count).slice(0, 5);

  return (
    <div className="grid gap-4 xl:grid-cols-3">
      <Card className="xl:col-span-2">
        <CardHeader>
          <CardTitle>Customer Growth by Month</CardTitle>
          <CardDescription>New contacts added each month</CardDescription>
        </CardHeader>
        <CardContent className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={monthlyGrowth}
              margin={{ top: 8, right: 16, left: 0, bottom: 8 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="month"
                tickFormatter={formatMonthLabel}
                tick={{ fontSize: 12 }}
                stroke="hsl(var(--muted-foreground))"
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 12 }}
                stroke="hsl(var(--muted-foreground))"
              />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="count"
                stroke="#2563eb"
                strokeWidth={3}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contact Source</CardTitle>
          <CardDescription>Distribution by source channel</CardDescription>
        </CardHeader>
        <CardContent className="h-[320px]">
          {sourceDistribution.length === 0 ? (
            <div className="h-full rounded-md border border-dashed flex items-center justify-center text-sm text-muted-foreground">
              No source data
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={sourceDistribution}
                  dataKey="count"
                  nameKey="source"
                  innerRadius={62}
                  outerRadius={96}
                  paddingAngle={2}
                >
                  {sourceDistribution.map((entry, index) => (
                    <Cell
                      key={`${entry.source}-${index}`}
                      fill={PIE_COLORS[index % PIE_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
                <Legend
                  formatter={(value) => sourceLabel(String(value))}
                  wrapperStyle={{ fontSize: "12px" }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card className="xl:col-span-3">
        <CardHeader>
          <CardTitle>Customer Density by City/Province</CardTitle>
          <CardDescription>
            Choropleth map from contact address distribution
          </CardDescription>
        </CardHeader>
        <CardContent>
          {provinceDensity.length === 0 ? (
            <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
              No address data to map yet
            </div>
          ) : (
            <div className="space-y-5">
              <div className="relative rounded-lg border bg-muted/15 p-2 sm:p-3">
                <div className="absolute left-2 top-2 bottom-2 z-10 hidden sm:flex flex-col justify-between text-xs text-muted-foreground">
                  <span>{maxProvinceCount}</span>
                  <div className="h-40 w-3 rounded bg-gradient-to-b from-blue-600 to-blue-100 border" />
                  <span>0</span>
                </div>

                <div className="h-[420px] w-full">
                  <ComposableMap
                    projection="geoMercator"
                    projectionConfig={MAP_PROJECTION_CONFIG}
                    width={920}
                    height={780}
                    style={{ width: "100%", height: "100%" }}
                  >
                    <ZoomableGroup
                      center={[108, 16]}
                      zoom={zoom}
                      minZoom={1}
                      maxZoom={6}
                    >
                      <Geographies geography={VIETNAM_GEO_URL}>
                        {({ geographies }) =>
                          geographies.map((geo) => {
                            const feature = geo as unknown as GeoFeature;
                            const provinceName = feature.properties.shapeName ?? "";
                            const normalized = normalizeProvinceName(provinceName);
                            const count = provinceCountMap.get(normalized) ?? 0;

                            return (
                              <Geography
                                key={feature.rsmKey}
                                geography={geo}
                                style={{
                                  default: {
                                    fill: getProvinceFill(count, maxProvinceCount),
                                    stroke: "hsl(220 12% 78%)",
                                    strokeWidth: 0.85,
                                    outline: "none",
                                  },
                                  hover: {
                                    fill: "hsl(228 86% 58%)",
                                    stroke: "hsl(220 14% 62%)",
                                    strokeWidth: 1,
                                    outline: "none",
                                  },
                                  pressed: {
                                    fill: "hsl(228 86% 52%)",
                                    outline: "none",
                                  },
                                }}
                              >
                                <title>
                                  {provinceName}: {count} contact{count !== 1 ? "s" : ""}
                                </title>
                              </Geography>
                            );
                          })
                        }
                      </Geographies>
                    </ZoomableGroup>
                  </ComposableMap>
                </div>

                <div className="absolute right-3 bottom-3 flex flex-col overflow-hidden rounded-md border bg-background shadow-sm">
                  <button
                    type="button"
                    className="h-9 w-9 text-lg font-semibold hover:bg-muted"
                    onClick={() => setZoom((z) => Math.min(6, Number((z + 0.5).toFixed(1))))}
                    aria-label="Zoom in map"
                  >
                    +
                  </button>
                  <button
                    type="button"
                    className="h-9 w-9 text-xl font-semibold border-t hover:bg-muted"
                    onClick={() => setZoom((z) => Math.max(1, Number((z - 0.5).toFixed(1))))}
                    aria-label="Zoom out map"
                  >
                    -
                  </button>
                </div>
              </div>

              <div className="space-y-3 border-t pt-4">
                {topProvinces.map((item, index) => {
                  const percentage =
                    totalProvinceContacts > 0
                      ? Math.round((item.count / totalProvinceContacts) * 100)
                      : 0;

                  return (
                    <div key={item.province} className="grid grid-cols-[1fr_auto_auto_1fr] items-center gap-3 text-sm">
                      <p className="font-medium text-foreground truncate">
                        {index + 1}. {item.province}
                      </p>
                      <p className="font-semibold text-foreground min-w-6 text-right">{item.count}</p>
                      <p className="text-muted-foreground min-w-10 text-right">{percentage}%</p>
                      <div className="h-3 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-blue-600"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
