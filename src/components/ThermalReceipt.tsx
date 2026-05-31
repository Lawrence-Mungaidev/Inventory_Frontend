import { fmtKES, fmtDate } from "@/lib/format";

export type ReceiptData = {
  receiptNumber: string;
  createdAt: string;
  cashierName: string;
  items: { productName: string; quantity: number; price: number; totalPrice: number }[];
  totalAmount: number;
  balance: number;
  paymentMethod: string;
  amountGiven?: number;
};

export function ThermalReceipt({ data }: { data: ReceiptData }) {
  return (
    <div className="print-area receipt-thermal text-[12px] leading-tight p-3 mx-auto" style={{ maxWidth: "320px" }}>
      <div className="text-center">
        <div className="font-extrabold text-lg tracking-wider">QUICK-SAVE MINI MART</div>
      </div>
      <div className="divider" />
      <div>Receipt: <b>{data.receiptNumber}</b></div>
      <div>Date: {fmtDate(data.createdAt)}</div>
      <div>Cashier: {data.cashierName}</div>
      <div className="divider" />
      <table className="w-full">
        <thead>
          <tr className="text-left">
            <th className="text-left">Item</th>
            <th className="text-right">Qty</th>
            <th className="text-right">Price</th>
            <th className="text-right">Sub</th>
          </tr>
        </thead>
        <tbody>
          {data.items.map((it, i) => (
            <tr key={i}>
              <td className="pr-1">{it.productName}</td>
              <td className="text-right">{it.quantity}</td>
              <td className="text-right">{fmtKES(it.price)}</td>
              <td className="text-right">{fmtKES(it.totalPrice)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="divider" />
      <div className="flex justify-between font-bold">
        <span>TOTAL</span>
        <span>{fmtKES(data.totalAmount)}</span>
      </div>
      <div className="flex justify-between">
        <span>Payment</span>
        <span>{data.paymentMethod}</span>
      </div>
      {data.paymentMethod === "CASH" && (
        <>
          {data.amountGiven !== undefined && (
            <div className="flex justify-between">
              <span>Cash Given</span>
              <span>{fmtKES(data.amountGiven)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span>Change</span>
            <span>{fmtKES(data.balance)}</span>
          </div>
        </>
      )}
      <div className="divider" />
      <div className="text-center">Thank you for shopping with us!</div>
    </div>
  );
}
