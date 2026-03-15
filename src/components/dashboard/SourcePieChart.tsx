"use client";

import {
  Pie,
  PieChart,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type SourceItem = {
  source: string;
  count: number;
};

type SourcePieChartProps = {
  data: SourceItem[];
};

const PIE_COLORS = ["#2563eb", "#0891b2", "#16a34a", "#f59e0b", "#db2777", "#7c3aed"];

function sourceLabel(source: string): string {
  return source.charAt(0).toUpperCase() + source.slice(1);
}

export function SourcePieChart({ data }: SourcePieChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Contact Source</CardTitle>
        <CardDescription>Distribution by source channel</CardDescription>
      </CardHeader>
      <CardContent className="h-[320px]">
        {data.length === 0 ? (
          <div className="h-full rounded-md border border-dashed flex items-center justify-center text-sm text-muted-foreground">
            No source data
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="count"
                nameKey="source"
                innerRadius={62}
                outerRadius={96}
                paddingAngle={2}
              >
                {data.map((entry, index) => (
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
  );
}
