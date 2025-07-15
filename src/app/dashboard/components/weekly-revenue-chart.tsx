'use client';

import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

interface WeeklyRevenueChartProps {
    data: { day: string, revenue: number }[];
}

const chartConfig = {
  revenue: {
    label: "Ingresos",
    color: "hsl(var(--primary))",
  },
};

export function WeeklyRevenueChart({ data }: WeeklyRevenueChartProps) {
    return (
        <ChartContainer config={chartConfig} className="h-[250px] w-full">
            <BarChart accessibilityLayer data={data} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
            <CartesianGrid vertical={false} />
            <XAxis
                dataKey="day"
                tickLine={false}
                tickMargin={10}
                axisLine={false}
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
            />
            <YAxis
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => {
                    if (Number(value) >= 1000000) {
                        return `$${(Number(value) / 1000000).toFixed(1)}M`
                    }
                    if (Number(value) >= 1000) {
                        return `$${(Number(value) / 1000).toFixed(0)}K`
                    }
                    return `$${value}`;
                }}
            />
            <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent 
                formatter={(value) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(Number(value))} 
                labelClassName="font-bold"
                indicator="dot"
                />}
            />
            <Bar
                dataKey="revenue"
                fill="hsl(var(--primary))"
                radius={[4, 4, 0, 0]}
            />
            </BarChart>
        </ChartContainer>
    )
}
