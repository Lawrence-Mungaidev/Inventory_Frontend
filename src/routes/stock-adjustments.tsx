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
import { Plus, Check, X } from "lucide-react";

type Adj = {
  Id: number; productName: string; quantity: number;
  adjustmentType: string; reason: string; status: "PENDING" | "APPROVED" | "REJECTED";
};

export const Route = createFileRoute("/stock-adjustments")({
  component: () => <AppLayout allowed={["ADMIN", "CASHIER"]}><AdjPage /></AppLayout>,
});

function AdjPage() {
  const qc = useQueryClient();
  const isAdmin = auth.getRole() === "ADMIN";
  const [status, setStatus] = useState<string>("ALL");
  const [open, setOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["adjustments", status],
    queryFn: () => status === "ALL"
      ? api<Adj[]>("/api/stockAdjustments")
      : api<Adj[]>(`/api/stockAdjustments/status/${status}`),
  });

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
                <th className="p-3">ID</th><th className="p-3">Product</th><th className="p-3">Qty</th>
                <th className="p-3">Type</th><th className="p-3">Reason</th>
                <th className="p-3">Status</th><th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">Loading...</td></tr>
              : (data || []).map((a) => (
                <tr key={a.Id} className="border-t">
                  <td className="p-3">{a.Id}</td>
                  <td className="p-3">{a.productName}</td>
                  <td className="p-3">{a.quantity}</td>
                  <td className="p-3"><Badge variant="outline">{a.adjustmentType}</Badge></td>
                  <td className="p-3 max-w-xs truncate">{a.reason}</td>
                  <td className="p-3">
                    <Badge variant={a.status === "APPROVED" ? "default" : a.status === "REJECTED" ? "destructive" : "secondary"}>{a.status}</Badge>
                  </td>
                  <td className="p-3 text-right">
                    {a.status === "PENDING" && (
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="outline" onClick={() => act.mutate({ id: a.Id, action: "approve" })}><Check className="w-4 h-4 mr-1" />Approve</Button>
                        <Button size="sm" variant="outline" className="text-destructive" onClick={() => act.mutate({ id: a.Id, action: "reject" })}><X className="w-4 h-4 mr-1" />Reject</Button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

function CreateAdjDialog({ onDone }: { onDone: () => void }) {
  const [form, setForm] = useState({ productId: 0, quantity: 0, adjustmentType: "DAMAGED", reason: "" });
  const { data: products } = useQuery({ queryKey: ["products-active"], queryFn: () => api<any[]>("/api/products/active") });

  const m = useMutation({
    mutationFn: () => api("/api/stockAdjustments/adjustRequest", { method: "POST", body: form }),
    onSuccess: () => { toast.success("Submitted"); onDone(); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <DialogContent>
      <DialogHeader><DialogTitle>New Adjustment</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <div>
          <Label>Product</Label>
          <Select value={String(form.productId)} onValueChange={(v) => setForm({ ...form, productId: parseInt(v) })}>
            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>
              {(products || []).map((p) => <SelectItem key={p.Id ?? p.id} value={String(p.Id ?? p.id)}>{p.productName}</SelectItem>)}
            </SelectContent>
          </Select>
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
