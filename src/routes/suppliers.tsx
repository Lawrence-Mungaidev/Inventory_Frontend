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
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";

type Supplier = {
  id: number; supplierName: string; contactName: string; contactNumber: string;
  address: string; isActive: boolean;
};

export const Route = createFileRoute("/suppliers")({
  component: () => <AppLayout allowed={["ADMIN"]}><SuppliersPage /></AppLayout>,
});

function SuppliersPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"all" | "active">("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["suppliers", tab],
    queryFn: () => api<Supplier[]>(tab === "all" ? "/api/suppliers" : "/api/suppliers/active"),
  });

  const toggle = useMutation({
    mutationFn: ({ id, active }: { id: number; active: boolean }) =>
      api(`/api/suppliers/${active ? "deactivate" : "activate"}/${id}`, { method: "PATCH" }),
    onSuccess: () => { toast.success("Updated"); qc.invalidateQueries({ queryKey: ["suppliers"] }); },
    onError: (e: any) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: (id: number) => api(`/api/suppliers/delete/${id}`, { method: "DELETE" }),
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["suppliers"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-3xl font-bold">Suppliers</h1>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
          <DialogTrigger asChild><Button onClick={() => setEditing(null)}><Plus className="w-4 h-4 mr-2" />Add Supplier</Button></DialogTrigger>
          <SupplierDialog editing={editing} onDone={() => { setOpen(false); setEditing(null); qc.invalidateQueries({ queryKey: ["suppliers"] }); }} />
        </Dialog>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList><TabsTrigger value="all">All</TabsTrigger><TabsTrigger value="active">Active</TabsTrigger></TabsList>
      </Tabs>

      <Card>
        <CardContent className="p-0 overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr className="text-left">
                <th className="p-3">Name</th><th className="p-3">Contact</th>
                <th className="p-3">Phone</th><th className="p-3">Address</th>
                <th className="p-3">Status</th><th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Loading...</td></tr>
              : (data || []).map((s) => (
                <tr key={s.id} className="border-t">
                  <td className="p-3 font-medium">{s.supplierName}</td>
                  <td className="p-3">{s.contactName}</td>
                  <td className="p-3">{s.contactNumber}</td>
                  <td className="p-3">{s.address}</td>
                  <td className="p-3"><Badge variant={s.isActive ? "default" : "secondary"}>{s.isActive ? "Active" : "Inactive"}</Badge></td>
                  <td className="p-3 text-right">
                    <div className="flex justify-end items-center gap-2">
                      <Switch checked={s.isActive} onCheckedChange={() => toggle.mutate({ id: s.id, active: s.isActive })} />
                      <Button size="icon" variant="ghost" onClick={() => { setEditing(s); setOpen(true); }}><Pencil className="w-4 h-4" /></Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild><Button size="icon" variant="ghost" className="text-destructive"><Trash2 className="w-4 h-4" /></Button></AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader><AlertDialogTitle>Delete {s.supplierName}?</AlertDialogTitle></AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => del.mutate(s.id)}>Delete</AlertDialogAction>
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

function SupplierDialog({ editing, onDone }: { editing: Supplier | null; onDone: () => void }) {
  const [form, setForm] = useState({
    supplierName: editing?.supplierName || "",
    contactName: editing?.contactName || "",
    contactNumber: editing?.contactNumber || "",
    address: editing?.address || "",
  });
  const m = useMutation({
    mutationFn: () => editing
      ? api(`/api/suppliers/update/${editing.id}`, { method: "PATCH", body: form })
      : api("/api/suppliers/create", { method: "POST", body: form }),
    onSuccess: () => { toast.success(editing ? "Updated" : "Created"); onDone(); },
    onError: (e: any) => toast.error(e.message),
  });
  return (
    <DialogContent>
      <DialogHeader><DialogTitle>{editing ? "Edit" : "Create"} Supplier</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <div><Label>Supplier name</Label><Input value={form.supplierName} onChange={(e) => setForm({ ...form, supplierName: e.target.value })} /></div>
        <div><Label>Contact name</Label><Input value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} /></div>
        <div><Label>Contact number</Label><Input value={form.contactNumber} onChange={(e) => setForm({ ...form, contactNumber: e.target.value })} /></div>
        <div><Label>Address</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
      </div>
      <DialogFooter><Button onClick={() => m.mutate()} disabled={m.isPending}>{m.isPending ? "Saving..." : "Save"}</Button></DialogFooter>
    </DialogContent>
  );
}
