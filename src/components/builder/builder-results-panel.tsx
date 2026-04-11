import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  formatAxisCurrency,
  formatCurrency,
  getGreekMetrics,
  getSummaryMetrics,
} from "@/components/builder/builder-helpers";
import {
  BuilderMessage,
  EmptySurface,
} from "@/components/builder/builder-page-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { StrategyCalcResponse } from "@/modules/strategies/schemas";

const chartConfig = {
  pnl: {
    label: "P/L",
    color: "var(--color-chart-2)",
  },
} satisfies ChartConfig;

export function BuilderResultsPanel(args: {
  data: StrategyCalcResponse["data"] | null;
  marketError: string | null;
}) {
  return (
    <div className="grid gap-4">
      {args.marketError ? (
        <BuilderMessage title="Calculation error" message={args.marketError} />
      ) : null}

      <BuilderSummaryGrid data={args.data} />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,0.9fr)]">
        <BuilderChartCard data={args.data} />
        <BuilderGreeksCard data={args.data} />
      </div>

      <BuilderGridCard data={args.data} />
    </div>
  );
}

function BuilderSummaryGrid({
  data,
}: {
  data: StrategyCalcResponse["data"] | null;
}) {
  const metrics = getSummaryMetrics(data);

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {metrics.map((metric) => (
        <Card
          key={metric.label}
          className="border-white/[0.06] bg-[oklch(0.14_0.008_260)]"
          size="sm"
        >
          <CardContent className="grid gap-1 pt-1">
            <div className="font-mono text-[0.6rem] uppercase tracking-[0.18em] text-muted-foreground/60">
              {metric.label}
            </div>
            <div className="text-sm font-medium text-foreground">
              {metric.value}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function BuilderChartCard({
  data,
}: {
  data: StrategyCalcResponse["data"] | null;
}) {
  return (
    <Card className="border-white/[0.08] bg-[oklch(0.14_0.008_260)] shadow-[0_2px_16px_oklch(0_0_0_/_0.2)]">
      <CardHeader>
        <CardTitle>P/L Curve</CardTitle>
      </CardHeader>
      <CardContent>
        {data ? (
          <ChartContainer config={chartConfig} className="h-72 w-full">
            <AreaChart data={data.chart.series}>
              <defs>
                <linearGradient id="builder-pnl" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="0%"
                    stopColor="var(--color-pnl)"
                    stopOpacity={0.25}
                  />
                  <stop
                    offset="100%"
                    stopColor="var(--color-pnl)"
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="oklch(1 0 0 / 0.04)" />
              <XAxis
                dataKey="price"
                tickFormatter={(value) => formatAxisCurrency(Number(value))}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tickFormatter={(value) => formatAxisCurrency(Number(value))}
                axisLine={false}
                tickLine={false}
                width={72}
              />
              <Tooltip
                content={
                  <ChartTooltipContent
                    formatter={(value) => (
                      <span className="font-mono font-medium text-foreground">
                        {formatCurrency(Number(value))}
                      </span>
                    )}
                    labelFormatter={(_, payload) => {
                      const hoveredPrice = payload?.[0]?.payload?.price;
                      return hoveredPrice == null
                        ? "Underlying"
                        : `Underlying ${formatCurrency(Number(hoveredPrice))}`;
                    }}
                  />
                }
              />
              <ReferenceLine
                y={0}
                stroke="oklch(1 0 0 / 0.12)"
                strokeDasharray="4 4"
              />
              <Area
                type="monotone"
                dataKey="pnl"
                stroke="var(--color-pnl)"
                fill="url(#builder-pnl)"
                strokeWidth={2}
              />
            </AreaChart>
          </ChartContainer>
        ) : (
          <EmptySurface message="Waiting for calculation results." />
        )}
      </CardContent>
    </Card>
  );
}

function BuilderGreeksCard({
  data,
}: {
  data: StrategyCalcResponse["data"] | null;
}) {
  const greekMetrics = getGreekMetrics(data);

  return (
    <Card className="border-white/[0.08] bg-[oklch(0.14_0.008_260)] shadow-[0_2px_16px_oklch(0_0_0_/_0.2)]">
      <CardHeader>
        <CardTitle>Net Greeks</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        {greekMetrics.map(([label, value]) => (
          <div
            key={label}
            className="flex items-center justify-between rounded-lg border border-white/[0.05] bg-white/[0.02] px-3 py-2"
          >
            <span className="font-mono text-[0.65rem] uppercase tracking-[0.16em] text-muted-foreground/60">
              {label}
            </span>
            <span className="font-mono text-sm text-foreground">
              {value == null ? "--" : value.toFixed(4)}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function BuilderGridCard({
  data,
}: {
  data: StrategyCalcResponse["data"] | null;
}) {
  return (
    <Card className="border-white/[0.08] bg-[oklch(0.14_0.008_260)] shadow-[0_2px_16px_oklch(0_0_0_/_0.2)]">
      <CardHeader>
        <CardTitle>P/L Grid</CardTitle>
      </CardHeader>
      <CardContent>
        {data ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Underlying</TableHead>
                {data.grid.dates.map((date) => (
                  <TableHead key={date}>{date}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.grid.prices.map((price, rowIndex) => (
                <TableRow key={price}>
                  <TableCell className="font-mono">
                    {formatCurrency(price)}
                  </TableCell>
                  {data.grid.values[rowIndex]?.map((value, columnIndex) => (
                    <TableCell
                      key={`${price}-${data.grid.dates[columnIndex]}`}
                      className={cn(
                        "font-mono",
                        value > 0 && "text-profit",
                        value < 0 && "text-loss",
                      )}
                    >
                      {formatCurrency(value)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <EmptySurface message="Waiting for calculation results." />
        )}
      </CardContent>
    </Card>
  );
}
