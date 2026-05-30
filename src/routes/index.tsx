import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fmtKES } from "@/lib/format";
import { Receipt, TrendingUp, Package } from "lucide-react";

type TodayReport = {
  date: string;
  totalSales: number;
  numberOfTransactions: number;
  itemsSoldList: { productName: string; quantitySold: number }[];
};

export const Route = createFileRoute("/")({
  component: Dashboard,
});

function Dashboard() {
  return (
    <AppLayout allowed={["ADMIN"]}>
      <DashboardContent />
    </AppLayout>
  );
}

function DashboardContent() {
  const { data, isLoading } = useQuery({
    queryKey: ["report-today"],
    queryFn: () => api<TodayReport>("/api/report/today"),
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Today's overview — {data?.date || ""}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="Total Sales Today"
          value={fmtKES(data?.totalSales || 0)}
          icon={TrendingUp}
          loading={isLoading}
          accent="bg-primary/10 text-primary"
        />
        <StatCard
          title="Transactions Today"
          value={String(data?.numberOfTransactions || 0)}
          icon={Receipt}
          loading={isLoading}
          accent="bg-success/10 text-success"
        />
        <StatCard
          title="Items Sold"
          value={String((data?.itemsSoldList || []).reduce((a, b) => a + (b.quantitySold || 0), 0))}
          icon={Package}
          loading={isLoading}
          accent="bg-warning/20 text-warning-foreground"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Top Selling Items Today</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : (data?.itemsSoldList || []).length === 0 ? (
            <p className="text-muted-foreground">No sales yet today.</p>
          ) : (
            <ul className="divide-y">
              {data!.itemsSoldList.map((it, i) => (
                <li key={i} className="flex justify-between py-3">
                  <span className="font-medium">{it.productName}</span>
                  <span className="text-muted-foreground">{it.quantitySold} sold</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
  loading,
  accent,
}: {
  title: string;
  value: string;
  icon: any;
  loading: boolean;
  accent: string;
}) {
  return (
    <Card>
      <CardContent className="p-6 flex items-center gap-4">
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${accent}`}>
          <Icon className="w-6 h-6" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold">{loading ? "…" : value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
