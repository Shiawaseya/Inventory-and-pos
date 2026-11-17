<?php
// print_agent.php - Runs on Cashier PC: php -S 127.0.0.1:8080 print_agent.php
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["status" => "error", "message" => "Only POST allowed"]);
    exit;
}

$raw = file_get_contents("php://input");
$data = json_decode($raw, true);

if (!$data) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Invalid JSON payload"]);
    exit;
}

try {
    // 1. ESC/P Initializations
    $buffer = "\x1B@" . "\x12"; // Reset + Condensed Mode OFF

    // Top Right Reference Note / Contact (e.g. ROGER / 09384263116)
    $refNote = substr($data['contact_or_ref'] ?? '', 0, 32);
    $buffer .= sprintf("%72s\r\n\r\n", $refNote);

    // Row 1: Customer Name + Date
    $customer = substr($data['customer_name'] ?? '', 0, 42);
    $date     = substr($data['date'] ?? '', 0, 15);
    $buffer .= sprintf("   %-48s %-15s\r\n", $customer, $date);

    // Row 2: Address + TIN + Business Style
    $address = substr($data['address'] ?? '', 0, 35);
    $tin     = substr($data['tin'] ?? '', 0, 15);
    $bStyle  = substr($data['business_style'] ?? '', 0, 15);
    $buffer .= sprintf("   %-38s %-15s %-15s\r\n", $address, $tin, $bStyle);

    // Row 3: Sold By + Delivered By + Authorized By
    $soldBy = substr($data['sold_by'] ?? '', 0, 24);
    $delBy  = substr($data['delivered_by'] ?? '', 0, 18);
    $authBy = substr($data['authorized_by'] ?? '', 0, 20);
    $buffer .= sprintf("   %-28s %-20s %-20s\r\n\r\n", $soldBy, $delBy, $authBy);

    // Row 4: Item Rows (with Model & Serial sub-lines)
    $items = $data['items'] ?? [];
    $rows = 0;
    $maxTableRows = 8; // Adjust based on physical box height

    foreach ($items as $item) {
        $qty       = (int)($item['qty'] ?? 1);
        $desc      = substr($item['description'] ?? '', 0, 38);
        $unitPrice = (float)($item['unit_price'] ?? 0);
        $amount    = (float)($item['amount'] ?? 0);

        $buffer .= sprintf(" %-4d %-38s %10.2f %10.2f\r\n", $qty, $desc, $unitPrice, $amount);
        $rows++;

        // Print extra lines (MODEL and SERIAL)
        if (!empty($item['extra_lines']) && is_array($item['extra_lines'])) {
            foreach ($item['extra_lines'] as $extra) {
                $buffer .= sprintf("      %-38s\r\n", substr($extra, 0, 38));
                $rows++;
            }
        }
    }

    // Pad empty vertical rows down to the totals box
    while ($rows < $maxTableRows) {
        $buffer .= "\r\n";
        $rows++;
    }

    // Row 5: Payment Terms & Tax Breakdown
    $vatable    = (float)($data['vatable_sales'] ?? 0);
    $vatAmount  = (float)($data['vat_amount'] ?? 0);
    $totalDue   = (float)($data['total_amount'] ?? 0);
    $paymentStr = substr($data['payment_method'] ?? 'CASH', 0, 20);

    // 1. VATable Sales
    $buffer .= sprintf("%68.2f\r\n", $vatable);
    
    // 2. VAT-Exempt Sales (blank line to preserve form alignment)
    $buffer .= "\r\n";
    
    // 3. Zero Rated Sales (blank line) + Payment Method on the left
    $buffer .= sprintf("     %-30s\r\n", $paymentStr);
    
    // 4. VAT Amount
    $buffer .= sprintf("%68.2f\r\n", $vatAmount);
    
    // 5. Total Amount Due
    $buffer .= sprintf("%68.2f\r\n\r\n", $totalDue);

    // 6. Bottom Conforme Date
    $buffer .= sprintf("%70s\r\n", $date);

    // Form Feed (eject / advance to next perforation)
    $buffer .= "\x0C";

    // 2. Windows Spool Execution
    $temp = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'spool_' . uniqid() . '.prn';
    file_put_contents($temp, $buffer);

    $printerName = "LX310";
    $cmd = sprintf(
        'powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-Content -Path \'%s\' -Raw | Out-Printer -Name \'%s\'"',
        $temp,
        $printerName
    );
    $out = shell_exec($cmd . " 2>&1");

    if (file_exists($temp)) {
        unlink($temp);
    }

    if (!empty(trim((string)$out))) {
        throw new Exception("Spool failed: " . trim((string)$out));
    }

    echo json_encode(["status" => "success", "message" => "Invoice spooled to LX-310"]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}