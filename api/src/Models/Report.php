<?php

namespace App\Models;

use PDO;

class Report extends BaseModel
{


    /**
     * Generate a daily sales report for a given branch and date.
     *
     * Returns an associative array with keys:
     * - date
     * - branch_id
     * - total_revenue
     * - invoice_count
     * - total_items_sold
     * - by_item: [ { item_id, name, qty_sold, revenue }, ... ]
     * - by_payment_method: [ payment_method => [invoices, revenue], ... ]
     */
    public function generateDailySalesReportByBranchId(int $branchId, ?string $date = null): array
    {
        return $this->generateDailySalesReport($branchId, null, $date);
    }

    public function generateDailySalesReport(int $branchId, ?int $employeeId = null, ?string $date = null): array
    {
        $date = $date ?: (new \DateTimeImmutable('today'))->format('Y-m-d');
        $employeeCondition = $employeeId === null ? '' : ' AND si.employee_id = :employee_id';
        $params = [':branch_id' => $branchId, ':date' => $date];
        if ($employeeId !== null) {
            $params[':employee_id'] = $employeeId;
        }

        $stmt = $this->pdo->prepare(
            "SELECT COUNT(*) AS invoice_count, COALESCE(SUM(total_amount), 0) AS total_revenue
             FROM sales_invoice si
             WHERE si.branch_id = :branch_id
               AND si.status = 'completed'
               AND si.date_of_purchase = :date{$employeeCondition}"
        );
        $stmt->execute($params);
        $summary = $stmt->fetch(PDO::FETCH_ASSOC) ?: ['invoice_count' => 0, 'total_revenue' => 0];

        $stmt = $this->pdo->prepare(
            "SELECT COALESCE(SUM(sd.quantity), 0) AS total_items_sold
             FROM sales_details sd
             JOIN sales_invoice si ON si.sales_invoice_id = sd.sales_invoice_id
             WHERE si.branch_id = :branch_id
               AND si.status = 'completed'
               AND si.date_of_purchase = :date{$employeeCondition}"
        );
        $stmt->execute($params);
        $itemsTotal = $stmt->fetch(PDO::FETCH_ASSOC) ?: ['total_items_sold' => 0];

        $stmt = $this->pdo->prepare(
            "SELECT i.item_id, i.name AS item_name, iv.variant_id, iv.model AS variant_model,
                    COALESCE(SUM(sd.quantity), 0) AS qty_sold,
                    COALESCE(SUM(sd.unit_price_at_sale * sd.quantity), 0) AS revenue
             FROM sales_details sd
             JOIN sales_invoice si ON si.sales_invoice_id = sd.sales_invoice_id
             LEFT JOIN stock_unit su ON su.stock_unit_id = sd.stock_unit_id
             LEFT JOIN inventory inv ON inv.inventory_id = sd.inventory_id
             JOIN item_variants iv ON iv.variant_id = COALESCE(su.variant_id, inv.variant_id)
             JOIN items i ON i.item_id = iv.item_id
             WHERE si.branch_id = :branch_id
               AND si.status = 'completed'
               AND si.date_of_purchase = :date{$employeeCondition}
             GROUP BY i.item_id, i.name, iv.variant_id, iv.model
             ORDER BY revenue DESC"
        );
        $stmt->execute($params);
        $byItem = array_map(static function (array $row): array {
            return [
                'item_id' => (int) $row['item_id'],
                'name' => $row['item_name'],
                'variant_id' => (int) $row['variant_id'],
                'variant_model' => $row['variant_model'],
                'qty_sold' => (int) $row['qty_sold'],
                'revenue' => (float) $row['revenue'],
            ];
        }, $stmt->fetchAll(PDO::FETCH_ASSOC));

        $stmt = $this->pdo->prepare(
            "SELECT payment_method, COUNT(*) AS invoices, COALESCE(SUM(total_amount), 0) AS revenue
             FROM sales_invoice si
             WHERE si.branch_id = :branch_id
               AND si.status = 'completed'
               AND si.date_of_purchase = :date{$employeeCondition}
             GROUP BY payment_method"
        );
        $stmt->execute($params);
        $byPayment = [];
        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
            $byPayment[$row['payment_method'] ?: 'unknown'] = [
                'invoices' => (int) $row['invoices'],
                'revenue' => (float) $row['revenue'],
            ];
        }

        $stmt = $this->pdo->prepare(
            "SELECT si.sales_invoice_id, si.sales_invoice_number, si.date_of_purchase,
                    si.total_amount, si.payment_method, si.employee_id,
                    CONCAT_WS(' ', e.first_name, e.last_name) AS salesperson
             FROM sales_invoice si
             LEFT JOIN employees e ON e.employee_id = si.employee_id
             WHERE si.branch_id = :branch_id
               AND si.status = 'completed'
               AND si.date_of_purchase = :date{$employeeCondition}
             ORDER BY si.sales_invoice_id DESC"
        );
        $stmt->execute($params);
        $invoices = array_map(static function (array $row): array {
            return [
                'sales_invoice_id' => (int) $row['sales_invoice_id'],
                'sales_invoice_number' => $row['sales_invoice_number'],
                'date_of_purchase' => $row['date_of_purchase'],
                'total_amount' => (float) $row['total_amount'],
                'payment_method' => $row['payment_method'],
                'employee_id' => $row['employee_id'] !== null ? (int) $row['employee_id'] : null,
                'salesperson' => $row['salesperson'],
            ];
        }, $stmt->fetchAll(PDO::FETCH_ASSOC));

        return [
            'date' => $date,
            'branch_id' => $branchId,
            'employee_id' => $employeeId,
            'total_revenue' => (float) $summary['total_revenue'],
            'invoice_count' => (int) $summary['invoice_count'],
            'total_items_sold' => (int) $itemsTotal['total_items_sold'],
            'by_item' => $byItem,
            'by_payment_method' => $byPayment,
            'invoices' => $invoices,
        ];
    }

    public function getWarrantyAnalytics(int $branchId): array
    {
        // 1. Ticket status counts
        $sqlCounts = "SELECT 
                        COUNT(*) AS total_reports,
                        COUNT(CASE WHEN certified_at IS NULL THEN 1 END) AS pending_certification,
                        COUNT(CASE WHEN certified_at IS NOT NULL THEN 1 END) AS certified_count
                      FROM service_reports 
                      WHERE branch_id = :branch_id";
        $stmt = $this->pdo->prepare($sqlCounts);
        $stmt->execute([':branch_id' => $branchId]);
        $counts = $stmt->fetch(PDO::FETCH_ASSOC) ?: [
            'total_reports' => 0,
            'pending_certification' => 0,
            'certified_count' => 0
        ];

        // 2. Most frequently reported items / models
        $sqlTopComplaints = "SELECT 
                                i.name AS item_name,
                                iv.model AS variant_model,
                                b.name AS brand_name,
                                COUNT(sr.service_report_id) AS incident_count
                             FROM service_reports sr
                             JOIN stock_unit su ON sr.stock_unit_id = su.stock_unit_id
                             JOIN item_variants iv ON su.variant_id = iv.variant_id
                             JOIN items i ON iv.item_id = i.item_id
                             LEFT JOIN brands b ON i.brand_id = b.brand_id
                             WHERE sr.branch_id = :branch_id
                             GROUP BY i.name, iv.model, b.name
                             ORDER BY incident_count DESC
                             LIMIT 5";
        $stmt = $this->pdo->prepare($sqlTopComplaints);
        $stmt->execute([':branch_id' => $branchId]);
        $topComplaints = $stmt->fetchAll(PDO::FETCH_ASSOC);

        return [
            'summary' => [
                'total' => (int)$counts['total_reports'],
                'pending' => (int)$counts['pending_certification'],
                'certified' => (int)$counts['certified_count']
            ],
            'top_reported_models' => array_map(fn($row) => [
                'model' => $row['variant_model'] ?: $row['item_name'],
                'brand' => $row['brand_name'] ?? 'Generic',
                'incidents' => (int)$row['incident_count']
            ], $topComplaints)
        ];
    }

    /**
     * Aggregates Cashier Performance and Payment Methods.
     */
    public function getCashierAndPaymentAnalytics(int $branchId, ?string $startDate = null, ?string $endDate = null): array
    {
        $startDate = $startDate ?: date('Y-m-01');
        $endDate = $endDate ?: date('Y-m-d');

        // 1. Payment Methods breakdown
        $sqlPayments = "SELECT 
                            payment_method, 
                            COUNT(*) AS transaction_count, 
                            COALESCE(SUM(total_amount), 0) AS total_collected 
                        FROM sales_invoice 
                        WHERE branch_id = :branch_id 
                          AND status = 'completed'
                          AND date_of_purchase BETWEEN :start_date AND :end_date
                        GROUP BY payment_method";
        $stmt = $this->pdo->prepare($sqlPayments);
        $stmt->execute([
            ':branch_id' => $branchId,
            ':start_date' => $startDate,
            ':end_date' => $endDate
        ]);
        $payments = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // 2. Staff performance breakdown
        $sqlCashiers = "SELECT 
                            e.employee_id,
                            CONCAT(e.first_name, ' ', e.last_name) AS staff_name,
                            COUNT(si.sales_invoice_id) AS invoices_closed,
                            COALESCE(SUM(si.total_amount), 0) AS total_sales
                        FROM employees e
                        JOIN sales_invoice si ON e.employee_id = si.employee_id
                        WHERE si.branch_id = :branch_id 
                          AND si.status = 'completed'
                          AND si.date_of_purchase BETWEEN :start_date AND :end_date
                        GROUP BY e.employee_id, e.first_name, e.last_name
                        ORDER BY total_sales DESC
                        LIMIT 5";
        $stmt = $this->pdo->prepare($sqlCashiers);
        $stmt->execute([
            ':branch_id' => $branchId,
            ':start_date' => $startDate,
            ':end_date' => $endDate
        ]);
        $cashiers = $stmt->fetchAll(PDO::FETCH_ASSOC);

        return [
            'payment_distribution' => array_map(fn($row) => [
                'method' => $row['payment_method'] ?: 'Other',
                'count' => (int)$row['transaction_count'],
                'amount' => (float)$row['total_collected']
            ], $payments),
            'staff_leaderboard' => array_map(fn($row) => [
                'id' => (int)$row['employee_id'],
                'name' => trim($row['staff_name']),
                'invoices' => (int)$row['invoices_closed'],
                'revenue' => (float)$row['total_sales']
            ], $cashiers)
        ];
    }

    /**
     * Sales approval / void tracking for a date range (by date_of_purchase).
     */
    public function getSalesIntegrityAnalytics(int $branchId, string $startDate, string $endDate): array
    {
        // 1. Totals per status
        $stmt = $this->pdo->prepare("SELECT status, COUNT(*) AS c, COALESCE(SUM(total_amount),0) AS amt
                                     FROM sales_invoice
                                     WHERE branch_id = :b AND date_of_purchase BETWEEN :s AND :e
                                     GROUP BY status");
        $stmt->execute([':b' => $branchId, ':s' => $startDate, ':e' => $endDate]);
        $summary = [];
        foreach (['completed', 'voided', 'pending_authorization', 'rejected', 'parked'] as $st) {
            $summary[$st] = ['count' => 0, 'amount' => 0.0];
        }
        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $r) {
            $summary[$r['status']] = ['count' => (int) $r['c'], 'amount' => (float) $r['amt']];
        }
        // Parked carts are drafts, so they are not part of the void-rate base
        $base = array_sum(array_map(fn($k) => $summary[$k]['count'], ['completed', 'voided', 'pending_authorization', 'rejected']));
        $voidRate = $base > 0 ? round($summary['voided']['count'] / $base * 100, 1) : 0.0;

        // 2. Pending authorization queue (all dates; oldest first)
        $stmt = $this->pdo->prepare("SELECT si.sales_invoice_id, si.sales_invoice_number, si.total_amount, si.created_at, si.reference_note,
                                            CONCAT(e.first_name, ' ', e.last_name) AS staff_name,
                                            TIMESTAMPDIFF(HOUR, si.created_at, NOW()) AS age_hours
                                     FROM sales_invoice si
                                     LEFT JOIN employees e ON e.employee_id = si.employee_id
                                     WHERE si.branch_id = :b AND si.status = 'pending_authorization'
                                     ORDER BY si.created_at ASC
                                     LIMIT 10");
        $stmt->execute([':b' => $branchId]);
        $pending = array_map(fn($r) => [
            'id' => (int) $r['sales_invoice_id'],
            'invoice_number' => $r['sales_invoice_number'],
            'amount' => (float) $r['total_amount'],
            'staff' => trim((string) $r['staff_name']) ?: 'Unknown',
            'note' => $r['reference_note'],
            'created_at' => $r['created_at'],
            'age_hours' => (int) $r['age_hours'],
        ], $stmt->fetchAll(PDO::FETCH_ASSOC));

        // 3. Voids by cashier
        $stmt = $this->pdo->prepare("SELECT e.employee_id, CONCAT(e.first_name, ' ', e.last_name) AS staff_name,
                                            COUNT(*) AS voids, COALESCE(SUM(si.total_amount),0) AS amt
                                     FROM sales_invoice si
                                     JOIN employees e ON e.employee_id = si.employee_id
                                     WHERE si.branch_id = :b AND si.status = 'voided'
                                       AND si.date_of_purchase BETWEEN :s AND :e
                                     GROUP BY e.employee_id, e.first_name, e.last_name
                                     ORDER BY voids DESC
                                     LIMIT 5");
        $stmt->execute([':b' => $branchId, ':s' => $startDate, ':e' => $endDate]);
        $voidsByStaff = array_map(fn($r) => [
            'id' => (int) $r['employee_id'],
            'name' => trim($r['staff_name']),
            'voids' => (int) $r['voids'],
            'amount' => (float) $r['amt'],
        ], $stmt->fetchAll(PDO::FETCH_ASSOC));

        return [
            'period' => ['start' => $startDate, 'end' => $endDate],
            'summary' => $summary,
            'void_rate' => $voidRate,
            'pending_queue' => $pending,
            'voids_by_staff' => $voidsByStaff,
        ];
    }

    /**
     * Stock loss / adjustment analytics. Movements are for the date range,
     * the status snapshot and value-at-risk are current.
     */
    public function getStockShrinkageAnalytics(int $branchId, string $startDate, string $endDate): array
    {
        $loss = "('damaged','lost','written_off')";
        $range = "sa.created_at >= :s AND sa.created_at < DATE_ADD(:e, INTERVAL 1 DAY)";

        // 1. Units moved into a loss status in the period (reason can be unreliable, so use the new status)
        $stmt = $this->pdo->prepare("SELECT sai.new_status, COUNT(*) AS units
                                     FROM stock_adjustment_items sai
                                     JOIN stock_adjustments sa ON sa.stock_adjustment_id = sai.stock_adjustment_id
                                     WHERE sa.branch_id = :b AND $range AND sai.new_status IN $loss
                                     GROUP BY sai.new_status");
        $stmt->execute([':b' => $branchId, ':s' => $startDate, ':e' => $endDate]);
        $moved = ['damaged' => 0, 'lost' => 0, 'written_off' => 0];
        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $r) {
            $moved[$r['new_status']] = (int) $r['units'];
        }

        // 2. Adjustments by recorded reason
        $stmt = $this->pdo->prepare("SELECT sa.reason, COUNT(DISTINCT sa.stock_adjustment_id) AS adjustments, COUNT(sai.adjustment_item_id) AS units
                                     FROM stock_adjustments sa
                                     JOIN stock_adjustment_items sai ON sai.stock_adjustment_id = sa.stock_adjustment_id
                                     WHERE sa.branch_id = :b AND $range
                                     GROUP BY sa.reason
                                     ORDER BY units DESC");
        $stmt->execute([':b' => $branchId, ':s' => $startDate, ':e' => $endDate]);
        $byReason = array_map(fn($r) => [
            'reason' => $r['reason'],
            'adjustments' => (int) $r['adjustments'],
            'units' => (int) $r['units'],
        ], $stmt->fetchAll(PDO::FETCH_ASSOC));

        // 3. Current unit status snapshot
        $stmt = $this->pdo->prepare("SELECT status, COUNT(*) AS units FROM stock_unit WHERE branch_id = :b GROUP BY status");
        $stmt->execute([':b' => $branchId]);
        $snapshot = array_map(fn($r) => ['status' => $r['status'], 'units' => (int) $r['units']], $stmt->fetchAll(PDO::FETCH_ASSOC));

        // 4. Units currently in a loss status and their retail value (branch price; cost is not stored)
        $stmt = $this->pdo->prepare("SELECT COUNT(*) AS units,
                                            COALESCE(SUM((SELECT bi.price FROM branch_item bi
                                                          WHERE bi.variant_id = su.variant_id AND bi.branch_id = su.branch_id
                                                          ORDER BY bi.updated_at DESC LIMIT 1)), 0) AS value_at_risk
                                     FROM stock_unit su
                                     WHERE su.branch_id = :b AND su.status IN $loss");
        $stmt->execute([':b' => $branchId]);
        $risk = $stmt->fetch(PDO::FETCH_ASSOC) ?: ['units' => 0, 'value_at_risk' => 0];

        // 5. Most affected models
        $stmt = $this->pdo->prepare("SELECT i.name AS item_name, iv.model, COUNT(*) AS units
                                     FROM stock_unit su
                                     JOIN item_variants iv ON iv.variant_id = su.variant_id
                                     JOIN items i ON i.item_id = iv.item_id
                                     WHERE su.branch_id = :b AND su.status IN $loss
                                     GROUP BY iv.variant_id, i.name, iv.model
                                     ORDER BY units DESC
                                     LIMIT 5");
        $stmt->execute([':b' => $branchId]);
        $top = array_map(fn($r) => [
            'name' => $r['model'] ?: $r['item_name'],
            'item' => $r['item_name'],
            'units' => (int) $r['units'],
        ], $stmt->fetchAll(PDO::FETCH_ASSOC));

        return [
            'period' => ['start' => $startDate, 'end' => $endDate],
            'moved_to_loss' => $moved,
            'by_reason' => $byReason,
            'status_snapshot' => $snapshot,
            'at_risk' => ['units' => (int) $risk['units'], 'value' => (float) $risk['value_at_risk']],
            'top_affected' => $top,
        ];
    }

    /**
     * Customer insights for a date range (completed invoices only).
     */
    public function getCustomerAnalytics(int $branchId, string $startDate, string $endDate): array
    {
        // 1. Registered vs walk-in sales
        $stmt = $this->pdo->prepare("SELECT
                    COUNT(*) AS invoices,
                    COALESCE(SUM(total_amount),0) AS amount,
                    COALESCE(SUM(customer_id IS NULL),0) AS walkin_invoices,
                    COALESCE(SUM(CASE WHEN customer_id IS NULL THEN total_amount ELSE 0 END),0) AS walkin_amount
                FROM sales_invoice
                WHERE branch_id = :b AND status = 'completed' AND date_of_purchase BETWEEN :s AND :e");
        $stmt->execute([':b' => $branchId, ':s' => $startDate, ':e' => $endDate]);
        $sales = $stmt->fetch(PDO::FETCH_ASSOC);

        // 2. Active customers in the period and how many are returning (2+ completed purchases ever)
        $stmt = $this->pdo->prepare("SELECT COUNT(*) AS active,
                    COALESCE(SUM(t.lifetime >= 2),0) AS returning_customers
                FROM (
                    SELECT si.customer_id,
                           (SELECT COUNT(*) FROM sales_invoice x
                             WHERE x.customer_id = si.customer_id AND x.branch_id = :b2 AND x.status = 'completed') AS lifetime
                    FROM sales_invoice si
                    WHERE si.branch_id = :b AND si.status = 'completed'
                      AND si.customer_id IS NOT NULL
                      AND si.date_of_purchase BETWEEN :s AND :e
                    GROUP BY si.customer_id
                ) t");
        $stmt->execute([':b' => $branchId, ':b2' => $branchId, ':s' => $startDate, ':e' => $endDate]);
        $act = $stmt->fetch(PDO::FETCH_ASSOC);

        // 3. New customer records in the period (customers are not branch-scoped)
        $stmt = $this->pdo->prepare("SELECT COUNT(*) FROM customers
                                     WHERE created_at >= :s AND created_at < DATE_ADD(:e, INTERVAL 1 DAY)");
        $stmt->execute([':s' => $startDate, ':e' => $endDate]);
        $newCustomers = (int) $stmt->fetchColumn();

        // 4. Top customers by spend
        $stmt = $this->pdo->prepare("SELECT c.customer_id,
                    COALESCE(NULLIF(TRIM(CONCAT_WS(' ', c.first_name, c.last_name)), ''), 'Unnamed') AS name,
                    COUNT(*) AS invoices, COALESCE(SUM(si.total_amount),0) AS spend,
                    MAX(si.date_of_purchase) AS last_purchase
                FROM sales_invoice si
                JOIN customers c ON c.customer_id = si.customer_id
                WHERE si.branch_id = :b AND si.status = 'completed'
                  AND si.date_of_purchase BETWEEN :s AND :e
                GROUP BY c.customer_id, c.first_name, c.last_name
                ORDER BY spend DESC
                LIMIT 5");
        $stmt->execute([':b' => $branchId, ':s' => $startDate, ':e' => $endDate]);
        $top = array_map(fn($r) => [
            'id' => (int) $r['customer_id'],
            'name' => $r['name'],
            'invoices' => (int) $r['invoices'],
            'spend' => (float) $r['spend'],
            'last_purchase' => $r['last_purchase'],
        ], $stmt->fetchAll(PDO::FETCH_ASSOC));

        $invoices = (int) $sales['invoices'];
        $active = (int) $act['active'];
        return [
            'period' => ['start' => $startDate, 'end' => $endDate],
            'invoices' => $invoices,
            'walk_in' => [
                'invoices' => (int) $sales['walkin_invoices'],
                'amount' => (float) $sales['walkin_amount'],
                'share_pct' => $invoices > 0 ? round($sales['walkin_invoices'] / $invoices * 100, 1) : 0.0,
            ],
            'active_customers' => $active,
            'returning_customers' => (int) $act['returning_customers'],
            'returning_pct' => $active > 0 ? round($act['returning_customers'] / $active * 100, 1) : 0.0,
            'new_customers' => $newCustomers,
            'top_customers' => $top,
        ];
    }

    /**
     * Service desk depth. Aging / open queue are current; certify time and routing use the date range.
     */
    public function getServiceDeskAnalytics(int $branchId, string $startDate, string $endDate): array
    {
        // 1. Reports in period: totals, avg hours to certify, no action logged
        $stmt = $this->pdo->prepare("SELECT COUNT(*) AS total,
                    COALESCE(SUM(sr.certified_at IS NOT NULL),0) AS certified,
                    AVG(CASE WHEN sr.certified_at IS NOT NULL THEN TIMESTAMPDIFF(HOUR, sr.created_at, sr.certified_at) END) AS avg_certify_hours,
                    COALESCE(SUM(NOT EXISTS (SELECT 1 FROM service_report_actions a WHERE a.service_report_id = sr.service_report_id)),0) AS no_action
                FROM service_reports sr
                WHERE sr.branch_id = :b AND sr.reported_date BETWEEN :s AND :e");
        $stmt->execute([':b' => $branchId, ':s' => $startDate, ':e' => $endDate]);
        $t = $stmt->fetch(PDO::FETCH_ASSOC);

        // 2. Open (uncertified) reports: aging buckets, all time
        $stmt = $this->pdo->prepare("SELECT
                    COALESCE(SUM(DATEDIFF(CURDATE(), reported_date) <= 3),0) AS d0_3,
                    COALESCE(SUM(DATEDIFF(CURDATE(), reported_date) BETWEEN 4 AND 7),0) AS d4_7,
                    COALESCE(SUM(DATEDIFF(CURDATE(), reported_date) > 7),0) AS d8_plus,
                    COUNT(*) AS open_total
                FROM service_reports WHERE branch_id = :b AND certified_at IS NULL");
        $stmt->execute([':b' => $branchId]);
        $ag = $stmt->fetch(PDO::FETCH_ASSOC);

        // 3. Oldest open reports
        $stmt = $this->pdo->prepare("SELECT sr.service_report_id, sr.control_number, sr.complaint_description, sr.reported_date,
                    DATEDIFF(CURDATE(), sr.reported_date) AS days_open,
                    COALESCE(iv.model, i.name) AS model,
                    (SELECT COUNT(*) FROM service_report_actions a WHERE a.service_report_id = sr.service_report_id) AS actions
                FROM service_reports sr
                LEFT JOIN stock_unit su ON su.stock_unit_id = sr.stock_unit_id
                LEFT JOIN item_variants iv ON iv.variant_id = su.variant_id
                LEFT JOIN items i ON i.item_id = iv.item_id
                WHERE sr.branch_id = :b AND sr.certified_at IS NULL
                ORDER BY sr.reported_date ASC
                LIMIT 5");
        $stmt->execute([':b' => $branchId]);
        $oldest = array_map(fn($r) => [
            'id' => (int) $r['service_report_id'],
            'control_number' => $r['control_number'],
            'model' => $r['model'] ?: 'Unknown',
            'complaint' => mb_strimwidth((string) $r['complaint_description'], 0, 60, '...'),
            'days_open' => (int) $r['days_open'],
            'actions' => (int) $r['actions'],
        ], $stmt->fetchAll(PDO::FETCH_ASSOC));

        // 4. Where reports are routed
        $stmt = $this->pdo->prepare("SELECT COALESCE(NULLIF(TRIM(report_to), ''), 'Unassigned') AS dest, COUNT(*) AS c
                FROM service_reports
                WHERE branch_id = :b AND reported_date BETWEEN :s AND :e
                GROUP BY dest ORDER BY c DESC");
        $stmt->execute([':b' => $branchId, ':s' => $startDate, ':e' => $endDate]);
        $routing = array_map(fn($r) => ['destination' => $r['dest'], 'count' => (int) $r['c']], $stmt->fetchAll(PDO::FETCH_ASSOC));

        // 5. Defect rate per model: lifetime reports / lifetime units sold (completed sales)
        $stmt = $this->pdo->prepare("SELECT iv.variant_id, COALESCE(iv.model, i.name) AS model, COALESCE(b.name, 'Generic') AS brand,
                    COUNT(*) AS incidents,
                    (SELECT COUNT(*) FROM sales_details sd
                       JOIN sales_invoice si2 ON si2.sales_invoice_id = sd.sales_invoice_id
                       JOIN stock_unit su2 ON su2.stock_unit_id = sd.stock_unit_id
                      WHERE su2.variant_id = iv.variant_id AND si2.branch_id = :b2 AND si2.status = 'completed') AS sold
                FROM service_reports sr
                JOIN stock_unit su ON su.stock_unit_id = sr.stock_unit_id
                JOIN item_variants iv ON iv.variant_id = su.variant_id
                JOIN items i ON i.item_id = iv.item_id
                LEFT JOIN brands b ON b.brand_id = i.brand_id
                WHERE sr.branch_id = :b
                GROUP BY iv.variant_id, iv.model, i.name, b.name
                ORDER BY incidents DESC
                LIMIT 5");
        $stmt->execute([':b' => $branchId, ':b2' => $branchId]);
        $defects = array_map(function ($r) {
            $sold = (int) $r['sold'];
            return [
                'model' => $r['model'],
                'brand' => $r['brand'],
                'incidents' => (int) $r['incidents'],
                'units_sold' => $sold,
                'rate_pct' => $sold > 0 ? round($r['incidents'] / $sold * 100, 1) : null,
            ];
        }, $stmt->fetchAll(PDO::FETCH_ASSOC));

        $hours = $t['avg_certify_hours'];
        return [
            'period' => ['start' => $startDate, 'end' => $endDate],
            'total' => (int) $t['total'],
            'certified' => (int) $t['certified'],
            'no_action' => (int) $t['no_action'],
            'avg_certify_hours' => $hours !== null ? round((float) $hours, 1) : null,
            'open' => [
                'total' => (int) $ag['open_total'],
                'd0_3' => (int) $ag['d0_3'],
                'd4_7' => (int) $ag['d4_7'],
                'd8_plus' => (int) $ag['d8_plus'],
            ],
            'oldest_open' => $oldest,
            'routing' => $routing,
            'defect_rates' => $defects,
        ];
    }
}