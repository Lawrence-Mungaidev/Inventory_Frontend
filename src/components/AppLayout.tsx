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
  Settings,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type NavItem = { to: string; label: string; icon: any; roles: Role[] };

const NAV: NavItem[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, roles: ["ADMIN", "CASHIER"] },
  { to: "/pos", label: "POS", icon: ShoppingCart, roles: ["ADMIN", "CASHIER"] },
  { to: "/users", label: "Users", icon: Users, roles: ["ADMIN"] },
  { to: "/products", label: "Products", icon: Package, roles: ["ADMIN"] },
  { to: "/categories", label: "Categories", icon: Tags, roles: ["ADMIN"] },
  { to: "/suppliers", label: "Suppliers", icon: Truck, roles: ["ADMIN"] },
  { to: "/stocks", label: "Stocks", icon: Boxes, roles: ["ADMIN", "CASHIER"] },
  { to: "/stock-adjustments", label: "Adjustments", icon: Wrench, roles: ["ADMIN", "CASHIER"] },
  { to: "/transactions", label: "Transactions", icon: Receipt, roles: ["ADMIN", "CASHIER"] },
  { to: "/chat", label: "Assistant", icon: MessageCircle, roles: ["ADMIN", "CASHIER"] },
  { to: "/reports", label: "Reports", icon: BarChart3, roles: ["ADMIN"] },
];

const COLLAPSE_KEY = "ims_sidebar_collapsed";

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
      navigate({ to: "/" });
    }
  }, [navigate, allowed]);
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function AppLayout({ children, allowed }: { children: ReactNode; allowed?: Role[] }) {
  useGuard(allowed);
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const role = auth.getRole();
  const name = auth.getName();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(COLLAPSE_KEY) === "true";
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(COLLAPSE_KEY, String(collapsed));
    }
  }, [collapsed]);

  const items = NAV.filter((n) => !role || n.roles.includes(role));

  const { data: notifications } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => api<any[]>("/api/notifications"),
    enabled: auth.isAuthed() && !auth.mustChangePassword(),
    refetchInterval: 60000,
  });
  const unread = (notifications || []).filter((n: any) => !(n.isRead ?? n.IsRead)).length;

  const logout = async () => {
    try {
      await api("/api/auth/logout", { method: "POST" });
    } catch {}
    auth.clear();
    toast.success("Logged out");
    navigate({ to: "/login" });
  };

  if (!auth.isAuthed()) return null;

  const sidebarWidth = collapsed ? "w-16" : "w-64";

  const NavLink = ({
    to,
    label,
    Icon,
    badge,
    active,
  }: {
    to: string;
    label: string;
    Icon: any;
    badge?: number;
    active: boolean;
  }) => (
    <Link
      to={to}
      onClick={() => setMobileOpen(false)}
      title={collapsed ? label : undefined}
      className={`flex items-center ${collapsed ? "justify-center" : "justify-between"} gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
        active
          ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium"
          : "hover:bg-sidebar-accent text-sidebar-foreground/90"
      }`}
    >
      <span className={`flex items-center ${collapsed ? "" : "gap-3"} min-w-0`}>
        <Icon className="w-4 h-4 shrink-0" />
        {!collapsed && <span className="truncate">{label}</span>}
      </span>
      {!collapsed && badge !== undefined && badge > 0 && (
        <span className="bg-destructive text-destructive-foreground text-xs rounded-full px-2 py-0.5 min-w-[20px] text-center">
          {badge}
        </span>
      )}
    </Link>
  );

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* mobile backdrop */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/40 z-30"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`${mobileOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0 fixed md:sticky top-0 z-40 ${sidebarWidth} h-screen bg-sidebar text-sidebar-foreground flex flex-col transition-all duration-200 shrink-0`}
      >
        <div className={`flex items-center ${collapsed ? "justify-center" : "justify-between"} px-3 py-4 border-b border-sidebar-border`}>
          {!collapsed && (
            <div className="min-w-0">
              <div className="text-sm font-bold tracking-tight truncate">QUICK-SAVE</div>
              <div className="text-[10px] text-sidebar-foreground/60 truncate">MINI MART</div>
            </div>
          )}
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="p-1.5 rounded hover:bg-sidebar-accent text-sidebar-foreground"
            title={collapsed ? "Expand" : "Collapse"}
          >
            {collapsed ? <Menu className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-1 min-h-0">
          {items.map((it) => (
            <NavLink
              key={it.to}
              to={it.to}
              label={it.label}
              Icon={it.icon}
              active={path === it.to || (it.to !== "/" && path.startsWith(it.to))}
            />
          ))}
          <NavLink
            to="/notifications"
            label="Notifications"
            Icon={Bell}
            badge={unread}
            active={path.startsWith("/notifications")}
          />
        </nav>

        <div className="border-t border-sidebar-border p-2 space-y-1 shrink-0">
          {/* User info */}
          <div className={`flex items-center gap-2 px-2 py-2 ${collapsed ? "justify-center" : ""}`}>
            <div className="w-8 h-8 rounded-full bg-sidebar-primary text-sidebar-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">
              {initials(name)}
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">{name}</div>
                <div className="text-[11px] text-sidebar-foreground/60 capitalize">
                  {role?.toLowerCase()}
                </div>
              </div>
            )}
          </div>
          <NavLink
            to="/settings"
            label="Settings"
            Icon={Settings}
            active={path.startsWith("/settings") || path.startsWith("/change-password")}
          />
          <button
            onClick={logout}
            title={collapsed ? "Logout" : undefined}
            className={`w-full flex items-center ${collapsed ? "justify-center" : "gap-3"} px-3 py-2 rounded-md text-sm text-sidebar-foreground/90 hover:bg-sidebar-accent`}
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden flex items-center justify-between px-4 py-3 border-b bg-card sticky top-0 z-20">
          <Button variant="ghost" size="icon" onClick={() => setMobileOpen(!mobileOpen)}>
            <Menu />
          </Button>
          <div className="font-semibold">QUICK-SAVE MINI MART</div>
          <div className="w-9" />
        </header>
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
