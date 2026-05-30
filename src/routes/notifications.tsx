import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell } from "lucide-react";

type Notif = { Id?: number; id?: number; message: string; notificationType: string; isRead?: boolean; IsRead?: boolean };

export const Route = createFileRoute("/notifications")({
  component: () => <AppLayout><NotifPage /></AppLayout>,
});

const typeColor: Record<string, string> = {
  LOW_STOCK: "bg-warning/30 text-warning-foreground",
  RESTOCK_REQUEST: "bg-primary/15 text-primary",
  STOCK_APPROVED: "bg-success/20 text-success",
  STOCK_REJECTED: "bg-destructive/15 text-destructive",
  EXPIRED: "bg-destructive/15 text-destructive",
  ITEMS_ABOUT_TO_EXPIRE: "bg-warning/30 text-warning-foreground",
};

function NotifPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["notifications"], queryFn: () => api<Notif[]>("/api/notifications") });

  const mark = useMutation({
    mutationFn: (id: number) => api(`/api/notifications/markasread/${id}`, { method: "PATCH" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const nid = (n: Notif) => n.Id ?? n.id!;
  const unread = (n: Notif) => !(n.isRead ?? n.IsRead);

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-2">
        <Bell className="w-6 h-6" />
        <h1 className="text-3xl font-bold">Notifications</h1>
      </div>

      {isLoading ? <p className="text-muted-foreground">Loading...</p>
      : (data || []).length === 0 ? <p className="text-muted-foreground">No notifications.</p>
      : (
        <div className="space-y-2">
          {data!.map((n) => (
            <Card
              key={nid(n)}
              onClick={() => unread(n) && mark.mutate(nid(n))}
              className={`cursor-pointer transition-colors ${unread(n) ? "border-primary bg-primary/5" : "opacity-70"}`}
            >
              <CardContent className="p-4 flex items-start gap-3">
                <Badge className={typeColor[n.notificationType] || "bg-muted"}>{n.notificationType}</Badge>
                <p className="flex-1">{n.message}</p>
                {unread(n) && <span className="w-2 h-2 rounded-full bg-primary mt-2" />}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
