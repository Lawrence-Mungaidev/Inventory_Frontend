import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { fmtKES } from "@/lib/format";

export const Route = createFileRoute("/reports")({
  component: () => <AppLayout allowed={["ADMIN"]}><Reports /></AppLayout>,
});

function Reports() {
  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">Reports</h1>
      <Tabs defaultValue="today">
        <TabsList>
          <TabsTrigger value="today">Today</TabsTrigger>
          <TabsTrigger value="month">This Month</TabsTrigger>
          <TabsTrigger value="range">Date Range</TabsTrigger>
        </TabsList>
        <TabsContent value="today"><TodayReport /></TabsContent>
        <TabsContent value="month"><MonthReport /></TabsContent>
        <TabsContent value="range"><RangeReport /></TabsContent>
      </Tabs>
    </div>
  );
}

function Stats({ totalSales, numberOfTransactions, profit, loss }: any) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <StatCard label="Total Sales" value={fmtKES(totalSales || 0)} />
      <StatCard label="Transactions" value={String(numberOfTransactions || 0)} />
      {profit !== undefined && <StatCard label="Profit" value={fmtKES(profit)} accent="text-success" />}
      {loss !== undefined && <StatCard label="Loss" value={fmtKES(loss)} accent="text-destructive" />}
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <Card><CardContent className="p-5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className={`text-2xl font-bold ${accent || ""}`}>{value}</p>
    </CardContent></Card>
  );
}

function ItemList({ title, items }: { title: string; items: { productName: string; quantitySold: number }[] }) {
  return (
    <Card>
      <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
      <CardContent>
        {!items?.length ? <p className="text-muted-foreground">No data.</p>
        : <ul className="divide-y">{items.map((i, k) => (
            <li key={k} className="flex justify-between py-2"><span>{i.productName}</span><span className="text-muted-foreground">{i.quantitySold}</span></li>
          ))}</ul>}
      </CardContent>
    </Card>
  );
}

function TodayReport() {
  const { data, isLoading } = useQuery({ queryKey: ["report-today-page"], queryFn: () => api<any>("/api/report/today") });
  if (isLoading) return <p className="text-muted-foreground mt-4">Loading...</p>;
  return (
    <div className="space-y-4 mt-4">
      <Stats {...data} />
      <ItemList title="Items sold today" items={data?.itemsSoldList || []} />
    </div>
  );
}

function MonthReport() {
  const { data, isLoading } = useQuery({ queryKey: ["report-month"], queryFn: () => api<any>("/api/report/thisMonth") });
  if (isLoading) return <p className="text-muted-foreground mt-4">Loading...</p>;
  return (
    <div className="space-y-4 mt-4">
      <Stats {...data} />
      <ItemList title="Most sold this month" items={data?.mostSoldItem || []} />
    </div>
  );
}

function RangeReport() {
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [active, setActive] = useState<{ start: string; end: string } | null>(null);
  const { data, isLoading } = useQuery({
    queryKey: ["report-range", active],
    queryFn: () => api<any>("/api/report/dateRange", { query: { startDate: active!.start, endDate: active!.end } }),
    enabled: !!active,
  });
  return (
    <div className="space-y-4 mt-4">
      <div className="flex items-end gap-2">
        <div><Label>Start</Label><Input type="date" value={start} onChange={(e) => setStart(e.target.value)} /></div>
        <div><Label>End</Label><Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} /></div>
        <Button onClick={() => setActive({ start, end })} disabled={!start || !end}>Generate</Button>
      </div>
      {isLoading && <p className="text-muted-foreground">Loading...</p>}
      {data && <Stats {...data} />}
      {data && <ItemList title="Top selling items" items={data?.topSellingItems || []} />}
    </div>
  );
}
