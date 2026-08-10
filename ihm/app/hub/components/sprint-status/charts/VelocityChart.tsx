/** Velocity Chart Component

Displays a deterministic velocity chart showing completed story points over time.
Uses Recharts to render the velocity chart from completed story data.
*/

"use client";

import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export interface VelocityDataPoint {
  sprintOrWeek: string;
  storyPointsCompleted: number;
  storiesCompleted: number;
}

export interface VelocityChartProps {
  data?: VelocityDataPoint[] | null;
}

const hasEnoughData = (data?: VelocityDataPoint[] | null): boolean => {
  if (!data || data.length < 2) {
    return false;
  }
  // Check if we have completed story points
  return data.some((point) => point.storyPointsCompleted > 0);
};

const EmptyState: React.FC = () => (
  <div className="flex h-64 w-full items-center justify-center rounded-md border border-border bg-surface">
    <p className="font-sans text-sm font-medium text-text-secondary">
      Not enough data yet
    </p>
  </div>
);

const CustomTooltip: React.FC<{ active?: boolean; payload?: any; label?: string }> = ({
  active,
  payload,
  label,
}) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="rounded-md border border-border bg-surface-elevated p-3 shadow-lg">
        <p className="font-mono tabular-nums text-sm font-semibold text-foreground">{label}</p>
        <p className="font-sans text-xs text-text-secondary">
          Story points: <span className="font-mono tabular-nums font-semibold text-foreground">{data.storyPointsCompleted}</span>
        </p>
        <p className="font-sans text-xs text-text-secondary">
          Stories completed: <span className="font-mono tabular-nums font-semibold text-foreground">{data.storiesCompleted}</span>
        </p>
      </div>
    );
  }
  return null;
};

export function VelocityChart({ data }: VelocityChartProps) {
  // Check if we have enough data to render the chart
  if (!hasEnoughData(data)) {
    return <EmptyState />;
  }

  // At this point, data is guaranteed to be a non-empty array
  const validData = data as VelocityDataPoint[];

  // Filter out data points with zero story points
  const chartData = validData
    .filter((point) => point.storyPointsCompleted >= 0)
    .map((point) => ({
      sprintOrWeek: point.sprintOrWeek,
      storyPointsCompleted: point.storyPointsCompleted,
      storiesCompleted: point.storiesCompleted,
    }));

  // Format date for X-axis
  const formatXAxisLabel = (label: string) => {
    // If it's a sprint name like "Sprint 42", keep it as is or truncate
    if (label.startsWith('Sprint')) {
      return label.length > 15 ? label.substring(0, 12) + '...' : label;
    }
    // If it's a date/week format, format it
    const date = new Date(label);
    if (!isNaN(date.getTime())) {
      return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    }
    return label;
  };

  return (
    <div className="flex flex-col gap-3">
      <h3 className="font-sans text-xs font-bold tracking-wider text-text-secondary uppercase">
        Velocity Chart
      </h3>
      <div className="rounded-md border border-border bg-surface p-4">
        <ResponsiveContainer width="100%" height={256}>
          <BarChart data={chartData} margin={{ top: 16, right: 16, left: 0, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#24314f" />
            <XAxis
              dataKey="sprintOrWeek"
              tickFormatter={formatXAxisLabel}
              stroke="#5f6d8f"
              tick={{ fill: '#5f6d8f', fontSize: 12, fontFamily: 'var(--font-mono)', fontWeight: 500 }}
              axisLine={{ stroke: '#24314f' }}
            />
            <YAxis
              stroke="#5f6d8f"
              tick={{ fill: '#5f6d8f', fontSize: 12, fontFamily: 'var(--font-mono)', fontWeight: 500 }}
              axisLine={{ stroke: '#24314f' }}
              label={{
                value: 'Story Points',
                angle: -90,
                position: 'insideLeft',
                fill: '#5f6d8f',
                fontSize: 12,
                fontFamily: 'var(--font-sans)',
              }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar
              dataKey="storyPointsCompleted"
              fill="#34d399"
              radius={[4, 4, 0, 0]}
              name="Story Points"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
