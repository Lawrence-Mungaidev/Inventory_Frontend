import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { api } from "@/lib/api";
import { auth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export const Route = createFileRoute("/change-password")({
  component: ChangePasswordPage,
});

const RX = /^(?=.*[A-Z])(?=.*\d)(?=.*[@#$%^&+=!.])[A-Za-z\d@#$%^&+=!.]{8,}$/;

function ChangePasswordPage() {
  const navigate = useNavigate();
  const [oldPassword, setOld] = useState("");
  const [newPassword, setNew] = useState("");
  const [confirmNewPassword, setConfirm] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!auth.isAuthed() && typeof window !== "undefined") {
    navigate({ to: "/login" });
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (!RX.test(newPassword)) {
      setErr("Password must be 8+ chars with uppercase, number, and special (@#$%^&+=!.)");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setErr("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      await api("/api/users/changepassword", {
        method: "PATCH",
        body: { oldPassword, newPassword, confirmNewPassword },
      });
      auth.clearMustChange();
      toast.success("Password changed");
      navigate({ to: auth.getRole() === "ADMIN" ? "/" : "/pos" });
    } catch (e: any) {
      if (e.status === 409) setErr("Old password does not match");
      else setErr(e.message || "Failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-accent px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
          {auth.mustChangePassword() && (
            <p className="text-sm text-warning-foreground bg-warning/30 px-3 py-2 rounded">
              You must change your password before continuing.
            </p>
          )}
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label>Old password</Label>
              <Input type="password" value={oldPassword} onChange={(e) => setOld(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>New password</Label>
              <Input type="password" value={newPassword} onChange={(e) => setNew(e.target.value)} required />
              <p className="text-xs text-muted-foreground">
                Min 8 chars, 1 uppercase, 1 number, 1 special (@#$%^&amp;+=!.)
              </p>
            </div>
            <div className="space-y-2">
              <Label>Confirm new password</Label>
              <Input
                type="password"
                value={confirmNewPassword}
                onChange={(e) => setConfirm(e.target.value)}
                required
              />
            </div>
            {err && <div className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded">{err}</div>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Updating..." : "Change password"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
