import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useState } from "react";

const samplePOs = [
  { id: "PO-1001", vendor: "ACME Supplies", date: "2026-03-01", status: "Open", total: 1240 },
  { id: "PO-1002", vendor: "PrinterCo", date: "2026-03-05", status: "Received", total: 560 },
];

export default function PurchaseOrdersPage() {
  const [search, setSearch] = useState("");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Purchase Orders</h1>
        <p className="mt-1 text-muted-foreground">Manage procurement and incoming orders.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Purchase Orders</CardTitle>
          <CardDescription>Overview of recent procurement activity.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center mb-4">
            <div className="flex gap-2">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search PO, vendor"
                className="input bg-transparent border px-2 py-1 rounded"
              />
              <Button>Search</Button>
            </div>
            <Button variant="secondary">Create PO</Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>PO #</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {samplePOs.map((po) => (
                <TableRow key={po.id}>
                  <TableCell className="font-medium">{po.id}</TableCell>
                  <TableCell>{po.vendor}</TableCell>
                  <TableCell>{po.date}</TableCell>
                  <TableCell>{po.status}</TableCell>
                  <TableCell>₱{po.total}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
