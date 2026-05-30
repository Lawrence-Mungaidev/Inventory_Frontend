import { ReactNode, useEffect, useState } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { auth, Role } from "@/lib/auth";
import { api } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard,
  ShoppingCart,
  Users,
  Package,
  Tags,
  Truck,
  Boxes,
  Wrench,
  Receipt,
  BarChart3,
  Bell,
  LogOut,
  Menu,
  KeyRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type NavItem = { to: string; label: string; icon: any; roles: Role[] };

const NAV: NavItem[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, roles: ["ADMIN"] },
  { to: "/pos", label: "POS", icon: ShoppingCart, roles: ["ADMIN", "CASHIER"] },
  { to: "/users", label: "Users", icon: Users, roles: ["ADMIN"] },
  { to: "/products", label: "Products", icon: Package, roles: ["ADMIN"] },
  { to: "/categories", label: "Categories", icon: Tags, roles: ["ADMIN"] },
  { to: "/suppliers", label: "Suppliers", icon: Truck, roles: ["ADMIN"] },
  { to: "/stocks", label: "Stocks", icon: Boxes, roles: ["ADMIN"] },
  { to: "/stock-adjustments", label: "Adjustments", icon: Wrench, roles: ["ADMIN"] },
  { to: "/transactions", label: "Transactions", icon: Receipt, roles: ["ADMIN"] },
  { to: "/reports", label: "Reports", icon: BarChart3, roles: ["ADMIN"] },
];

export function useGuard(allowed?: Role[]) {
  const navigate = useNavigate();
  useEffect(() => {
    if (!auth.isAuthed()) {
      navigate({ to: "/login" });
      return;
    }
    if (auth.mustChangePassword() && typeof window !== "undefined" && !window.location.pathname.includes("change-password")) {
      navigate({ to: "/change-password" });
      return;
    }
    const role = auth.getRole();
    if (allowed && role && !allowed.includes(role)) {
      navigate({ to: role === "ADMIN" ? "/" : "/pos" });
    }
  }, [navigate, allowed]);
}

export function AppLayout({ children, allowed }: { children: ReactNode; allowed?: Role[] }) {
  useGuard(allowed);
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const role = auth.getRole();
  const [open, setOpen] = useState(false);

  const items = NAV.filter((n) => !role || n.roles.includes(role));

  const { data: notifications } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => api<any[]>("/api/notifications"),
    enabled: auth.isAuthed() && !auth.mustChangePassword(),
    refetchInterval: 60000,
  });
  const unread = (notifications || []).filter((n) => !n.isRead && !n.IsRead).length;

  const logout = async () => {
    try {
      await api("/api/auth/logout", { method: "POST" });
    } catch {}
    auth.clear();
    toast.success("Logged out");
    navigate({ to: "/login" });
  };

  if (!auth.isAuthed()) return null;

  return (
    <div className="flex min-h-screen bg-background">
      <aside
        className={`${open ? "translate-x-0" : "-translate-x-full"} md:translate-x-0 fixed md:static z-40 w-64 h-screen bg-sidebar text-sidebar-foreground flex flex-col transition-transform`}
      >
        <div className="px-6 py-5 border-b border-sidebar-border">
          <div className="text-xl font-bold tracking-tight">Mini Mart</div>
          <div className="text-xs text-sidebar-foreground/60 mt-0.5">Inventory & POS</div>
        </div>
        <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-1">
          {items.map((it) => {
            const active = path === it.to || (it.to !== "/" && path.startsWith(it.to));
            const Icon = it.icon;
            return (
              <Link
                key={it.to}
                to={it.to}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                  active
                    ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium"
                    : "hover:bg-sidebar-accent text-sidebar-foreground/90"
                }`}
              >
                <Icon className="w-4 h-4" />
                {it.label}
              </Link>
            );
          })}
          <Link
            to="/notifications"
            onClick={() => setOpen(false)}
            className={`flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors ${
              path.startsWith("/notifications")
                ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium"
                : "hover:bg-sidebar-accent text-sidebar-foreground/90"
            }`}
          >
            <span className="flex items-center gap-3">
              <Bell className="w-4 h-4" />
              Notifications
            </span>
            {unread > 0 && (
              <span className="bg-destructive text-destructive-foreground text-xs rounded-full px-2 py-0.5 min-w-[20px] text-center">
                {unread}
              </span>
            )}
          </Link>
          <Link
            to="/change-password"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-3 py-2 rounded-md text-sm hover:bg-sidebar-accent text-sidebar-foreground/90"
          >
            <KeyRound className="w-4 h-4" />
            Change Password
          </Link>
        </nav>
        <div className="p-3 border-t border-sidebar-border">
          <div className="px-3 py-2 text-xs text-sidebar-foreground/60">{role}</div>
          <Button
            variant="ghost"
            onClick={logout}
            className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden flex items-center justify-between px-4 py-3 border-b bg-card">
          <Button variant="ghost" size="icon" onClick={() => setOpen(!open)}>
            <Menu />
          </Button>
          <div className="font-semibold">Mini Mart</div>
          <div />
        </header>
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
