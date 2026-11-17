import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const sample = [
  { location: "Warehouse A", sku: "INV-1001", item: "Barcode Scanner", stock: 18, change: "+2" },
  { location: "Store 1", sku: "INV-1002", item: "Thermal Printer", stock: 7, change: "-1" },
  { location: "Warehouse B", sku: "INV-1003", item: "Receipt Paper", stock: 54, change: "+10" },
];

export default function LiveMonitoringPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Live Monitoring</h1>
        <p className="mt-1 text-muted-foreground">Real-time inventory movement across locations.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Movements</CardTitle>
          <CardDescription>Latest stock changes across locations.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Location</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Item</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Change</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sample.map((r) => (
                <TableRow key={`${r.location}-${r.sku}`}>
                  <TableCell className="font-medium">{r.location}</TableCell>
                  <TableCell>{r.sku}</TableCell>
                  <TableCell>{r.item}</TableCell>
                  <TableCell>{r.stock}</TableCell>
                  <TableCell>
                    <Badge variant={r.change.startsWith("+") ? "default" : "secondary"}>{r.change}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
