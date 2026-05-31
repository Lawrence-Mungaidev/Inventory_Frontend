import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { useState } from "react";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { fmtKES, fmtDate } from "@/lib/format";
import { Plus, Check, X } from "lucide-react";
import { auth } from "@/lib/auth";

type Stock = {
  Id: number; productId: number; arrivedQuantity: number; totalBoughtPrice: number;
  supplierName: string; addedByName: string; approvedByName?: string;
  arrivalDate?: string; arrivedDate?: string; createdAt?: string;
  approvedDate?: string; approvalDate?: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
};

export const Route = createFileRoute("/stocks")({
  component: () => <AppLayout allowed={["ADMIN", "CASHIER"]}><StocksPage /></AppLayout>,
});

function StocksPage() {
  const qc = useQueryClient();
  const role = auth.getRole();
  const isAdmin = role === "ADMIN";
  const [status, setStatus] = useState<string>("ALL");
  const [open, setOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["stocks", status],
    queryFn: () => status === "ALL"
      ? api<Stock[]>("/api/stocks")
      : api<Stock[]>(`/api/stocks/status/${status}`),
  });

  // Resolve productId -> productName
  const productIds = Array.from(new Set((data || []).map((s) => s.productId)));
  const productQueries = useQueries({
    queries: productIds.map((id) => ({
      queryKey: ["product", id],
      queryFn: () => api<any>(`/api/products/${id}`),
      staleTime: 60_000,
    })),
  });
  const productMap: Record<number, string> = {};
  productIds.forEach((id, i) => {
    const p = productQueries[i].data;
    if (p) productMap[id] = p.productName || `#${id}`;
  });

  const act = useMutation({
    mutationFn: ({ id, action }: { id: number; action: "approve" | "reject" }) =>
      api(`/api/stocks/${action}/${id}`, { method: "PATCH" }),
    onSuccess: () => { toast.success("Done"); qc.invalidateQueries({ queryKey: ["stocks"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-3xl font-bold">Stocks</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" />Add Stock</Button></DialogTrigger>
          <CreateStockDialog onDone={() => { setOpen(false); qc.invalidateQueries({ queryKey: ["stocks"] }); }} />
        </Dialog>
      </div>

      <div className="flex items-center gap-3">
        <Label>Filter:</Label>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="APPROVED">Approved</SelectItem>
            <SelectItem value="REJECTED">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0 overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr className="text-left">
                <th className="p-3">ID</th>
                <th className="p-3">Product</th>
                <th className="p-3">Qty</th>
                <th className="p-3">Total Cost</th>
                <th className="p-3">Supplier</th>
                <th className="p-3">Added By</th>
                <th className="p-3">Arrival Date</th>
                <th className="p-3">Approval Date</th>
                <th className="p-3">Status</th>
                {isAdmin && <th className="p-3 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {isLoading ? <tr><td colSpan={isAdmin ? 10 : 9} className="p-6 text-center text-muted-foreground">Loading...</td></tr>
              : (data || []).map((s) => (
                <tr key={s.Id} className="border-t">
                  <td className="p-3">{s.Id}</td>
                  <td className="p-3 font-medium">{productMap[s.productId] || `#${s.productId}`}</td>
                  <td className="p-3">{s.arrivedQuantity}</td>
                  <td className="p-3">{fmtKES(s.totalBoughtPrice)}</td>
                  <td className="p-3">{s.supplierName}</td>
                  <td className="p-3">{s.addedByName}</td>
                  <td className="p-3">{fmtDate(s.arrivalDate || s.arrivedDate || s.createdAt || "")}</td>
                  <td className="p-3">{fmtDate(s.approvedDate || s.approvalDate || "")}</td>
                  <td className="p-3">
                    <Badge variant={s.status === "APPROVED" ? "default" : s.status === "REJECTED" ? "destructive" : "secondary"}>{s.status}</Badge>
                  </td>
                  {isAdmin && (
                    <td className="p-3 text-right">
                      {s.status === "PENDING" && (
                        <div className="flex justify-end gap-1">
                          <Button size="sm" variant="outline" onClick={() => act.mutate({ id: s.Id, action: "approve" })}><Check className="w-4 h-4 mr-1" />Approve</Button>
                          <Button size="sm" variant="outline" className="text-destructive" onClick={() => act.mutate({ id: s.Id, action: "reject" })}><X className="w-4 h-4 mr-1" />Reject</Button>
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

function CreateStockDialog({ onDone }: { onDone: () => void }) {
  const [form, setForm] = useState({ productId: 0, arrivedQuantity: 0, buyingPrice: 0, supplierId: 0, expiryDate: "" });
  const { data: products } = useQuery({ queryKey: ["products-active"], queryFn: () => api<any[]>("/api/products/active") });
  const { data: suppliers } = useQuery({ queryKey: ["suppliers-active"], queryFn: () => api<any[]>("/api/suppliers/active") });

  const m = useMutation({
    mutationFn: () => api("/api/stocks/create", {
      method: "POST",
      body: { ...form, expiryDate: form.expiryDate || undefined },
    }),
    onSuccess: () => { toast.success("Stock request created"); onDone(); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <DialogContent>
      <DialogHeader><DialogTitle>New Stock Request</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <div>
          <Label>Product</Label>
          <Select value={String(form.productId)} onValueChange={(v) => setForm({ ...form, productId: parseInt(v) })}>
            <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
            <SelectContent>
              {(products || []).map((p) => <SelectItem key={p.Id ?? p.id} value={String(p.Id ?? p.id)}>{p.productName}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Supplier</Label>
          <Select value={String(form.supplierId)} onValueChange={(v) => setForm({ ...form, supplierId: parseInt(v) })}>
            <SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger>
            <SelectContent>
              {(suppliers || []).map((s) => <SelectItem key={s.id} value={String(s.id)}>{s.supplierName}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Arrived qty</Label><Input type="number" step="0.01" value={form.arrivedQuantity} onChange={(e) => setForm({ ...form, arrivedQuantity: parseFloat(e.target.value) || 0 })} /></div>
          <div><Label>Buying price</Label><Input type="number" step="0.01" value={form.buyingPrice} onChange={(e) => setForm({ ...form, buyingPrice: parseFloat(e.target.value) || 0 })} /></div>
        </div>
        <div><Label>Expiry (optional)</Label><Input type="date" value={form.expiryDate} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} /></div>
      </div>
      <DialogFooter><Button onClick={() => m.mutate()} disabled={m.isPending}>{m.isPending ? "Saving..." : "Create"}</Button></DialogFooter>
    </DialogContent>
  );
}
