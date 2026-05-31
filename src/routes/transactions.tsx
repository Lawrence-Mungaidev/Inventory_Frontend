import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { fmtKES, fmtDate } from "@/lib/format";
import { ThermalReceipt } from "@/components/ThermalReceipt";
import { Printer, Search, ChevronLeft, ChevronRight } from "lucide-react";

type Txn = {
  Id?: number; transactionId: number; receiptNumber: string; createdAt: string;
  cashierName: string;
  items: { productName: string; quantity: number; price: number; totalPrice: number }[];
  totalAmount: number; balance: number; paymentMethod: string;
};

type PageResponse<T> = {
  content: T[];
  totalPages: number;
  totalElements: number;
  number: number;
  last: boolean;
};

export const Route = createFileRoute("/transactions")({
  component: () => <AppLayout allowed={["ADMIN", "CASHIER"]}><TxnPage /></AppLayout>,
});

function TxnPage() {
  const [mode, setMode] = useState<"today" | "all" | "range">("today");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [submittedRange, setSubmittedRange] = useState<{ start: string; end: string } | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 20;

  const { data, isLoading } = useQuery<PageResponse<Txn> | Txn[]>({
    queryKey: ["transactions", mode, submittedRange, page],
    queryFn: () => {
      if (mode === "range" && submittedRange)
        return api<Txn[]>("/api/Transactions/range", { query: submittedRange });
      if (mode === "all")
        return api<PageResponse<Txn>>("/api/Transactions", { query: { page: String(page), size: String(PAGE_SIZE) } });
      return api<Txn[]>("/api/Transactions/today");
    },
  });

  const rows: Txn[] = mode === "all"
    ? ((data as PageResponse<Txn>)?.content ?? [])
    : ((data as Txn[]) ?? []);

  const totalPages = mode === "all" ? (data as PageResponse<Txn>)?.totalPages ?? 1 : 1;
  const totalElements = mode === "all" ? (data as PageResponse<Txn>)?.totalElements ?? 0 : rows.length;

  const { data: detail } = useQuery({
    queryKey: ["transaction", selectedId],
    queryFn: () => api<Txn>(`/api/Transactions/${selectedId}`),
    enabled: !!selectedId,
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">Transactions</h1>

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex gap-2">
          <Button variant={mode === "today" ? "default" : "outline"} onClick={() => { setMode("today"); setSubmittedRange(null); setPage(0); }}>Today</Button>
          <Button variant={mode === "all" ? "default" : "outline"} onClick={() => { setMode("all"); setSubmittedRange(null); setPage(0); }}>All</Button>
          <Button variant={mode === "range" ? "default" : "outline"} onClick={() => { setMode("range"); setPage(0); }}>Date Range</Button>
        </div>
        {mode === "range" && (
          <div className="flex gap-2 items-end flex-wrap">
            <div><Label>Start</Label><Input type="date" value={start} onChange={(e) => setStart(e.target.value)} /></div>
            <div><Label>End</Label><Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} /></div>
            <Button onClick={() => start && end && setSubmittedRange({ start, end })} disabled={!start || !end}>
              <Search className="w-4 h-4 mr-2" /> Search
            </Button>
          </div>
        )}
      </div>

      <Card>
        <CardContent className="p-0 overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr className="text-left">
                <th className="p-3">Receipt #</th><th className="p-3">Cashier</th>
                <th className="p-3">Total</th><th className="p-3">Payment</th><th className="p-3">Date</th>
              </tr>
            </thead>
            <tbody>
              {isLoading
                ? <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">Loading...</td></tr>
                : rows.length === 0
                  ? <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">No transactions.</td></tr>
                  : rows.map((t) => (
                    <tr key={t.transactionId} onClick={() => setSelectedId(t.transactionId)} className="border-t cursor-pointer hover:bg-muted/50">
                      <td className="p-3 font-medium">{t.receiptNumber}</td>
                      <td className="p-3">{t.cashierName}</td>
                      <td className="p-3">{fmtKES(t.totalAmount)}</td>
                      <td className="p-3"><Badge variant="outline">{t.paymentMethod}</Badge></td>
                      <td className="p-3">{fmtDate(t.createdAt)}</td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Pagination — only show for All mode */}
      {mode === "all" && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{totalElements} total transactions</span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage(p => p - 1)} disabled={page === 0}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span>Page {page + 1} of {totalPages}</span>
            <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page + 1 >= totalPages}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      <Dialog open={!!selectedId} onOpenChange={(o) => !o && setSelectedId(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Transaction Details</DialogTitle></DialogHeader>
          {detail ? (
            <>
              <ThermalReceipt data={detail} />
              <div className="flex gap-2 no-print">
                <Button variant="outline" className="flex-1" onClick={() => setSelectedId(null)}>Close</Button>
                <Button className="flex-1" onClick={() => window.print()}>
                  <Printer className="w-4 h-4 mr-2" /> Print
                </Button>
              </div>
            </>
          ) : (
            <p className="text-muted-foreground text-sm">Loading...</p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}