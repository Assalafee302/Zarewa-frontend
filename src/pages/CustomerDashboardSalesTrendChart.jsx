import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';

/**
 * Lazy-loaded chart component to defer recharts (380 KB) until needed.
 * Only imported in CustomerDashboard when chart is in view.
 */
export function CustomerDashboardSalesTrendChart({
  trendData,
  salesTrendAxisTick,
  salesTrendTooltipVolume,
}) {
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={trendData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="cdSalesFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-zarewa-teal)" stopOpacity={0.2} />
              <stop offset="100%" stopColor="var(--color-zarewa-teal)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#94a3b8' }} />
          <YAxis
            tick={{ fontSize: 10, fill: '#94a3b8' }}
            tickFormatter={salesTrendAxisTick}
          />
          <Tooltip
            formatter={salesTrendTooltipVolume}
            labelFormatter={(_, payload) => {
              const row = payload?.[0]?.payload;
              if (row?.monthKey) {
                const yy = String(row.monthKey).slice(0, 4);
                return `${row.month} ${yy}`;
              }
              return String(_ ?? '');
            }}
            contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0' }}
          />
          <Area
            type="monotone"
            dataKey="amountM"
            stroke="var(--color-zarewa-teal)"
            strokeWidth={2}
            fill="url(#cdSalesFill)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
