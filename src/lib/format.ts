export const fmtKES = (n: number | string | null | undefined) => {
  const v = typeof n === "string" ? parseFloat(n) : (n ?? 0);
  if (Number.isNaN(v)) return "KES 0.00";
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    minimumFractionDigits: 2,
  }).format(v);
};

export const fmtDate = (s: string | null | undefined) => {
  if (!s) return "—";
  // backend sends "30/05/2026 08:00" or ISO; try both
  if (/^\d{2}\/\d{2}\/\d{4}/.test(s)) return s;
  try {
    return new Date(s).toLocaleString("en-KE");
  } catch {
    return s;
  }
};
