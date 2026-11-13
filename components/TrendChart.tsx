"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Point = { day: number; total: number };

export default function TrendChart({
  data,
  budget,
}: {
  data: Point[];
  budget: number;
}) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="amberFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ffc83d" stopOpacity={0.45} />
              <stop offset="100%" stopColor="#ffc83d" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#1f2733" vertical={false} />
          <XAxis dataKey="day" stroke="#7d8696" tickLine={false} axisLine={false} fontSize={11} />
          <YAxis
            stroke="#7d8696"
            tickLine={false}
            axisLine={false}
            fontSize={11}
            width={48}
            tickFormatter={(v: number) => `${Math.round(v / 1000)}k`}
          />
          <ReferenceLine
            y={budget}
            stroke="#ff5d5d"
            strokeDasharray="4 4"
            label={{ value: "Presupuesto", fill: "#ff5d5d", fontSize: 11, position: "insideTopLeft" }}
          />
          <Tooltip
            contentStyle={{
              background: "#0e1117",
              border: "1px solid #1f2733",
              borderRadius: 8,
              color: "#e6e8ec",
            }}
            formatter={(v) => [`$${Number(v).toLocaleString("es-MX")}`, "Acumulado"]}
            labelFormatter={(d) => `Día ${d}`}
          />
          <Area
            type="monotone"
            dataKey="total"
            stroke="#ffc83d"
            strokeWidth={2}
            fill="url(#amberFill)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
