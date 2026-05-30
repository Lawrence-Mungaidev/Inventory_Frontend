export type Role = "ADMIN" | "CASHIER";

const TOKEN = "ims_token";
const ROLE = "ims_role";
const MCP = "ims_must_change_password";

export const auth = {
  getToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(TOKEN);
  },
  getRole(): Role | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(ROLE) as Role | null;
  },
  mustChangePassword(): boolean {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(MCP) === "true";
  },
  isAuthed(): boolean {
    return !!this.getToken();
  },
  setSession(token: string, role: Role, mustChangePassword: boolean) {
    localStorage.setItem(TOKEN, token);
    localStorage.setItem(ROLE, role);
    localStorage.setItem(MCP, String(!!mustChangePassword));
  },
  clearMustChange() {
    localStorage.setItem(MCP, "false");
  },
  clear() {
    localStorage.removeItem(TOKEN);
    localStorage.removeItem(ROLE);
    localStorage.removeItem(MCP);
  },
};
