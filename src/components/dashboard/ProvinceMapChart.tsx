"use client";

import { useMemo, useState } from "react";
import { geoBounds } from "d3-geo";
import {
  ComposableMap,
  Geographies,
  Geography,
  ZoomableGroup,
} from "react-simple-maps";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type ProvinceItem = {
  province: string;
  count: number;
};

type ProvinceMapChartProps = {
  data: ProvinceItem[];
};

type GeoFeature = {
  rsmKey: string;
  properties: {
    shapeName?: string;
  };
};

const VIETNAM_MAINLAND_GEO_URL = "/maps/vn-adm1.geojson";
const VIETNAM_ISLANDS_GEO_URL = "/maps/vn-islands.geojson";
const MAP_CENTER = [106, 16] as [number, number];
const MAP_PROJECTION_CONFIG = {
  center: MAP_CENTER,
  scale: 1800,
};

function repairVietnameseMojibake(value: string): string {
  // GeoJSON labels may be saved with broken UTF-8 (e.g. "ThÃ¡i NguyÃªn").
  if (!/(Ã|Â|Æ|Ä|á»|�)/.test(value)) {
    return value;
  }

  try {
    const repaired = Buffer.from(value, "latin1").toString("utf8");
    return repaired.includes("�") ? value : repaired;
  } catch {
    return value;
  }
}

function normalizeProvinceName(value: string): string {
  return repairVietnameseMojibake(value)
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

function shouldRenderMainlandGeography(
  geo: unknown,
  normalizedProvinceName: string
): boolean {
  // Some ADM1 files embed remote archipelago polygons inside Da Nang/Khanh Hoa.
  // Keep those in the dedicated islands layer to avoid confusing hover labels.
  if (normalizedProvinceName !== "da nang" && normalizedProvinceName !== "khanh hoa") {
    return true;
  }

  const [[minLon], [maxLon]] = geoBounds(geo as any);
  // Mainland parts of these provinces stay west of ~110E.
  const isRemoteOffshore = minLon > 110 || maxLon > 110.2;
  return !isRemoteOffshore;
}

export function ProvinceMapChart({ data }: ProvinceMapChartProps) {
  const [zoom, setZoom] = useState(1);

  const maxProvinceCount = data.reduce((max, item) => Math.max(max, item.count), 0);

  const provinceCountMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of data) {
      map.set(normalizeProvinceName(item.province), item.count);
    }
    return map;
  }, [data]);

  const totalProvinceContacts = data.reduce((sum, item) => sum + item.count, 0);

  const topProvinces = [...data].sort((a, b) => b.count - a.count).slice(0, 5);

  return (
    <Card className="xl:col-span-3">
      <CardHeader>
        <CardTitle>Customer Density by City/Province</CardTitle>
        <CardDescription>
          Choropleth map from contact address distribution
        </CardDescription>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
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
                    center={MAP_CENTER}
                    zoom={zoom}
                    minZoom={0.9}
                    maxZoom={6}
                  >
                    <Geographies geography={VIETNAM_MAINLAND_GEO_URL}>
                      {({ geographies }) =>
                        geographies.map((geo) => {
                          const feature = geo as unknown as GeoFeature;
                          const provinceName = repairVietnameseMojibake(
                            feature.properties.shapeName ?? ""
                          );
                          const normalized = normalizeProvinceName(provinceName);

                          if (!shouldRenderMainlandGeography(geo, normalized)) {
                            return null;
                          }

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

                    <Geographies geography={VIETNAM_ISLANDS_GEO_URL}>
                      {({ geographies }) =>
                        geographies.map((geo) => {
                          const feature = geo as unknown as GeoFeature;
                          const provinceName = repairVietnameseMojibake(
                            feature.properties.shapeName ?? ""
                          );
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
  );
}
