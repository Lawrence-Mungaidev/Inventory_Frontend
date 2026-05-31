import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Check, X, ChevronLeft, ChevronRight } from "lucide-react";
import { auth } from "@/lib/auth";

type Adj = {
  Id: number; productName: string; quantity: number;
  adjustmentType: string; reason: string; status: "PENDING" | "APPROVED" | "REJECTED";
};

type PageResponse<T> = {
  content: T[];
  totalPages: number;
  totalElements: number;
  number: number;
  last: boolean;
};

export const Route = createFileRoute("/stock-adjustments")({
  component: () => <AppLayout allowed={["ADMIN", "CASHIER"]}><AdjPage /></AppLayout>,
});

function AdjPage() {
  const qc = useQueryClient();
  const isAdmin = auth.getRole() === "ADMIN";
  const [status, setStatus] = useState<string>("ALL");
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 20;

  const { data, isLoading } = useQuery<PageResponse<Adj> | Adj[]>({
    queryKey: ["adjustments", status, page],
    queryFn: () => status === "ALL"
      ? api<PageResponse<Adj>>("/api/stockAdjustments", { query: { page: String(page), size: String(PAGE_SIZE) } })
      : api<Adj[]>(`/api/stockAdjustments/status/${status}`),
  });

  const rows: Adj[] = status === "ALL"
    ? ((data as PageResponse<Adj>)?.content ?? [])
    : ((data as Adj[]) ?? []);

  const totalPages = status === "ALL" ? (data as PageResponse<Adj>)?.totalPages ?? 1 : 1;
  const totalElements = status === "ALL" ? (data as PageResponse<Adj>)?.totalElements ?? 0 : rows.length;

  const act = useMutation({
    mutationFn: ({ id, action }: { id: number; action: "approve" | "reject" }) =>
      api(`/api/stockAdjustments/${action}/${id}`, { method: "PATCH" }),
    onSuccess: () => { toast.success("Done"); qc.invalidateQueries({ queryKey: ["adjustments"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-3xl font-bold">Stock Adjustments</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" />New Adjustment</Button></DialogTrigger>
          <CreateAdjDialog onDone={() => { setOpen(false); qc.invalidateQueries({ queryKey: ["adjustments"] }); }} />
        </Dialog>
      </div>

      <div className="flex items-center gap-3">
        <Label>Filter:</Label>
        <Select value={status} onValueChange={(v) => { setStatus(v); setPage(0); }}>
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
                <th className="p-3">ID</th><th className="p-3">Product</th><th className="p-3">Qty</th>
                <th className="p-3">Type</th><th className="p-3">Reason</th>
                <th className="p-3">Status</th>
                {isAdmin && <th className="p-3 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {isLoading
                ? <tr><td colSpan={isAdmin ? 7 : 6} className="p-6 text-center text-muted-foreground">Loading...</td></tr>
                : rows.map((a) => (
                  <tr key={a.Id} className="border-t">
                    <td className="p-3">{a.Id}</td>
                    <td className="p-3">{a.productName}</td>
                    <td className="p-3">{a.quantity}</td>
                    <td className="p-3"><Badge variant="outline">{a.adjustmentType}</Badge></td>
                    <td className="p-3 max-w-xs truncate">{a.reason}</td>
                    <td className="p-3">
                      <Badge variant={a.status === "APPROVED" ? "default" : a.status === "REJECTED" ? "destructive" : "secondary"}>{a.status}</Badge>
                    </td>
                    {isAdmin && (
                      <td className="p-3 text-right">
                        {a.status === "PENDING" && (
                          <div className="flex justify-end gap-1">
                            <Button size="sm" variant="outline" onClick={() => act.mutate({ id: a.Id, action: "approve" })}><Check className="w-4 h-4 mr-1" />Approve</Button>
                            <Button size="sm" variant="outline" className="text-destructive" onClick={() => act.mutate({ id: a.Id, action: "reject" })}><X className="w-4 h-4 mr-1" />Reject</Button>
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

      {status === "ALL" && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{totalElements} total adjustments</span>
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
    </div>
  );
}

function CreateAdjDialog({ onDone }: { onDone: () => void }) {
  const [form, setForm] = useState({ productId: 0, quantity: 0, adjustmentType: "DAMAGED", reason: "" });
  const [productSearch, setProductSearch] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<string>("");
  const { data: products } = useQuery({
    queryKey: ["products-search", productSearch],
    queryFn: () => api<any[]>("/api/products/search", { query: { productName: productSearch } }),
    enabled: productSearch.length > 0,
  });
  const m = useMutation({
    mutationFn: () => api("/api/stockAdjustments/adjustRequest", { method: "POST", body: form }),
    onSuccess: () => { toast.success("Submitted"); onDone(); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <DialogContent>
      <DialogHeader><DialogTitle>New Adjustment</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <div className="relative">
          <Label>Product</Label>
          <Input
            placeholder="Search product..."
            value={selectedProduct || productSearch}
            onChange={(e) => { setProductSearch(e.target.value); setSelectedProduct(""); setForm({ ...form, productId: 0 }); }}
          />
          {products && products.length > 0 && !form.productId && (
            <div className="border rounded-md mt-1 max-h-40 overflow-auto bg-background shadow z-10 absolute w-full">
              {products.map((p) => (
                <div
                  key={p.Id ?? p.id}
                  className="px-3 py-2 cursor-pointer hover:bg-muted text-sm"
                  onClick={() => {
                    setForm({ ...form, productId: p.Id ?? p.id });
                    setSelectedProduct(p.productName);
                    setProductSearch("");
                  }}
                >
                  {p.productName} {p.description ? `— ${p.description}` : ""}
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Quantity</Label><Input type="number" step="0.01" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: parseFloat(e.target.value) || 0 })} /></div>
          <div>
            <Label>Type</Label>
            <Select value={form.adjustmentType} onValueChange={(v) => setForm({ ...form, adjustmentType: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="DAMAGED">Damaged</SelectItem>
                <SelectItem value="THEFT">Theft</SelectItem>
                <SelectItem value="EXPIRED">Expired</SelectItem>
                <SelectItem value="CORRECTION">Correction</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div><Label>Reason</Label><Textarea value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} /></div>
      </div>
      <DialogFooter><Button onClick={() => m.mutate()} disabled={m.isPending}>{m.isPending ? "Saving..." : "Submit"}</Button></DialogFooter>
    </DialogContent>
  );
}