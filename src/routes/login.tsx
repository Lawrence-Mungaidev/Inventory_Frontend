import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { api } from "@/lib/api";
import { auth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, ShoppingBag, ShieldCheck, BarChart3, Boxes } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api<{ token: string; mustChangePassword: boolean; role: "ADMIN" | "CASHIER" }>(
        "/api/auth/logIn",
        { method: "POST", body: { email, password }, skipAuth: true }
      );
      auth.setSession(res.token, res.role, res.mustChangePassword);
      toast.success("Welcome back");
      if (res.mustChangePassword) navigate({ to: "/change-password" });
      else navigate({ to: "/" });
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const sendForgot = async () => {
    setForgotLoading(true);
    try {
      const res = await api<{ message: string }>("/api/auth/forgotPassword", {
        method: "POST",
        body: { email: forgotEmail },
        skipAuth: true,
      });
      toast.success(res.message || "Check your email");
      setForgotOpen(false);
      setForgotEmail("");
    } catch (err: any) {
      toast.error(err.message || "Failed");
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-background">
      {/* Left: brand panel */}
      <div className="md:w-1/2 bg-sidebar text-sidebar-foreground relative overflow-hidden flex items-center justify-center p-8 md:p-12">
        <div className="absolute inset-0 opacity-10 pointer-events-none"
             style={{
               backgroundImage:
                 "radial-gradient(circle at 20% 20%, white 2px, transparent 2px), radial-gradient(circle at 80% 70%, white 2px, transparent 2px)",
               backgroundSize: "40px 40px",
             }} />
        <div className="relative max-w-md space-y-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-sidebar-primary flex items-center justify-center">
              <ShoppingBag className="w-7 h-7" />
            </div>
            <div className="text-sm font-semibold tracking-widest text-sidebar-foreground/70">
              IMS
            </div>
          </div>
          <div>
            <h1 className="text-4xl md:text-5xl font-extrabold leading-tight tracking-tight">
              QUICK-SAVE<br />MINI MART
            </h1>
            <p className="mt-4 text-base md:text-lg text-sidebar-foreground/80">
              Your complete mini mart management solution.
            </p>
          </div>
          <ul className="space-y-3 text-sm text-sidebar-foreground/80">
            <li className="flex items-center gap-3"><ShieldCheck className="w-5 h-5" /> Secure role-based access</li>
            <li className="flex items-center gap-3"><Boxes className="w-5 h-5" /> Stock, products and suppliers in one place</li>
            <li className="flex items-center gap-3"><BarChart3 className="w-5 h-5" /> Real-time sales reports</li>
          </ul>
        </div>
      </div>

      {/* Right: form */}
      <div className="md:w-1/2 flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-sm space-y-6">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold">Sign in</h2>
            <p className="text-sm text-muted-foreground">Welcome back. Please enter your details.</p>
          </div>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={show ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShow(!show)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
                >
                  {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            {error && (
              <div className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded">{error}</div>
            )}
            <Button type="submit" className="w-full h-11" disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </Button>
            <button
              type="button"
              onClick={() => setForgotOpen(true)}
              className="text-sm text-primary hover:underline w-full text-center"
            >
              Forgot password?
            </button>
          </form>
        </div>
      </div>

      <Dialog open={forgotOpen} onOpenChange={setForgotOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset password</DialogTitle>
            <DialogDescription>Enter your email and we'll send reset instructions.</DialogDescription>
          </DialogHeader>
          <Input
            type="email"
            placeholder="you@example.com"
            value={forgotEmail}
            onChange={(e) => setForgotEmail(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setForgotOpen(false)}>
              Cancel
            </Button>
            <Button onClick={sendForgot} disabled={forgotLoading || !forgotEmail}>
              {forgotLoading ? "Sending..." : "Send"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
