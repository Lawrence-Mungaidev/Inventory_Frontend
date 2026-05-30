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

type Txn = {
  Id?: number; transactionId: number; receiptNumber: string; createdAt: string;
  cashierName: string;
  items: { productName: string; quantity: number; price: number; totalPrice: number }[];
  totalAmount: number; balance: number; paymentMethod: string;
};

export const Route = createFileRoute("/transactions")({
  component: () => <AppLayout allowed={["ADMIN"]}><TxnPage /></AppLayout>,
});

function TxnPage() {
  const [mode, setMode] = useState<"all" | "today" | "range">("all");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [selected, setSelected] = useState<Txn | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["transactions", mode, start, end],
    queryFn: () => {
      if (mode === "today") return api<Txn[]>("/api/Transactions/today");
      if (mode === "range" && start && end) return api<Txn[]>("/api/Transactions/range", { query: { start, end } });
      return api<Txn[]>("/api/Transactions");
    },
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">Transactions</h1>

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex gap-2">
          <Button variant={mode === "all" ? "default" : "outline"} onClick={() => setMode("all")}>All</Button>
          <Button variant={mode === "today" ? "default" : "outline"} onClick={() => setMode("today")}>Today</Button>
          <Button variant={mode === "range" ? "default" : "outline"} onClick={() => setMode("range")}>Date Range</Button>
        </div>
        {mode === "range" && (
          <div className="flex gap-2 items-end">
            <div><Label>Start</Label><Input type="date" value={start} onChange={(e) => setStart(e.target.value)} /></div>
            <div><Label>End</Label><Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} /></div>
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
              {isLoading ? <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">Loading...</td></tr>
              : (data || []).map((t) => (
                <tr key={t.transactionId} onClick={() => setSelected(t)} className="border-t cursor-pointer hover:bg-muted/50">
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

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{selected?.receiptNumber}</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                <div>Cashier: <span className="text-foreground">{selected.cashierName}</span></div>
                <div>Date: <span className="text-foreground">{fmtDate(selected.createdAt)}</span></div>
                <div>Payment: <span className="text-foreground">{selected.paymentMethod}</span></div>
                <div>Balance: <span className="text-foreground">{fmtKES(selected.balance)}</span></div>
              </div>
              <table className="w-full border-t">
                <thead><tr className="text-left text-xs text-muted-foreground"><th className="py-2">Item</th><th>Qty</th><th>Price</th><th className="text-right">Total</th></tr></thead>
                <tbody>
                  {selected.items.map((it, i) => (
                    <tr key={i} className="border-t">
                      <td className="py-2">{it.productName}</td>
                      <td>{it.quantity}</td>
                      <td>{fmtKES(it.price)}</td>
                      <td className="text-right">{fmtKES(it.totalPrice)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot><tr className="border-t font-bold"><td colSpan={3} className="py-2">Total</td><td className="text-right">{fmtKES(selected.totalAmount)}</td></tr></tfoot>
              </table>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
