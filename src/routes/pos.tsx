import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { fmtKES } from "@/lib/format";
import { toast } from "sonner";
import { Minus, Plus, Trash2, ScanBarcode, Printer, Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ThermalReceipt, ReceiptData } from "@/components/ThermalReceipt";

type Product = {
  Id?: number;
  id?: number;
  productName: string;
  isCountable: boolean;
  barcode: string;
  sellingPrice: number;
  description?: string;
};

type CartItem = { product: Product; quantity: number };

type TxnResponse = ReceiptData & {
  Id?: number;
  transactionId: number;
};

const pid = (p: Product) => p.Id ?? p.id!;

export const Route = createFileRoute("/pos")({
  component: () => (
    <AppLayout allowed={["ADMIN", "CASHIER"]}>
      <POS />
    </AppLayout>
  ),
});

function playBeep() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g);
    g.connect(ctx.destination);
    o.frequency.value = 1100;
    g.gain.value = 0.08;
    o.start();
    setTimeout(() => {
      o.stop();
      ctx.close();
    }, 90);
  } catch {}
}

function POS() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [payment, setPayment] = useState<"CASH" | "MPESA">("CASH");
  const [amountGiven, setAmountGiven] = useState("");
  const [receipt, setReceipt] = useState<TxnResponse | null>(null);
  const scanRef = useRef<HTMLInputElement>(null);
  const [scanBuf, setScanBuf] = useState("");
  const [flash, setFlash] = useState(false);

  const refocus = () => {
    if (receipt) return;
    setTimeout(() => scanRef.current?.focus(), 0);
  };

  useEffect(() => {
    refocus();
    const onClick = (e: MouseEvent) => {
      if (receipt) return;
      const t = e.target as HTMLElement;
      if (t.closest("input,textarea,button,select,[role=dialog],[role=combobox],[role=listbox]")) return;
      refocus();
    };
    const onKey = () => {
      if (receipt) return;
      if (document.activeElement instanceof HTMLInputElement) {
        const tag = document.activeElement;
        if (tag === scanRef.current) return;
      }
    };
    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onKey);
    const interval = setInterval(() => {
      if (!receipt && document.activeElement !== scanRef.current) {
        const el = document.activeElement as HTMLElement | null;
        if (!el || (el.tagName !== "INPUT" && el.tagName !== "TEXTAREA" && el.tagName !== "SELECT")) {
          scanRef.current?.focus();
        }
      }
    }, 1500);
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("keydown", onKey);
      clearInterval(interval);
    };
  }, [receipt]);

  const { data: searchResults } = useQuery({
    queryKey: ["product-search", search],
    queryFn: () => api<Product[]>("/api/products/search", { query: { productName: search } }),
    enabled: search.length > 0,
  });

  const addToCart = (p: Product) => {
    setCart((c) => {
      const i = c.findIndex((x) => pid(x.product) === pid(p));
      if (i >= 0) {
        const copy = [...c];
        copy[i] = { ...copy[i], quantity: copy[i].quantity + 1 };
        return copy;
      }
      return [...c, { product: p, quantity: 1 }];
    });
  };

  const handleBarcodeSubmit = async (code: string) => {
    if (!code.trim()) return;
    try {
      const p = await api<Product>(`/api/products/barcode/${encodeURIComponent(code.trim())}`);
      addToCart(p);
      playBeep();
      setFlash(true);
      setTimeout(() => setFlash(false), 200);
      toast.success(`Added ${p.productName}`);
    } catch (e: any) {
      toast.error(e.message || "Product not found");
    }
  };

  const updateQty = (id: number, delta: number) => {
    setCart((c) =>
      c
        .map((it) => {
          if (pid(it.product) !== id) return it;
          let q = it.quantity + delta;
          if (it.product.isCountable) q = Math.round(q);
          return { ...it, quantity: q };
        })
        .filter((it) => it.quantity > 0)
    );
  };

  const setQty = (id: number, val: number) => {
    setCart((c) =>
      c
        .map((it) => {
          if (pid(it.product) !== id) return it;
          let q = isFinite(val) && val > 0 ? val : 0;
          if (it.product.isCountable) q = Math.floor(q);
          return { ...it, quantity: q };
        })
        .filter((it) => it.quantity > 0)
    );
  };

  const removeItem = (id: number) => setCart((c) => c.filter((it) => pid(it.product) !== id));

  const total = cart.reduce((s, it) => s + it.product.sellingPrice * it.quantity, 0);
  const given = parseFloat(amountGiven) || 0;
  const change = payment === "CASH" ? given - total : 0;

  const checkout = useMutation({
    mutationFn: () =>
      api<TxnResponse>("/api/Transactions/create", {
        method: "POST",
        body: {
          items: cart.map((it) => ({ productId: pid(it.product), quantity: it.quantity })),
          paymentMethod: payment,
          amountGiven: payment === "CASH" ? given : 0,
        },
      }),
    onSuccess: (r) => {
      setReceipt({ ...r, amountGiven: payment === "CASH" ? given : undefined });
      toast.success("Transaction completed");
      qc.invalidateQueries({ queryKey: ["report-today"] });
    },
    onError: (e: any) => toast.error(e.message || "Failed"),
  });

  const closeReceipt = () => {
    setReceipt(null);
    setCart([]);
    setAmountGiven("");
    refocus();
  };

  return (
    <div className={`h-screen flex flex-col transition-colors ${flash ? "bg-success/10" : ""}`}>
      <input
        ref={scanRef}
        value={scanBuf}
        onChange={(e) => setScanBuf(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            handleBarcodeSubmit(scanBuf);
            setScanBuf("");
          }
        }}
          onBlur={() => {
            setTimeout(() => {
              if (!receipt && document.activeElement?.tagName !== "INPUT") {
                scanRef.current?.focus();
              }
              }, 50);
            }}
            style={{ position: "fixed", left: -9999, top: -9999, opacity: 0, width: 1, height: 1 }}
            aria-hidden
      />

      <div className="flex-1 flex flex-col lg:flex-row min-h-0">
        <div className="flex-1 p-4 md:p-6 overflow-auto border-r">
          <div className="flex items-center gap-2 mb-4">
            <Search className="w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Search product by name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="text-lg h-11"
            />
            <div className="hidden md:flex items-center gap-1 text-xs text-muted-foreground bg-muted px-3 py-2 rounded">
              <ScanBarcode className="w-4 h-4" /> Scanner ready
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {search === "" ? (
              <p className="col-span-full text-muted-foreground text-sm">
                Search for a product or scan a barcode to add to cart.
              </p>
            ) : (searchResults || []).length === 0 ? (
              <p className="col-span-full text-muted-foreground text-sm">No products found.</p>
            ) : (
              (searchResults || []).map((p) => (
                <Card
                  key={pid(p)}
                  onClick={() => addToCart(p)}
                  className="cursor-pointer hover:border-primary hover:shadow-md transition-all"
                >
                  <CardContent className="p-4">
                    <div className="font-semibold line-clamp-1">{p.productName}</div>
                    {p.description && (
                      <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {p.description}
                      </div>
                    )}
                    <div className="text-[11px] text-muted-foreground mt-1">{p.barcode}</div>
                    <div className="text-lg font-bold text-primary mt-2">{fmtKES(p.sellingPrice)}</div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>

        <div className="w-full lg:w-[420px] bg-card flex flex-col">
          <div className="px-4 py-3 border-b">
            <div className="font-semibold text-lg">Cart ({cart.length})</div>
          </div>

          <div className="flex-1 overflow-auto px-4 py-2">
            {cart.length === 0 ? (
              <p className="text-muted-foreground text-sm py-8 text-center">Cart is empty</p>
            ) : (
              <ul className="space-y-3">
                {cart.map((it) => (
                  <li key={pid(it.product)} className="border rounded-lg p-3">
                    <div className="flex justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-medium truncate">{it.product.productName}</div>
                        <div className="text-sm text-muted-foreground">{fmtKES(it.product.sellingPrice)} ea</div>
                      </div>
                      <button onClick={() => removeItem(pid(it.product))} className="text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-2">
                        <Button size="icon" variant="outline" onClick={() => updateQty(pid(it.product), -1)}>
                          <Minus className="w-3 h-3" />
                        </Button>
                        <Input
                          value={it.quantity}
                          onChange={(e) => setQty(pid(it.product), parseFloat(e.target.value))}
                          className="w-16 text-center"
                          inputMode="decimal"
                        />
                        <Button size="icon" variant="outline" onClick={() => updateQty(pid(it.product), 1)}>
                          <Plus className="w-3 h-3" />
                        </Button>
                      </div>
                      <div className="font-semibold">{fmtKES(it.product.sellingPrice * it.quantity)}</div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="border-t p-4 space-y-3 bg-background">
            <div className="flex justify-between text-2xl font-bold">
              <span>Total</span>
              <span className="text-primary">{fmtKES(total)}</span>
            </div>

            <RadioGroup
              value={payment}
              onValueChange={(v) => setPayment(v as any)}
              className="grid grid-cols-2 gap-2"
            >
              <Label
                className={`border rounded-lg p-3 cursor-pointer flex items-center gap-2 ${
                  payment === "CASH" ? "border-primary bg-primary/5" : ""
                }`}
              >
                <RadioGroupItem value="CASH" />
                Cash
              </Label>
              <Label
                className={`border rounded-lg p-3 cursor-pointer flex items-center gap-2 ${
                  payment === "MPESA" ? "border-primary bg-primary/5" : ""
                }`}
              >
                <RadioGroupItem value="MPESA" />
                M-Pesa
              </Label>
            </RadioGroup>

            {payment === "CASH" && (
              <div className="space-y-2">
                <Label>Amount given</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={amountGiven}
                  onChange={(e) => setAmountGiven(e.target.value)}
                  placeholder="0.00"
                />
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Change</span>
                  <span className={`font-semibold ${change < 0 ? "text-destructive" : "text-success"}`}>
                    {fmtKES(Math.max(0, change))}
                  </span>
                </div>
              </div>
            )}

            <Button
              className="w-full h-12 text-lg"
              disabled={cart.length === 0 || checkout.isPending || (payment === "CASH" && given < total)}
              onClick={() => checkout.mutate()}
            >
              {checkout.isPending ? "Processing..." : "Complete Sale"}
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={!!receipt} onOpenChange={(o) => !o && closeReceipt()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Receipt</DialogTitle>
          </DialogHeader>
          {receipt && (
            <>
              <ThermalReceipt data={receipt} />
              <div className="flex gap-2 no-print">
                <Button variant="outline" className="flex-1" onClick={closeReceipt}>
                  Close
                </Button>
                <Button className="flex-1" onClick={() => window.print()}>
                  <Printer className="w-4 h-4 mr-2" /> Print
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
