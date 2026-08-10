/** Burn-Down Chart Component

Displays a deterministic burn-down chart showing sprint progress over time.
Uses Recharts to render the burn-down chart from sprint data.
*/

"use client";

import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export interface BurnDownDataPoint {
  date: string;
  storiesRemaining: number;
  idealRemaining: number;
}

export interface BurnDownChartProps {
  data?: BurnDownDataPoint[] | null;
  sprintStartDate?: string;
  sprintEndDate?: string;
  totalStories?: number;
}

const hasEnoughData = (data?: BurnDownDataPoint[] | null): boolean => {
  if (!data || data.length < 2) {
    return false;
  }
  // Check if we have at least one completed story or data showing progress
  return data.some((point) => point.storiesRemaining < (data[0]?.storiesRemaining || 0)) ||
         data.length >= 3;
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
    return (
      <div className="rounded-md border border-border bg-surface-elevated p-3 shadow-lg">
        <p className="font-mono tabular-nums text-sm font-semibold text-foreground">{label}</p>
        <p className="font-sans text-xs text-text-secondary">
          Stories remaining: <span className="font-mono tabular-nums font-semibold text-foreground">{payload[0].value}</span>
        </p>
        <p className="font-sans text-xs text-text-secondary">
          Ideal: <span className="font-mono tabular-nums font-semibold text-foreground">{payload[1]?.value ?? 0}</span>
        </p>
      </div>
    );
  }
  return null;
};

export function BurnDownChart({
  data,
  sprintStartDate,
  sprintEndDate,
  totalStories = 0,
}: BurnDownChartProps) {
  // Check if we have enough data to render the chart
  if (!hasEnoughData(data)) {
    return <EmptyState />;
  }

  // At this point, data is guaranteed to be a non-empty array
  const validData = data as BurnDownDataPoint[];

  // Calculate ideal burn-down line
  const calculateIdealRemaining = (dayIndex: number, totalDays: number): number => {
    if (totalStories === 0 || totalDays === 0) return 0;
    const progressRatio = dayIndex / totalDays;
    return Math.max(0, Math.round(totalStories - totalStories * progressRatio));
  };

  const chartData = validData.map((point, index) => {
    const totalDays = validData.length > 1 ? validData.length - 1 : 1;
    const ideal = calculateIdealRemaining(index, totalDays);
    return {
      date: point.date,
      storiesRemaining: point.storiesRemaining,
      idealRemaining: ideal,
    };
  });

  // Format date for X-axis
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="flex flex-col gap-3">
      <h3 className="font-sans text-xs font-bold tracking-wider text-text-secondary uppercase">
        Burn-Down Chart
      </h3>
      <div className="rounded-md border border-border bg-surface p-4">
        <ResponsiveContainer width="100%" height={256}>
          <LineChart data={chartData} margin={{ top: 16, right: 16, left: 0, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#24314f" />
            <XAxis
              dataKey="date"
              tickFormatter={formatDate}
              stroke="#5f6d8f"
              tick={{ fill: '#5f6d8f', fontSize: 12, fontFamily: 'var(--font-mono)', fontWeight: 500 }}
              axisLine={{ stroke: '#24314f' }}
            />
            <YAxis
              stroke="#5f6d8f"
              tick={{ fill: '#5f6d8f', fontSize: 12, fontFamily: 'var(--font-mono)', fontWeight: 500 }}
              axisLine={{ stroke: '#24314f' }}
              label={{
                value: 'Stories Remaining',
                angle: -90,
                position: 'insideLeft',
                fill: '#5f6d8f',
                fontSize: 12,
                fontFamily: 'var(--font-sans)',
              }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="storiesRemaining"
              stroke="#8b8cf8"
              strokeWidth={2}
              dot={{ fill: '#8b8cf8', stroke: '#0A1120', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, fill: '#8b8cf8', stroke: '#0A1120', strokeWidth: 2 }}
              name="Stories Remaining"
            />
            <Line
              type="monotone"
              dataKey="idealRemaining"
              stroke="#38bdf8"
              strokeWidth={1}
              strokeDasharray="5 5"
              dot={false}
              name="Ideal"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
