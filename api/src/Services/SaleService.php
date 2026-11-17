<?php

namespace App\Services;

use App\Models\StockUnit;
use App\Models\Inventory;
use PDO;

class SaleService
{
    private PDO $pdo;
    private StockUnit $stockUnitModel;
    private Inventory $inventoryModel;

    public function __construct(?PDO $pdo = null)
    {
        $this->pdo = $pdo instanceof PDO ? $pdo : StockUnit::createConnection();
        $this->stockUnitModel = new StockUnit($this->pdo);
        $this->inventoryModel = new Inventory($this->pdo);
    }

    /**
     * Read a stock unit by serial number and lock its row until the transaction ends,
     * so two concurrent drafts cannot both pass the "available" check for the same serial.
     */
    private function lockStockUnitBySerial(string $serial): ?array
    {
        $stmt = $this->pdo->prepare(
            'SELECT stock_unit_id, serial_number, status, variant_id, branch_id
             FROM stock_unit
             WHERE serial_number = :serial
             LIMIT 1
             FOR UPDATE'
        );
        $stmt->execute([':serial' => $serial]);

        return $this->normalizeStockUnitRow($stmt->fetch(PDO::FETCH_ASSOC));
    }

    private function lockStockUnitById(int $id): ?array
    {
        $stmt = $this->pdo->prepare(
            'SELECT stock_unit_id, serial_number, status, variant_id, branch_id
             FROM stock_unit
             WHERE stock_unit_id = :id
             LIMIT 1
             FOR UPDATE'
        );
        $stmt->execute([':id' => $id]);

        return $this->normalizeStockUnitRow($stmt->fetch(PDO::FETCH_ASSOC));
    }

    private function normalizeStockUnitRow($row): ?array
    {
        if (!$row) {
            return null;
        }

        return [
            'stock_unit_id' => (int) $row['stock_unit_id'],
            'serial_number' => $row['serial_number'],
            'status'        => $row['status'],
            'variant_id'    => $row['variant_id'] !== null ? (int) $row['variant_id'] : null,
            'branch_id'     => $row['branch_id'] !== null ? (int) $row['branch_id'] : null,
        ];
    }

    public function createSaleWithSerial(array $data, ?array $user = null, array $auditContext = []): array
    {
        $branchId = isset($data['branch_id']) ? (int)$data['branch_id'] : ($user['branch_id'] ?? null);
        $employeeId = isset($data['employee_id']) ? (int)$data['employee_id'] : ($user['employee_id'] ?? null);
        $authorizedByEmployeeId = isset($data['authorized_by_employee_id'])
            ? (int) $data['authorized_by_employee_id']
            : null;
        $invoiceStatus = $data['status'] ?? 'completed';

        if (!$branchId) {
            throw new \InvalidArgumentException('branch_id is required');
        }

        if (!in_array($invoiceStatus, ['completed', 'authorized', 'parked', 'pending_authorization', 'voided'], true)) {
            throw new \InvalidArgumentException('Invalid sales invoice status');
        }

        if (in_array($invoiceStatus, ['parked', 'pending_authorization', 'voided'], true)) {
            $authorizedByEmployeeId = null;
        }

        if ($authorizedByEmployeeId !== null) {
            $this->assertSalesOic($authorizedByEmployeeId, $branchId);
        }

        $customerId = null;
        if (isset($data['customer_id'])) {
            $customerId = (int)$data['customer_id'];
        } elseif (isset($data['customer']['customer_id']) && $data['customer']['customer_id'] !== '') {
            $customerId = (int) $data['customer']['customer_id'];
        } elseif (!empty($data['customer']) && is_array($data['customer'])) {
            $customerId = $this->findOrCreateCustomer($data['customer']);
        }

        $items = $data['items'] ?? [];
        if (!is_array($items) || empty($items)) {
            throw new \InvalidArgumentException('items array is required');
        }

        $detailsToInsert = [];
        $totalAmount = 0.0;

        try {
            $this->pdo->beginTransaction();

            foreach ($items as $it) {
                $unitPrice = isset($it['unit_price_at_sale']) ? (float)$it['unit_price_at_sale'] : null;
                if ($unitPrice === null || $unitPrice <= 0) {
                    throw new \InvalidArgumentException('unit_price_at_sale must be provided and > 0 for each item');
                }

                if (!empty($it['serials']) || !empty($it['stock_unit_ids'])) {
                    $serials = $it['serials'] ?? [];
                    $stockUnitIds = $it['stock_unit_ids'] ?? [];

                    foreach ($serials as $s) {
                        $s = trim((string)$s);
                        if ($s === '') continue;
                        $su = $this->lockStockUnitBySerial($s);
                        if (!$su) {
                            throw new \RuntimeException("serial not found: {$s}");
                        }
                        if ($su['status'] !== 'available') {
                            throw new \RuntimeException("stock unit not available: {$s}");
                        }
                        if ($su['branch_id'] !== null && $su['branch_id'] !== $branchId) {
                            throw new \RuntimeException("stock unit {$s} belongs to different branch");
                        }
                        $detailsToInsert[] = [
                            'unit_price_at_sale' => $unitPrice,
                            'quantity'           => 1,
                            'stock_unit_id'      => $su['stock_unit_id'],
                            'inventory_id'       => null,
                            'serial_number'      => $s,
                        ];
                        $totalAmount += $unitPrice * 1;
                    }

                    foreach ($stockUnitIds as $id) {
                        $su = $this->lockStockUnitById((int)$id);
                        if (!$su) throw new \RuntimeException("stock unit id not found: {$id}");
                        if ($su['status'] !== 'available') throw new \RuntimeException("stock unit id not available: {$id}");
                        if ($su['branch_id'] !== null && $su['branch_id'] !== $branchId) throw new \RuntimeException("stock unit id {$id} belongs to different branch");
                        $detailsToInsert[] = [
                            'unit_price_at_sale' => $unitPrice,
                            'quantity'           => 1,
                            'stock_unit_id'      => (int)$id,
                            'inventory_id'       => null,
                            'serial_number'      => $su['serial_number'] ?? null,
                        ];
                        $totalAmount += $unitPrice * 1;
                    }

                    continue;
                }

                $variantId = isset($it['variant_id']) ? (int)$it['variant_id'] : null;
                $quantity = isset($it['quantity']) ? (int)$it['quantity'] : null;
                if ($variantId === null || $quantity === null) {
                    throw new \InvalidArgumentException('variant_id and quantity required for non-serialized items');
                }

                $inv = $this->inventoryModel->findByItemAndBranch($variantId, $branchId);
                if (!$inv) {
                    throw new \RuntimeException("inventory row not found for variant {$variantId} at branch {$branchId}");
                }
                if ($inv['quantity'] === null || $inv['quantity'] < $quantity) {
                    throw new \RuntimeException("insufficient inventory for variant {$variantId}");
                }

                $detailsToInsert[] = [
                    'unit_price_at_sale' => $unitPrice,
                    'quantity'           => $quantity,
                    'stock_unit_id'      => null,
                    'inventory_id'       => $inv['inventory_id'],
                    'variant_id'         => $variantId,
                ];
                $totalAmount += $unitPrice * $quantity;
            }

            $invoiceNumber = $this->generateInvoiceNumber();
            $stmt = $this->pdo->prepare(
                'INSERT INTO sales_invoice (
                    sales_invoice_number, date_of_purchase, total_amount, payment_method,
                    customer_id, employee_id, authorized_by_employee_id, branch_id,
                    authorized_at, status, reference_note
                ) VALUES (
                    :num, :date, :total, :pm, :customer, :employee, :authorized_by,
                    :branch, :authorized_at, :status, :reference_note
                )'
            );
            $stmt->execute([
                ':num'            => $invoiceNumber,
                ':date'           => date('Y-m-d'),
                ':total'          => $totalAmount,
                ':pm'             => $data['payment_method'] ?? null,
                ':customer'       => $customerId,
                ':employee'       => $employeeId,
                ':authorized_by'  => $authorizedByEmployeeId,
                ':branch'         => $branchId,
                ':authorized_at'  => $authorizedByEmployeeId !== null ? date('Y-m-d H:i:s') : null,
                ':status'         => $invoiceStatus,
                ':reference_note' => $data['reference_note'] ?? null,
            ]);

            $salesInvoiceId = (int)$this->pdo->lastInsertId();

            $detailInsert = $this->pdo->prepare('INSERT INTO sales_details (unit_price_at_sale, quantity, sales_invoice_id, stock_unit_id, inventory_id, branch_item_pricing_id) VALUES (:price, :qty, :invoice, :stock_unit_id, :inventory_id, :pricing_id)');
            $updateStock = $this->pdo->prepare('UPDATE stock_unit SET status = :status WHERE stock_unit_id = :id');
            $updateInventory = $this->pdo->prepare('UPDATE inventory SET quantity = :quantity, updated_by = :updated_by WHERE inventory_id = :id');

            foreach ($detailsToInsert as $d) {
                $detailInsert->execute([
                    ':price'         => $d['unit_price_at_sale'],
                    ':qty'           => $d['quantity'],
                    ':invoice'       => $salesInvoiceId,
                    ':stock_unit_id' => $d['stock_unit_id'],
                    ':inventory_id'  => $d['inventory_id'],
                    ':pricing_id'    => $d['branch_item_pricing_id'] ?? null,
                ]);

                if ($d['stock_unit_id'] !== null) {
                    $targetStockStatus = 'sold';
                    if (in_array($invoiceStatus, ['authorized', 'parked', 'pending_authorization'], true)) {
                        $targetStockStatus = 'reserved';
                    } elseif ($invoiceStatus === 'voided') {
                        $targetStockStatus = 'available';
                    }

                    $updateStock->execute([
                        ':status' => $targetStockStatus,
                        ':id'     => $d['stock_unit_id'],
                    ]);
                }

                if ($invoiceStatus === 'completed' && $d['inventory_id'] !== null) {
                    $invRow = $this->inventoryModel->findById((int)$d['inventory_id']);
                    $newQty = ($invRow['quantity'] ?? 0) - (int)$d['quantity'];
                    if ($newQty < 0) $newQty = 0;
                    $updateInventory->execute([':quantity' => $newQty, ':updated_by' => $employeeId, ':id' => $d['inventory_id']]);
                }
            }

            // Optional financing details (Home Credit approval) recorded with the invoice
            $financingRecord = null;
            if (!empty($data['financing']) && is_array($data['financing']) && $invoiceStatus !== 'voided') {
                $financingRecord = $this->insertFinancing($salesInvoiceId, $data['financing'], $employeeId);

                $this->writeAuditLog([
                    'action'        => 'CREATE',
                    'module'        => 'invoice_financing',
                    'employee_id'   => $employeeId,
                    'branch_id'     => $branchId,
                    'record_id'     => (string) $financingRecord['financing_id'],
                    'old_values'    => null,
                    'new_values'    => $financingRecord + ['sales_invoice_id' => $salesInvoiceId],
                    'ip_address'    => $auditContext['ip_address'] ?? null,
                    'user_agent'    => $auditContext['user_agent'] ?? null,
                ]);
            }

            // Record to audit_logs
            $action = ($invoiceStatus === 'parked') ? 'CREATE' : 'SALE';
            $this->writeAuditLog([
                'action'        => $action,
                'module'        => 'sales',
                'employee_id'   => $employeeId,
                'branch_id'     => $branchId,
                'record_id'     => (string) $salesInvoiceId,
                'old_values'    => null,
                'new_values'    => [
                    'sales_invoice_number' => $invoiceNumber,
                    'total_amount'         => $totalAmount,
                    'status'               => $invoiceStatus,
                    'payment_method'       => $data['payment_method'] ?? null,
                    'items_count'          => count($detailsToInsert),
                    'customer_id'          => $customerId,
                    'financing_loan_account' => $financingRecord['loan_account_number'] ?? null,
                ],
                'ip_address'    => $auditContext['ip_address'] ?? null,
                'user_agent'    => $auditContext['user_agent'] ?? null,
            ]);

            $this->pdo->commit();

            return [
                'sales_invoice_id'     => $salesInvoiceId,
                'sales_invoice_number' => $invoiceNumber,
                'total_amount'         => $totalAmount,
                'items_count'          => count($detailsToInsert),
                'status'               => $invoiceStatus,
                'financing'            => $financingRecord,
            ];
        } catch (\Throwable $e) {
            if ($this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }
            throw $e;
        }
    }

    public function parkSaleWithSerial(array $data, ?array $user = null, array $auditContext = []): array
    {
        $data['status'] = 'parked';
        unset($data['authorized_by_employee_id']);

        return $this->createSaleWithSerial($data, $user, $auditContext);
    }

    public function authorizeParkedSale(int $salesInvoiceId, int $authorizerId, array $auditContext = []): array
    {
        if ($salesInvoiceId <= 0 || $authorizerId <= 0) {
            throw new \InvalidArgumentException('Valid invoice and authorizer are required');
        }

        try {
            $this->pdo->beginTransaction();

            $invoiceQuery = $this->pdo->prepare(
                'SELECT sales_invoice_id, sales_invoice_number, total_amount, branch_id, status
                 FROM sales_invoice
                 WHERE sales_invoice_id = :invoice_id
                 FOR UPDATE'
            );
            $invoiceQuery->execute([':invoice_id' => $salesInvoiceId]);
            $invoice = $invoiceQuery->fetch(PDO::FETCH_ASSOC);

            if (!$invoice) {
                throw new \InvalidArgumentException('Sales invoice not found');
            }
            if (!in_array($invoice['status'], ['parked', 'pending_authorization'], true)) {
                throw new \InvalidArgumentException('Only parked or pending-authorization invoices can be authorized');
            }

            $branchId = (int) $invoice['branch_id'];
            $this->assertSalesOic($authorizerId, $branchId);

            $detailsQuery = $this->pdo->prepare(
                'SELECT detail_id, quantity, stock_unit_id, inventory_id
                 FROM sales_details
                 WHERE sales_invoice_id = :invoice_id
                 FOR UPDATE'
            );
            $detailsQuery->execute([':invoice_id' => $salesInvoiceId]);
            $details = $detailsQuery->fetchAll(PDO::FETCH_ASSOC);
            if (!$details) {
                throw new \InvalidArgumentException('Parked invoice has no sale details');
            }

            foreach ($details as $detail) {
                if ($detail['stock_unit_id'] !== null) {
                    $stockQuery = $this->pdo->prepare(
                        'SELECT status, branch_id
                         FROM stock_unit
                         WHERE stock_unit_id = :stock_unit_id
                         FOR UPDATE'
                    );
                    $stockQuery->execute([':stock_unit_id' => $detail['stock_unit_id']]);
                    $stockUnit = $stockQuery->fetch(PDO::FETCH_ASSOC);
                    if (!$stockUnit || $stockUnit['status'] !== 'reserved' || (int) $stockUnit['branch_id'] !== $branchId) {
                        throw new \RuntimeException('A parked stock unit is no longer reserved or belongs to another branch');
                    }
                } elseif ($detail['inventory_id'] !== null) {
                    $inventoryQuery = $this->pdo->prepare(
                        'SELECT quantity, branch_id
                         FROM inventory
                         WHERE inventory_id = :inventory_id
                         FOR UPDATE'
                    );
                    $inventoryQuery->execute([':inventory_id' => $detail['inventory_id']]);
                    $inventory = $inventoryQuery->fetch(PDO::FETCH_ASSOC);
                    if (!$inventory || (int) $inventory['branch_id'] !== $branchId || (int) $inventory['quantity'] < (int) $detail['quantity']) {
                        throw new \RuntimeException('Parked inventory is no longer available');
                    }
                }
            }

            // Serials stay 'reserved' and inventory is not deducted here.
            // Both happen when the sale is settled (settleSale).

            $this->pdo->prepare(
                'UPDATE sales_invoice
                 SET status = :status,
                     authorized_by_employee_id = :authorizer_id,
                     authorized_at = :authorized_at
                 WHERE sales_invoice_id = :invoice_id'
            )->execute([
                ':status'        => 'authorized',
                ':authorizer_id' => $authorizerId,
                ':authorized_at' => date('Y-m-d H:i:s'),
                ':invoice_id'    => $salesInvoiceId,
            ]);

            // Audit record under action 'AUTHORIZE'
            $this->writeAuditLog([
                'action'        => 'AUTHORIZE',
                'module'        => 'sales',
                'employee_id'   => $authorizerId,
                'branch_id'     => $branchId,
                'record_id'     => (string) $salesInvoiceId,
                'old_values'    => [
                    'status'                   => $invoice['status'],
                    'authorized_by_employee_id' => null,
                ],
                'new_values'    => [
                    'status'                   => 'authorized',
                    'authorized_by_employee_id' => $authorizerId,
                    'sales_invoice_number'     => $invoice['sales_invoice_number'],
                    'total_amount'             => (float)$invoice['total_amount'],
                ],
                'ip_address'    => $auditContext['ip_address'] ?? null,
                'user_agent'    => $auditContext['user_agent'] ?? null,
            ]);

            $this->pdo->commit();

            return [
                'sales_invoice_id'          => $salesInvoiceId,
                'status'                    => 'authorized',
                'authorized_by_employee_id' => $authorizerId,
            ];
        } catch (\Throwable $e) {
            if ($this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }
            throw $e;
        }
    }

    /**
     * Settle an authorized invoice: the Sales-OIC confirms the money has come back
     * (COD remittance, cash pick-up, or Home Credit payment). Records the settlement,
     * marks the serials sold, deducts inventory and completes the invoice.
     *
     * $data: amount_remitted (required), driver_name, conforme_received, remarks
     */
    public function settleSale(int $salesInvoiceId, int $employeeId, array $data = [], array $auditContext = []): array
    {
        if ($salesInvoiceId <= 0 || $employeeId <= 0) {
            throw new \InvalidArgumentException('Valid invoice and employee are required');
        }

        if (!isset($data['amount_remitted']) || !is_numeric($data['amount_remitted']) || (float) $data['amount_remitted'] < 0) {
            throw new \InvalidArgumentException('amount_remitted is required and must be 0 or more');
        }
        $amountRemitted = round((float) $data['amount_remitted'], 2);

        // Drivers have no system account, so the name is typed in. Empty for pick-up / Home Credit.
        $driverName = isset($data['driver_name']) ? trim((string) $data['driver_name']) : '';
        $driverName = $driverName === '' ? null : $driverName;
        if ($driverName !== null && strlen($driverName) > 150) {
            throw new \InvalidArgumentException('driver_name must be 150 characters or fewer');
        }

        $conformeReceived = false;
        if (isset($data['conforme_received'])) {
            $conformeReceived = filter_var($data['conforme_received'], FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE) ?? false;
        }

        $remarks = isset($data['remarks']) ? trim((string) $data['remarks']) : '';
        $remarks = $remarks === '' ? null : $remarks;
        if ($remarks !== null && strlen($remarks) > 255) {
            throw new \InvalidArgumentException('remarks must be 255 characters or fewer');
        }

        try {
            $this->pdo->beginTransaction();

            $invoiceQuery = $this->pdo->prepare(
                'SELECT sales_invoice_id, sales_invoice_number, total_amount, branch_id, status
                 FROM sales_invoice
                 WHERE sales_invoice_id = :invoice_id
                 FOR UPDATE'
            );
            $invoiceQuery->execute([':invoice_id' => $salesInvoiceId]);
            $invoice = $invoiceQuery->fetch(PDO::FETCH_ASSOC);

            if (!$invoice) {
                throw new \InvalidArgumentException('Sales invoice not found');
            }
            if ($invoice['status'] !== 'authorized') {
                throw new \InvalidArgumentException('Only authorized invoices can be settled');
            }

            $branchId = (int) $invoice['branch_id'];
            $this->assertSalesOic($employeeId, $branchId);

            $existing = $this->pdo->prepare('SELECT settlement_id FROM sales_settlements WHERE sales_invoice_id = :invoice_id LIMIT 1');
            $existing->execute([':invoice_id' => $salesInvoiceId]);
            if ($existing->fetch(PDO::FETCH_ASSOC)) {
                throw new \InvalidArgumentException('This invoice has already been settled');
            }

            // For a financed sale the amount owed to the branch is the financed amount.
            $financingQuery = $this->pdo->prepare(
                'SELECT financing_id, financed_amount, status
                 FROM invoice_financing
                 WHERE sales_invoice_id = :invoice_id
                 FOR UPDATE'
            );
            $financingQuery->execute([':invoice_id' => $salesInvoiceId]);
            $financing = $financingQuery->fetch(PDO::FETCH_ASSOC);

            if ($financing && $financing['status'] === 'cancelled') {
                throw new \InvalidArgumentException('Financing for this invoice was cancelled');
            }
            $amountDue = $financing ? (float) $financing['financed_amount'] : (float) $invoice['total_amount'];

            $detailsQuery = $this->pdo->prepare(
                'SELECT detail_id, quantity, stock_unit_id, inventory_id
                 FROM sales_details
                 WHERE sales_invoice_id = :invoice_id
                 FOR UPDATE'
            );
            $detailsQuery->execute([':invoice_id' => $salesInvoiceId]);
            $details = $detailsQuery->fetchAll(PDO::FETCH_ASSOC);
            if (!$details) {
                throw new \InvalidArgumentException('Invoice has no sale details');
            }

            foreach ($details as $detail) {
                if ($detail['stock_unit_id'] !== null) {
                    $stockQuery = $this->pdo->prepare(
                        'SELECT status, branch_id
                         FROM stock_unit
                         WHERE stock_unit_id = :stock_unit_id
                         FOR UPDATE'
                    );
                    $stockQuery->execute([':stock_unit_id' => $detail['stock_unit_id']]);
                    $stockUnit = $stockQuery->fetch(PDO::FETCH_ASSOC);
                    if (!$stockUnit || $stockUnit['status'] !== 'reserved' || (int) $stockUnit['branch_id'] !== $branchId) {
                        throw new \RuntimeException('A stock unit is no longer reserved for this invoice');
                    }

                    $this->pdo->prepare(
                        'UPDATE stock_unit SET status = :status WHERE stock_unit_id = :stock_unit_id'
                    )->execute([
                        ':status'        => 'sold',
                        ':stock_unit_id' => $detail['stock_unit_id'],
                    ]);
                } elseif ($detail['inventory_id'] !== null) {
                    $deduct = $this->pdo->prepare(
                        'UPDATE inventory
                         SET quantity = quantity - :quantity,
                             updated_by = :updated_by
                         WHERE inventory_id = :inventory_id
                           AND branch_id = :branch_id
                           AND quantity >= :min_quantity'
                    );
                    $deduct->execute([
                        ':quantity'     => (int) $detail['quantity'],
                        ':updated_by'   => $employeeId,
                        ':inventory_id' => $detail['inventory_id'],
                        ':branch_id'    => $branchId,
                        ':min_quantity' => (int) $detail['quantity'],
                    ]);
                    if ($deduct->rowCount() === 0) {
                        throw new \RuntimeException('Insufficient inventory to settle this invoice');
                    }
                }
            }

            $this->pdo->prepare(
                'INSERT INTO sales_settlements (
                    sales_invoice_id, driver_name, amount_due, amount_remitted,
                    conforme_received, received_by_employee_id, remarks
                 ) VALUES (
                    :invoice_id, :driver_name, :amount_due, :amount_remitted,
                    :conforme_received, :received_by, :remarks
                 )'
            )->execute([
                ':invoice_id'        => $salesInvoiceId,
                ':driver_name'       => $driverName,
                ':amount_due'        => $amountDue,
                ':amount_remitted'   => $amountRemitted,
                ':conforme_received' => $conformeReceived ? 1 : 0,
                ':received_by'       => $employeeId,
                ':remarks'           => $remarks,
            ]);
            $settlementId = (int) $this->pdo->lastInsertId();

            $this->pdo->prepare(
                'UPDATE sales_invoice
                 SET status = :status
                 WHERE sales_invoice_id = :invoice_id'
            )->execute([
                ':status'     => 'completed',
                ':invoice_id' => $salesInvoiceId,
            ]);

            $this->writeAuditLog([
                'action'        => 'SALE',
                'module'        => 'sales_settlements',
                'employee_id'   => $employeeId,
                'branch_id'     => $branchId,
                'record_id'     => (string) $settlementId,
                'old_values'    => ['status' => 'authorized'],
                'new_values'    => [
                    'status'               => 'completed',
                    'sales_invoice_id'     => $salesInvoiceId,
                    'sales_invoice_number' => $invoice['sales_invoice_number'],
                    'amount_due'           => $amountDue,
                    'amount_remitted'      => $amountRemitted,
                    'driver_name'          => $driverName,
                    'conforme_received'    => $conformeReceived,
                    'financed'             => (bool) $financing,
                ],
                'ip_address'    => $auditContext['ip_address'] ?? null,
                'user_agent'    => $auditContext['user_agent'] ?? null,
            ]);

            $this->pdo->commit();

            return [
                'sales_invoice_id' => $salesInvoiceId,
                'settlement_id'    => $settlementId,
                'status'           => 'completed',
                'amount_due'       => $amountDue,
                'amount_remitted'  => $amountRemitted,
                'variance'         => round($amountRemitted - $amountDue, 2),
            ];
        } catch (\Throwable $e) {
            if ($this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }
            throw $e;
        }
    }

    public function markPendingAuthorization(int $salesInvoiceId, int $employeeId, array $auditContext = []): array
    {
        if ($salesInvoiceId <= 0 || $employeeId <= 0) {
            throw new \InvalidArgumentException('Valid invoice and employee are required');
        }

        try {
            $this->pdo->beginTransaction();

            $invoiceQuery = $this->pdo->prepare(
                'SELECT sales_invoice_id, branch_id, employee_id, status, sales_invoice_number
                 FROM sales_invoice
                 WHERE sales_invoice_id = :invoice_id
                 FOR UPDATE'
            );
            $invoiceQuery->execute([':invoice_id' => $salesInvoiceId]);
            $invoice = $invoiceQuery->fetch(PDO::FETCH_ASSOC);

            if (!$invoice) {
                throw new \InvalidArgumentException('Sales invoice not found');
            }
            if ($invoice['status'] !== 'parked') {
                throw new \InvalidArgumentException('Only parked invoices can be resumed');
            }
            if ((int) $invoice['employee_id'] !== $employeeId) {
                throw new \InvalidArgumentException('Only the employee who created the invoice can resume it');
            }

            $detailsQuery = $this->pdo->prepare(
                'SELECT stock_unit_id
                 FROM sales_details
                 WHERE sales_invoice_id = :invoice_id
                   AND stock_unit_id IS NOT NULL
                 FOR UPDATE'
            );
            $detailsQuery->execute([':invoice_id' => $salesInvoiceId]);
            foreach ($detailsQuery->fetchAll(PDO::FETCH_ASSOC) as $detail) {
                $stockQuery = $this->pdo->prepare(
                    'SELECT status, branch_id
                     FROM stock_unit
                     WHERE stock_unit_id = :stock_unit_id
                     FOR UPDATE'
                );
                $stockQuery->execute([':stock_unit_id' => $detail['stock_unit_id']]);
                $stockUnit = $stockQuery->fetch(PDO::FETCH_ASSOC);
                if (!$stockUnit || $stockUnit['status'] !== 'reserved' || (int) $stockUnit['branch_id'] !== (int) $invoice['branch_id']) {
                    throw new \RuntimeException('A reserved stock unit is no longer available for this invoice');
                }
            }

            $this->pdo->prepare(
                'UPDATE sales_invoice
                 SET status = :status
                 WHERE sales_invoice_id = :invoice_id'
            )->execute([
                ':status'     => 'pending_authorization',
                ':invoice_id' => $salesInvoiceId,
            ]);

            // Audit record under action 'RESUME'
            $this->writeAuditLog([
                'action'        => 'RESUME',
                'module'        => 'sales',
                'employee_id'   => $employeeId,
                'branch_id'     => (int) $invoice['branch_id'],
                'record_id'     => (string) $salesInvoiceId,
                'old_values'    => ['status' => 'parked'],
                'new_values'    => ['status' => 'pending_authorization'],
                'ip_address'    => $auditContext['ip_address'] ?? null,
                'user_agent'    => $auditContext['user_agent'] ?? null,
            ]);

            $this->pdo->commit();

            return [
                'sales_invoice_id'  => $salesInvoiceId,
                'status'            => 'pending_authorization',
                'stock_unit_status' => 'reserved',
            ];
        } catch (\Throwable $e) {
            if ($this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }
            throw $e;
        }
    }

    public function voidSale(int $salesInvoiceId, int $employeeId, array $auditContext = []): array
    {
        if ($salesInvoiceId <= 0 || $employeeId <= 0) {
            throw new \InvalidArgumentException('Valid invoice and employee are required');
        }

        try {
            $this->pdo->beginTransaction();

            $invoiceQuery = $this->pdo->prepare(
                'SELECT sales_invoice_id, branch_id, status, sales_invoice_number, total_amount
                 FROM sales_invoice
                 WHERE sales_invoice_id = :invoice_id
                 FOR UPDATE'
            );
            $invoiceQuery->execute([':invoice_id' => $salesInvoiceId]);
            $invoice = $invoiceQuery->fetch(PDO::FETCH_ASSOC);

            if (!$invoice) {
                throw new \InvalidArgumentException('Sales invoice not found');
            }
            if (!in_array($invoice['status'], ['completed', 'parked', 'pending_authorization', 'authorized'], true)) {
                throw new \InvalidArgumentException('Only active sales invoices can be voided');
            }

            $branchId = (int) $invoice['branch_id'];
            $this->assertSalesOic($employeeId, $branchId);

            $detailsQuery = $this->pdo->prepare(
                'SELECT stock_unit_id, inventory_id, quantity
                 FROM sales_details
                 WHERE sales_invoice_id = :invoice_id
                 FOR UPDATE'
            );
            $detailsQuery->execute([':invoice_id' => $salesInvoiceId]);
            $details = $detailsQuery->fetchAll(PDO::FETCH_ASSOC);

            foreach ($details as $detail) {
                if ($detail['stock_unit_id'] !== null) {
                    $stockQuery = $this->pdo->prepare(
                        'SELECT status, branch_id
                         FROM stock_unit
                         WHERE stock_unit_id = :stock_unit_id
                         FOR UPDATE'
                    );
                    $stockQuery->execute([':stock_unit_id' => $detail['stock_unit_id']]);
                    $stockUnit = $stockQuery->fetch(PDO::FETCH_ASSOC);

                    if (!$stockUnit || (int) $stockUnit['branch_id'] !== $branchId) {
                        throw new \RuntimeException('A stock unit does not belong to the invoice branch');
                    }
                    if (!in_array($stockUnit['status'], ['reserved', 'sold'], true)) {
                        throw new \RuntimeException('A stock unit is not reserved or sold for this invoice');
                    }
                }
            }

            foreach ($details as $detail) {
                if ($detail['stock_unit_id'] !== null) {
                    $this->pdo->prepare(
                        'UPDATE stock_unit SET status = :status WHERE stock_unit_id = :stock_unit_id'
                    )->execute([
                        ':status'        => 'available',
                        ':stock_unit_id' => $detail['stock_unit_id'],
                    ]);
                } elseif ($invoice['status'] === 'completed' && $detail['inventory_id'] !== null) {
                    $this->pdo->prepare(
                        'UPDATE inventory
                         SET quantity = quantity + :quantity,
                             updated_by = :updated_by
                         WHERE inventory_id = :inventory_id
                           AND branch_id = :branch_id'
                    )->execute([
                        ':quantity'     => (int) $detail['quantity'],
                        ':updated_by'   => $employeeId,
                        ':inventory_id' => $detail['inventory_id'],
                        ':branch_id'    => $branchId,
                    ]);
                }
            }

            $this->pdo->prepare(
                'UPDATE sales_invoice
                 SET status = :status
                 WHERE sales_invoice_id = :invoice_id'
            )->execute([
                ':status'     => 'voided',
                ':invoice_id' => $salesInvoiceId,
            ]);

            // A voided sale cancels its financing record, if it has one
            $cancelFinancing = $this->pdo->prepare(
                "UPDATE invoice_financing
                 SET status = 'cancelled', cancelled_at = :cancelled_at
                 WHERE sales_invoice_id = :invoice_id AND status = 'approved'"
            );
            $cancelFinancing->execute([
                ':cancelled_at' => date('Y-m-d H:i:s'),
                ':invoice_id'   => $salesInvoiceId,
            ]);
            $financingCancelled = $cancelFinancing->rowCount() > 0;

            // The settlement row (if any) is kept as history
            $settledQuery = $this->pdo->prepare('SELECT 1 FROM sales_settlements WHERE sales_invoice_id = :invoice_id LIMIT 1');
            $settledQuery->execute([':invoice_id' => $salesInvoiceId]);
            $wasSettled = (bool) $settledQuery->fetch(PDO::FETCH_ASSOC);

            // Audit record under action 'VOID'
            $this->writeAuditLog([
                'action'        => 'VOID',
                'module'        => 'sales',
                'employee_id'   => $employeeId,
                'branch_id'     => $branchId,
                'record_id'     => (string) $salesInvoiceId,
                'old_values'    => ['status' => $invoice['status'], 'was_settled' => $wasSettled],
                'new_values'    => ['status' => 'voided', 'financing_cancelled' => $financingCancelled],
                'ip_address'    => $auditContext['ip_address'] ?? null,
                'user_agent'    => $auditContext['user_agent'] ?? null,
            ]);

            $this->pdo->commit();

            return [
                'sales_invoice_id'  => $salesInvoiceId,
                'status'            => 'voided',
                'stock_unit_status' => 'available',
                'financing_cancelled' => $financingCancelled,
            ];
        } catch (\Throwable $e) {
            if ($this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }
            throw $e;
        }
    }

    public function getInvoiceForPrint(int $salesInvoiceId): array
    {
        $stmt = $this->pdo->prepare('
            SELECT 
                si.sales_invoice_id,
                si.sales_invoice_number,
                si.date_of_purchase,
                si.total_amount,
                si.payment_method,
                si.reference_note,
                c.first_name AS cust_first,
                c.middle_name AS cust_middle,
                c.last_name AS cust_last,
                c.contact_number AS cust_contact,
                a.street_address AS cust_street_address,
                a.barangay AS cust_barangay,
                a.city_municipality AS cust_city_municipality,
                a.province AS cust_province,
                a.region AS cust_region,
                a.postal_code AS cust_postal_code,
                c.tin AS cust_tin,
                c.business_style AS cust_business_style,
                emp.first_name AS emp_first,
                emp.last_name AS emp_last,
                auth.first_name AS auth_first,
                auth.last_name AS auth_last
            FROM sales_invoice si
            LEFT JOIN customers c ON c.customer_id = si.customer_id
            LEFT JOIN addresses a ON a.address_id = c.address_id
            LEFT JOIN employees emp ON emp.employee_id = si.employee_id
            LEFT JOIN employees auth ON auth.employee_id = si.authorized_by_employee_id
            WHERE si.sales_invoice_id = :id
            LIMIT 1
        ');
        $stmt->execute([':id' => $salesInvoiceId]);
        $invoice = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$invoice) {
            throw new \InvalidArgumentException("Sales invoice not found: {$salesInvoiceId}");
        }

        $itemStmt = $this->pdo->prepare('
            SELECT 
                sd.quantity,
                sd.unit_price_at_sale,
                su.serial_number,
                COALESCE(i_stock.name, i_inv.name, "Item") AS item_name,
                COALESCE(v_stock.model, v_inv.model, "") AS item_model
            FROM sales_details sd
            LEFT JOIN stock_unit su ON su.stock_unit_id = sd.stock_unit_id
            LEFT JOIN item_variants v_stock ON v_stock.variant_id = su.variant_id
            LEFT JOIN items i_stock ON i_stock.item_id = v_stock.item_id
            LEFT JOIN inventory inv ON inv.inventory_id = sd.inventory_id
            LEFT JOIN item_variants v_inv ON v_inv.variant_id = inv.variant_id
            LEFT JOIN items i_inv ON i_inv.item_id = v_inv.item_id
            WHERE sd.sales_invoice_id = :id
        ');
        $itemStmt->execute([':id' => $salesInvoiceId]);
        $rawItems = $itemStmt->fetchAll(PDO::FETCH_ASSOC);

        $formattedItems = [];
        foreach ($rawItems as $item) {
            $extra = [];
            if (!empty($item['item_model'])) {
                $extra[] = "MODEL: " . $item['item_model'];
            }
            if (!empty($item['serial_number'])) {
                $extra[] = "SERIAL: " . $item['serial_number'];
            }

            $formattedItems[] = [
                'qty'         => (int)$item['quantity'],
                'description' => $item['item_name'],
                'extra_lines' => $extra,
                'unit_price'  => (float)$item['unit_price_at_sale'],
                'amount'      => (float)$item['unit_price_at_sale'] * (int)$item['quantity']
            ];
        }

        $totalAmount  = (float)$invoice['total_amount'];
        $vatableSales = round($totalAmount / 1.12, 2);
        $vatAmount    = round($totalAmount - $vatableSales, 2);

        $custName = trim(($invoice['cust_first'] ?? '') . ' ' . ($invoice['cust_middle'] ?? '') . ' ' . ($invoice['cust_last'] ?? ''));

        return [
            'customer_name'  => $custName ?: 'Walk-in Customer',
            'date'           => !empty($invoice['date_of_purchase']) ? date('m/d/y', strtotime($invoice['date_of_purchase'])) : date('m/d/y'),
            'address'        => implode(', ', array_filter([
                $invoice['cust_street_address'] ?? null,
                $invoice['cust_barangay'] ?? null,
                $invoice['cust_city_municipality'] ?? null,
                $invoice['cust_province'] ?? null,
                $invoice['cust_region'] ?? null,
                $invoice['cust_postal_code'] ?? null,
            ])),
            'tin'            => $invoice['cust_tin'] ?? '',
            'business_style' => $invoice['cust_business_style'] ?? '',
            'sold_by'        => trim(($invoice['emp_first'] ?? '') . ' ' . ($invoice['emp_last'] ?? '')),
            'authorized_by'  => trim(($invoice['auth_first'] ?? '') . ' ' . ($invoice['auth_last'] ?? '')),
            'delivered_by'   => '',
            'contact_or_ref' => $invoice['reference_note'] ?? $invoice['cust_contact'] ?? '',
            'payment_method' => $invoice['payment_method'] ?? 'CASH',
            'items'          => $formattedItems,
            'vatable_sales'  => $vatableSales,
            'vat_amount'     => $vatAmount,
            'total_amount'   => $totalAmount
        ];
    }

    private function insertFinancing(int $salesInvoiceId, array $f, ?int $employeeId): array
    {
        $loan = trim((string) ($f['loan_account_number'] ?? ''));
        if ($loan === '' || strlen($loan) > 20) {
            throw new \InvalidArgumentException('financing.loan_account_number is required (max 20 characters)');
        }

        $deliveryAdviceRef = trim((string) ($f['delivery_advice_ref'] ?? ''));
        if ($deliveryAdviceRef === '' || strlen($deliveryAdviceRef) > 100) {
            throw new \InvalidArgumentException('financing.delivery_advice_ref is required (max 100 characters)');
        }

        $financed = isset($f['financed_amount']) && is_numeric($f['financed_amount']) ? round((float) $f['financed_amount'], 2) : 0.0;
        if ($financed <= 0) {
            throw new \InvalidArgumentException('financing.financed_amount must be greater than 0');
        }

        $down = isset($f['downpayment_amount']) && is_numeric($f['downpayment_amount']) ? round((float) $f['downpayment_amount'], 2) : 0.0;
        if ($down < 0) {
            throw new \InvalidArgumentException('financing.downpayment_amount cannot be negative');
        }

        $approved = trim((string) ($f['approved_date'] ?? ''));
        $parsed = \DateTime::createFromFormat('Y-m-d', $approved);
        if (!$parsed || $parsed->format('Y-m-d') !== $approved) {
            throw new \InvalidArgumentException('financing.approved_date is required (YYYY-MM-DD)');
        }

        $provider = trim((string) ($f['provider'] ?? 'Home Credit'));
        if ($provider === '') {
            $provider = 'Home Credit';
        }
        if (strlen($provider) > 50) {
            throw new \InvalidArgumentException('financing.provider must be 50 characters or fewer');
        }

        $remarks = isset($f['remarks']) ? trim((string) $f['remarks']) : '';
        $remarks = $remarks === '' ? null : $remarks;
        if ($remarks !== null && strlen($remarks) > 255) {
            throw new \InvalidArgumentException('financing.remarks must be 255 characters or fewer');
        }

        $dup = $this->pdo->prepare('SELECT financing_id FROM invoice_financing WHERE provider = :provider AND loan_account_number = :loan LIMIT 1');
        $dup->execute([':provider' => $provider, ':loan' => $loan]);
        if ($dup->fetch(PDO::FETCH_ASSOC)) {
            throw new \InvalidArgumentException('This loan account number is already recorded on another invoice');
        }

        $this->pdo->prepare(
            'INSERT INTO invoice_financing (
                sales_invoice_id, provider, loan_account_number, delivery_advice_ref, financed_amount,
                downpayment_amount, approved_date, status, remarks, recorded_by_employee_id
             ) VALUES (
                :invoice_id, :provider, :loan, :delivery_advice_ref, :financed,
                :down, :approved, :status, :remarks, :recorded_by
             )'
        )->execute([
            ':invoice_id'         => $salesInvoiceId,
            ':provider'           => $provider,
            ':loan'               => $loan,
            ':delivery_advice_ref' => $deliveryAdviceRef,
            ':financed'           => $financed,
            ':down'               => $down,
            ':approved'           => $approved,
            ':status'             => 'approved',
            ':remarks'            => $remarks,
            ':recorded_by'        => $employeeId,
        ]);

        return [
            'financing_id'        => (int) $this->pdo->lastInsertId(),
            'provider'            => $provider,
            'loan_account_number' => $loan,
            'delivery_advice_ref' => $deliveryAdviceRef,
            'financed_amount'     => $financed,
            'downpayment_amount'  => $down,
            'approved_date'       => $approved,
            'status'              => 'approved',
        ];
    }

    private function writeAuditLog(array $payload): void
    {
        $employeeId = $payload['employee_id'] ?? null;
        $employeeName = null;

        if ($employeeId) {
            $stmt = $this->pdo->prepare('SELECT first_name, middle_name, last_name FROM employees WHERE employee_id = :id');
            $stmt->execute([':id' => $employeeId]);
            $emp = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($emp) {
                $employeeName = trim(preg_replace('/\s+/', ' ', sprintf(
                    '%s %s %s',
                    $emp['first_name'] ?? '',
                    $emp['middle_name'] ?? '',
                    $emp['last_name'] ?? ''
                )));
            }
        }

        $auditStmt = $this->pdo->prepare("
            INSERT INTO audit_logs (
                employee_id, employee_name, branch_id, action, module, record_id, old_values, new_values, ip_address, user_agent
            ) VALUES (
                :employee_id, :employee_name, :branch_id, :action, :module, :record_id, :old_values, :new_values, :ip_address, :user_agent
            )
        ");

        $auditStmt->execute([
            ':employee_id'   => $employeeId,
            ':employee_name' => $employeeName,
            ':branch_id'     => $payload['branch_id'] ?? null,
            ':action'        => $payload['action'],
            ':module'        => $payload['module'],
            ':record_id'     => $payload['record_id'],
            ':old_values'    => $payload['old_values'] !== null ? json_encode($payload['old_values']) : null,
            ':new_values'    => $payload['new_values'] !== null ? json_encode($payload['new_values']) : null,
            ':ip_address'    => $payload['ip_address'] ?? null,
            ':user_agent'    => $payload['user_agent'] ?? null,
        ]);
    }

    private function assertSalesOic(int $employeeId, int $branchId): void
    {
        $authorizerQuery = $this->pdo->prepare(
            'SELECT e.employee_id
             FROM employees e
             INNER JOIN roles r ON r.role_id = e.role_id
             WHERE e.employee_id = :employee_id
               AND e.branch_id = :branch_id
               AND e.is_active = 1
               AND r.role_key = :role_key
             LIMIT 1'
        );
        $authorizerQuery->execute([
            ':employee_id' => $employeeId,
            ':branch_id'   => $branchId,
            ':role_key'    => 'sales-oic',
        ]);

        if (!$authorizerQuery->fetch(PDO::FETCH_ASSOC)) {
            throw new \InvalidArgumentException('Authorized employee must be an active Sales OIC assigned to the branch');
        }
    }

    private function findOrCreateCustomer(array $c): ?int
    {
        $first = $c['first_name'] ?? null;
        $last = $c['last_name'] ?? null;
        $contact = $c['contact_number'] ?? null;

        if ($contact) {
            $stmt = $this->pdo->prepare('SELECT customer_id FROM customers WHERE contact_number = :contact LIMIT 1');
            $stmt->execute([':contact' => $contact]);
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($row && isset($row['customer_id'])) {
                return (int)$row['customer_id'];
            }
        }

        $address = is_array($c['address'] ?? null) ? $c['address'] : $c;
        $addressStmt = $this->pdo->prepare(
            'INSERT INTO addresses
                (street_address, barangay, city_municipality, province, region, postal_code, psgc_code)
             VALUES
                (:street_address, :barangay, :city_municipality, :province, :region, :postal_code, :psgc_code)'
        );
        $addressStmt->execute([
            ':street_address'    => $address['street_address'] ?? null,
            ':barangay'          => $address['barangay'] ?? null,
            ':city_municipality' => $address['city_municipality'] ?? null,
            ':province'          => $address['province'] ?? null,
            ':region'            => $address['region'] ?? null,
            ':postal_code'       => $address['postal_code'] ?? null,
            ':psgc_code'         => $address['psgc_code'] ?? null,
        ]);
        $addressId = (int) $this->pdo->lastInsertId();

        $stmt = $this->pdo->prepare(
            'INSERT INTO customers
                (first_name, middle_name, last_name, contact_number, email_address, address_id,
                 tin, business_style)
             VALUES
                (:first, :middle, :last, :contact, :email, :address_id,
                 :tin, :business_style)'
        );
        $stmt->execute([
            ':first'          => $first,
            ':middle'         => $c['middle_name'] ?? null,
            ':last'           => $last,
            ':contact'        => $contact,
            ':email'          => $c['email_address'] ?? null,
            ':address_id'     => $addressId,
            ':tin'            => $c['tin'] ?? null,
            ':business_style' => $c['business_style'] ?? null,
        ]);
        return (int)$this->pdo->lastInsertId();
    }

    private function generateInvoiceNumber(): string
    {
        return 'INV-' . date('YmdHis') . '-' . random_int(1000, 9999);
    }
}