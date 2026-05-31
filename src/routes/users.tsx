import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Search } from "lucide-react";

type User = {
  Id?: number; id?: number;
  firstName: string; lastName: string; email: string; phoneNumber: string;
  IsActive?: boolean; isActive?: boolean; role: "ADMIN" | "CASHIER";
};
const uid = (u: User) => u.Id ?? u.id!;
const uActive = (u: User) => u.IsActive ?? u.isActive ?? false;

export const Route = createFileRoute("/users")({
  component: () => <AppLayout allowed={["ADMIN"]}><UsersPage /></AppLayout>,
});

function UsersPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["users", search],
    queryFn: () => search
      ? api<User[]>("/api/users/userName", { query: { fullName: search } })
      : api<User[]>("/api/users"),
  });

  const toggle = useMutation({
    mutationFn: ({ id, active }: { id: number; active: boolean }) =>
      api(`/api/users/${active ? "deactivate" : "activate"}/${id}`, { method: "PATCH" }),
    onSuccess: () => { toast.success("Updated"); qc.invalidateQueries({ queryKey: ["users"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Users</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" />Add User</Button>
          </DialogTrigger>
          <CreateUserDialog onDone={() => { setOpen(false); qc.invalidateQueries({ queryKey: ["users"] }); }} />
        </Dialog>
      </div>

      <div className="flex items-center gap-2 max-w-md">
        <Search className="w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search by name..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <Card>
        <CardContent className="p-0 overflow-auto">
          <table className="w-full">
            <thead className="bg-muted">
              <tr className="text-left text-sm">
                <th className="p-3">Name</th><th className="p-3">Email</th>
                <th className="p-3">Phone</th><th className="p-3">Role</th>
                <th className="p-3">Status</th><th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Loading...</td></tr>
              : (data || []).map((u) => (
                <tr key={uid(u)} className="border-t text-sm">
                  <td className="p-3">{u.firstName} {u.lastName}</td>
                  <td className="p-3">{u.email}</td>
                  <td className="p-3">{u.phoneNumber}</td>
                  <td className="p-3"><Badge variant="outline">{u.role}</Badge></td>
                  <td className="p-3">
                    <Badge variant={uActive(u) ? "default" : "secondary"}>
                      {uActive(u) ? "Active" : "Inactive"}
                    </Badge>
                  </td>
                  <td className="p-3">
                    <Switch checked={uActive(u)} onCheckedChange={() => toggle.mutate({ id: uid(u), active: uActive(u) })} />
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

function CreateUserDialog({ onDone }: { onDone: () => void }) {
  const [form, setForm] = useState({
    firstName: "", lastName: "", email: "", phoneNumber: "", role: "CASHIER" as "ADMIN" | "CASHIER",
  });
  const m = useMutation({
    mutationFn: () => api("/api/users/create", { method: "POST", body: form }),
    onSuccess: () => { toast.success("User created — temporary password: 12345678Q."); onDone(); },
    onError: (e: any) => toast.error(e.message),
  });
  return (
    <DialogContent>
      <DialogHeader><DialogTitle>Create User</DialogTitle></DialogHeader>
      <div className="grid grid-cols-2 gap-3">
        <div><Label>First name</Label><Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} /></div>
        <div><Label>Last name</Label><Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} /></div>
        <div className="col-span-2"><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
        <div><Label>Phone</Label><Input value={form.phoneNumber} onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })} /></div>
        <div>
          <Label>Role</Label>
          <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as any })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ADMIN">Admin</SelectItem>
              <SelectItem value="CASHIER">Cashier</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <DialogFooter><Button onClick={() => m.mutate()} disabled={m.isPending}>{m.isPending ? "Creating..." : "Create"}</Button></DialogFooter>
    </DialogContent>
  );
}
