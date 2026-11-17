import React from "react";
import SalesInvoiceRoute from "@/features/items/view/SalesInvoiceRoute";

export default function TransactionsPage() {
  return (
    <div className="h-full w-full overflow-y-auto p-6 custom-scrollbar">
      <div className="max-w-[1600px] mx-auto space-y-6">
        <div className="space-y-6">
          <SalesInvoiceRoute />
        </div>
      </div>
    </div>
  );
}
