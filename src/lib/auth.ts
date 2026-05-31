export type Role = "ADMIN" | "CASHIER";

const TOKEN = "ims_token";
const ROLE = "ims_role";
const MCP = "ims_must_change_password";
const NAME = "ims_name";

function decodeJwt(token: string): any | null {
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    const b64 = part.replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(b64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function extractName(token: string): string {
  const claims = decodeJwt(token) || {};
  return (
    claims.name ||
    claims.fullName ||
    claims.username ||
    claims.userName ||
    claims.preferred_username ||
    claims.sub ||
    "User"
  );
}

export const auth = {
  getToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(TOKEN);
  },
  getRole(): Role | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(ROLE) as Role | null;
  },
  getName(): string {
    if (typeof window === "undefined") return "User";
    return localStorage.getItem(NAME) || "User";
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
    localStorage.setItem(NAME, extractName(token));
  },
  clearMustChange() {
    localStorage.setItem(MCP, "false");
  },
  clear() {
    localStorage.removeItem(TOKEN);
    localStorage.removeItem(ROLE);
    localStorage.removeItem(MCP);
    localStorage.removeItem(NAME);
  },
};
