public function getInvoiceForPrint(int $salesInvoiceId): array
{
    // 1. Fetch sales invoice and customer information
    $stmt = $this->pdo->prepare('
        SELECT 
            si.sales_invoice_id,
            si.sales_invoice_number,
            si.date_of_purchase,
            si.total_amount,
            si.status,
            c.first_name,
            c.last_name,
            c.contact_number,
            a.street_address,
            a.barangay,
            a.city_municipality,
            a.province,
            a.region,
            a.postal_code,
            c.tin,
            c.business_style
        FROM sales_invoice si
        LEFT JOIN customers c ON c.customer_id = si.customer_id
        LEFT JOIN addresses a ON a.address_id = c.address_id
        WHERE si.sales_invoice_id = :id
        LIMIT 1
    ');
    $stmt->execute([':id' => $salesInvoiceId]);
    $invoice = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$invoice) {
        throw new \InvalidArgumentException("Sales invoice not found: {$salesInvoiceId}");
    }

    // 2. Fetch line items (both serialized units and general inventory items)
    $itemStmt = $this->pdo->prepare('
        SELECT 
            sd.quantity,
            sd.unit_price_at_sale,
            sd.stock_unit_id,
            sd.inventory_id,
            su.serial_number,
            COALESCE(su.model_name, inv.item_name, "Item") AS description
        FROM sales_details sd
        LEFT JOIN stock_unit su ON su.stock_unit_id = sd.stock_unit_id
        LEFT JOIN inventory inv ON inv.inventory_id = sd.inventory_id
        WHERE sd.sales_invoice_id = :id
    ');
    $itemStmt->execute([':id' => $salesInvoiceId]);
    $rawItems = $itemStmt->fetchAll(PDO::FETCH_ASSOC);

    // 3. Format item lines and calculate VAT breakdown
    $formattedItems = [];
    foreach ($rawItems as $item) {
        $extraLines = [];
        if (!empty($item['serial_number'])) {
            $extraLines[] = "SERIAL: " . $item['serial_number'];
        }

        $formattedItems[] = [
            'qty'         => (int)$item['quantity'],
            'description' => $item['description'],
            'extra_lines' => $extraLines,
            'unit_price'  => (float)$item['unit_price_at_sale'],
            'amount'      => (float)$item['unit_price_at_sale'] * (int)$item['quantity']
        ];
    }

    $totalAmount  = (float)$invoice['total_amount'];
    $vatableSales = round($totalAmount / 1.12, 2);
    $vatAmount    = round($totalAmount - $vatableSales, 2);

    $customerFullName = trim(($invoice['first_name'] ?? '') . ' ' . ($invoice['last_name'] ?? ''));

    return [
        'invoice_id'     => (int)$invoice['sales_invoice_id'],
        'invoice_number' => $invoice['sales_invoice_number'],
        'date'           => date('m/d/Y', strtotime($invoice['date_of_purchase'])),
        'customer_name'  => $customerFullName ?: 'Walk-in Customer',
        'address'        => implode(', ', array_filter([
            $invoice['street_address'] ?? null,
            $invoice['barangay'] ?? null,
            $invoice['city_municipality'] ?? null,
            $invoice['province'] ?? null,
            $invoice['region'] ?? null,
            $invoice['postal_code'] ?? null,
        ])),
        'tin'            => $invoice['tin'] ?? '',
        'business_style' => $invoice['business_style'] ?? '',
        'contact_or_ref' => $invoice['contact_number'] ?? '',
        'items'          => $formattedItems,
        'vatable_sales'  => $vatableSales,
        'vat_amount'     => $vatAmount,
        'total_amount'   => $totalAmount
    ];
}