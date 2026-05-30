import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { fmtKES } from "@/lib/format";
import { Plus, Pencil, Trash2, Search } from "lucide-react";

type Product = {
  Id?: number; id?: number;
  productName: string; isCountable: boolean; barcode: string; description?: string;
  sellingPrice: number; minimumQuantity: number; supplierId: number; categoryId: number;
  isActive?: boolean;
};
const pid = (p: Product) => p.Id ?? p.id!;

export const Route = createFileRoute("/products")({
  component: () => <AppLayout allowed={["ADMIN"]}><ProductsPage /></AppLayout>,
});

function ProductsPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"all" | "active" | "deactivated">("all");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);

  const url = search ? "/api/products/search" : `/api/products/${tab === "all" ? "all" : tab}`;
  const { data, isLoading } = useQuery({
    queryKey: ["products", tab, search],
    queryFn: () => api<Product[]>(url, search ? { query: { productName: search } } : undefined),
  });

  const toggle = useMutation({
    mutationFn: ({ id, active }: { id: number; active: boolean }) =>
      api(`/api/products/${active ? "deactivate" : "activate"}/${id}`, { method: "PATCH" }),
    onSuccess: () => { toast.success("Updated"); qc.invalidateQueries({ queryKey: ["products"] }); },
    onError: (e: any) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: (id: number) => api(`/api/products/delete/${id}`, { method: "DELETE" }),
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["products"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-3xl font-bold">Products</h1>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
          <DialogTrigger asChild><Button onClick={() => setEditing(null)}><Plus className="w-4 h-4 mr-2" />Add Product</Button></DialogTrigger>
          <ProductDialog editing={editing} onDone={() => { setOpen(false); setEditing(null); qc.invalidateQueries({ queryKey: ["products"] }); }} />
        </Dialog>
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="deactivated">Deactivated</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex items-center gap-2 flex-1 max-w-sm">
          <Search className="w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <Card>
        <CardContent className="p-0 overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr className="text-left">
                <th className="p-3">Name</th><th className="p-3">Barcode</th>
                <th className="p-3">Price</th><th className="p-3">Min Qty</th>
                <th className="p-3">Status</th><th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Loading...</td></tr>
              : (data || []).map((p) => (
                <tr key={pid(p)} className="border-t">
                  <td className="p-3 font-medium">{p.productName}</td>
                  <td className="p-3 text-xs text-muted-foreground">{p.barcode}</td>
                  <td className="p-3">{fmtKES(p.sellingPrice)}</td>
                  <td className="p-3">{p.minimumQuantity}</td>
                  <td className="p-3"><Badge variant={p.isActive ? "default" : "secondary"}>{p.isActive ? "Active" : "Inactive"}</Badge></td>
                  <td className="p-3 text-right">
                    <div className="flex justify-end items-center gap-2">
                      <Switch checked={!!p.isActive} onCheckedChange={() => toggle.mutate({ id: pid(p), active: !!p.isActive })} />
                      <Button size="icon" variant="ghost" onClick={() => { setEditing(p); setOpen(true); }}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="icon" variant="ghost" className="text-destructive"><Trash2 className="w-4 h-4" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete {p.productName}?</AlertDialogTitle>
                            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => del.mutate(pid(p))}>Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
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

function ProductDialog({ editing, onDone }: { editing: Product | null; onDone: () => void }) {
  const [form, setForm] = useState({
    productName: editing?.productName || "",
    isCountable: editing?.isCountable ?? true,
    barcode: editing?.barcode || "",
    description: editing?.description || "",
    sellingPrice: editing?.sellingPrice ?? 0,
    minimumQuantity: editing?.minimumQuantity ?? 0,
    supplierId: editing?.supplierId || 0,
    categoryId: editing?.categoryId || 0,
  });
  const { data: suppliers } = useQuery({ queryKey: ["suppliers-active"], queryFn: () => api<any[]>("/api/suppliers/active") });
  const { data: categories } = useQuery({ queryKey: ["categories"], queryFn: () => api<any[]>("/api/categories") });

  const m = useMutation({
    mutationFn: () => editing
      ? api(`/api/products/update/${pid(editing)}`, { method: "PATCH", body: form })
      : api("/api/products/create", { method: "POST", body: form }),
    onSuccess: () => { toast.success(editing ? "Updated" : "Created"); onDone(); },
    onError: (e: any) => toast.error(e.message),
  });
  return (
    <DialogContent>
      <DialogHeader><DialogTitle>{editing ? "Edit" : "Create"} Product</DialogTitle></DialogHeader>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2"><Label>Name</Label><Input value={form.productName} onChange={(e) => setForm({ ...form, productName: e.target.value })} /></div>
        <div><Label>Selling price (KES)</Label><Input type="number" step="0.01" value={form.sellingPrice} onChange={(e) => setForm({ ...form, sellingPrice: parseFloat(e.target.value) || 0 })} /></div>
        <div><Label>Min qty</Label><Input type="number" step="0.01" value={form.minimumQuantity} onChange={(e) => setForm({ ...form, minimumQuantity: parseFloat(e.target.value) || 0 })} /></div>
        <div className="col-span-2"><Label>Barcode (optional)</Label><Input value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} /></div>
        <div>
          <Label>Supplier</Label>
          <Select value={String(form.supplierId)} onValueChange={(v) => setForm({ ...form, supplierId: parseInt(v) })}>
            <SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger>
            <SelectContent>
              {(suppliers || []).map((s) => <SelectItem key={s.id} value={String(s.id)}>{s.supplierName}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Category</Label>
          <Select value={String(form.categoryId)} onValueChange={(v) => setForm({ ...form, categoryId: parseInt(v) })}>
            <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
            <SelectContent>
              {(categories || []).map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.categoryName}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="col-span-2"><Label>Description</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
        <label className="col-span-2 flex items-center gap-2 text-sm">
          <Checkbox checked={form.isCountable} onCheckedChange={(v) => setForm({ ...form, isCountable: !!v })} />
          Countable (whole numbers only)
        </label>
      </div>
      <DialogFooter><Button onClick={() => m.mutate()} disabled={m.isPending}>{m.isPending ? "Saving..." : "Save"}</Button></DialogFooter>
    </DialogContent>
  );
}
