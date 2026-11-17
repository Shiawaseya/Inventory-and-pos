<?php

namespace App\Models;

use PDO;

class Dashboard extends BaseModel
{


    /**
     * Get dashboard metrics for a branch.
     *
     * $period: 'day'|'week'|'month' or 'custom'
     * If 'custom', provide $startDate and $endDate as 'YYYY-MM-DD'.
     * Branch id should come from the user's branch.
     *
     * Returns:
     * [
     *   'total_sales' => float,
     *   'transaction_count' => int,
     *   'inventory_value' => float
     * ]
     */
    // NOTE: composite get() removed. Use getTotalSales, getTransactionCount and getInventoryValue separately.

    public function resolvePeriod(string $period, ?string $startDate = null, ?string $endDate = null): array
    {
        $today = date('Y-m-d');
        switch ($period) {
            case 'week':
                return [date('Y-m-d', strtotime('-6 days')), $today];
            case 'month':
                return [date('Y-m-01'), $today];
            case 'custom':
                if (!$startDate || !$endDate) {
                    throw new \InvalidArgumentException('startDate and endDate required for custom period');
                }
                return [$startDate, $endDate];
            case 'day':
            default:
                return [$today, $today];
        }
    }

    /**
     * Return total sales sum for a branch within date range.
     */
    public function getTotalSales(int $branchId, string $start, string $end): float
    {
        $sql = 'SELECT COALESCE(SUM(total_amount),0) AS total_sales
                FROM sales_invoice
                WHERE branch_id = :branch_id
                  AND date_of_purchase BETWEEN :start AND :end';
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([':branch_id' => $branchId, ':start' => $start, ':end' => $end]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return (float)($row['total_sales'] ?? 0);
    }

    /**
     * Return transaction count for a branch within date range.
     */
    public function getTransactionCount(int $branchId, string $start, string $end): int
    {
        $sql = 'SELECT COUNT(*) AS tx_count
                FROM sales_invoice
                WHERE branch_id = :branch_id
                  AND date_of_purchase BETWEEN :start AND :end';
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([':branch_id' => $branchId, ':start' => $start, ':end' => $end]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return (int)($row['tx_count'] ?? 0);
    }

    /**
     * Return inventory monetary value for a branch (non-serialized + serialized available units).
     */
    public function getInventoryValue(int $branchId): float
    {
        $invSql = 'SELECT COALESCE(SUM(i.quantity * bi.price),0) AS inv_value
                   FROM inventory i
                   JOIN branch_item bi ON bi.variant_id = i.variant_id AND bi.branch_id = i.branch_id
                   WHERE i.branch_id = :branch_id';
        $stmt = $this->pdo->prepare($invSql);
        $stmt->execute([':branch_id' => $branchId]);
        $invRow = $stmt->fetch(PDO::FETCH_ASSOC) ?: ['inv_value' => 0];
        $invValue = (float)$invRow['inv_value'];

        $suSql = 'SELECT COALESCE(SUM(bi.price),0) AS serialized_value
              FROM stock_unit su
              JOIN branch_item bi ON bi.variant_id = su.variant_id AND bi.branch_id = su.branch_id
              WHERE su.branch_id = :branch_id AND su.status = "available"';
        $stmt = $this->pdo->prepare($suSql);
        $stmt->execute([':branch_id' => $branchId]);
        $suRow = $stmt->fetch(PDO::FETCH_ASSOC) ?: ['serialized_value' => 0];
        $serializedValue = (float)$suRow['serialized_value'];

        return $invValue + $serializedValue;
    }

        /**
         * Return branch items that are at or below their reorder level.
         */
        public function getLowStock(int $branchId, int $limit = 100): array
        {
                $sql = "SELECT bi.variant_id,
                           COALESCE(i.quantity,0) + COALESCE(su.count_available,0) AS quantity,
                           bi.reorder_level,
                           it.item_id, it.name AS item_name, v.model AS variant_model, it.image_url
                                FROM branch_item bi
                                LEFT JOIN (
                                    SELECT variant_id, branch_id, SUM(quantity) AS quantity
                                    FROM inventory
                                    GROUP BY variant_id, branch_id
                                ) i ON i.variant_id = bi.variant_id AND i.branch_id = bi.branch_id
                                LEFT JOIN (
                                    SELECT variant_id, branch_id, COUNT(*) AS count_available
                                    FROM stock_unit
                                    WHERE status = 'available'
                                    GROUP BY variant_id, branch_id
                                ) su ON su.variant_id = bi.variant_id AND su.branch_id = bi.branch_id
                                LEFT JOIN item_variants v ON v.variant_id = bi.variant_id
                                LEFT JOIN items it ON it.item_id = v.item_id
                                WHERE bi.branch_id = :branch_id
                                    AND bi.reorder_level IS NOT NULL
                                    AND (COALESCE(i.quantity,0) + COALESCE(su.count_available,0)) <= bi.reorder_level
                                ORDER BY (COALESCE(i.quantity,0) + COALESCE(su.count_available,0)) ASC
                                LIMIT :limit";

                $stmt = $this->pdo->prepare($sql);
                $stmt->bindValue(':branch_id', $branchId, PDO::PARAM_INT);
                $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
                $stmt->execute();
                return $stmt->fetchAll(PDO::FETCH_ASSOC);
        }

        /**
         * Return branch items that are out of stock (quantity = 0).
         */
        public function getOutOfStock(int $branchId, int $limit = 100): array
        {
                $sql = "SELECT bi.variant_id,
                           COALESCE(i.quantity,0) + COALESCE(su.count_available,0) AS quantity,
                           bi.reorder_level,
                           it.item_id, it.name AS item_name, v.model AS variant_model, it.image_url
                                FROM branch_item bi
                                LEFT JOIN (
                                    SELECT variant_id, branch_id, SUM(quantity) AS quantity
                                    FROM inventory
                                    GROUP BY variant_id, branch_id
                                ) i ON i.variant_id = bi.variant_id AND i.branch_id = bi.branch_id
                                LEFT JOIN (
                                    SELECT variant_id, branch_id, COUNT(*) AS count_available
                                    FROM stock_unit
                                    WHERE status = 'available'
                                    GROUP BY variant_id, branch_id
                                ) su ON su.variant_id = bi.variant_id AND su.branch_id = bi.branch_id
                                LEFT JOIN item_variants v ON v.variant_id = bi.variant_id
                                LEFT JOIN items it ON it.item_id = v.item_id
                                WHERE bi.branch_id = :branch_id
                                    AND (COALESCE(i.quantity,0) + COALESCE(su.count_available,0)) = 0
                                ORDER BY it.name ASC
                                LIMIT :limit";

                $stmt = $this->pdo->prepare($sql);
                $stmt->bindValue(':branch_id', $branchId, PDO::PARAM_INT);
                $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
                $stmt->execute();
                return $stmt->fetchAll(PDO::FETCH_ASSOC);
        }

        /**
         * Return top selling products for a branch by volume or revenue.
         */
        public function getTopSellingItem(int $branchId, string $start, string $end, int $limit = 10, string $by = 'volume'): array
        {
                $orderBy = $by === 'revenue' ? 'total_revenue' : 'total_qty';

                $sql = "SELECT v.variant_id, it.item_id, it.name AS item_name, v.model AS variant_model, it.image_url,
                                             COALESCE(SUM(t.qty),0) AS total_qty,
                                             COALESCE(SUM(t.revenue),0) AS total_revenue
                                FROM (
                                    SELECT COALESCE(inv.variant_id, su.variant_id) AS variant_id,
                                                 sd.quantity AS qty,
                                                 (sd.unit_price_at_sale * sd.quantity) AS revenue
                                    FROM sales_details sd
                                    JOIN sales_invoice si ON sd.sales_invoice_id = si.sales_invoice_id
                                    LEFT JOIN inventory inv ON sd.inventory_id = inv.inventory_id
                                    LEFT JOIN stock_unit su ON sd.stock_unit_id = su.stock_unit_id
                                    WHERE si.branch_id = :branch_id
                                        AND si.date_of_purchase BETWEEN :start AND :end
                                ) t
                                JOIN item_variants v ON v.variant_id = t.variant_id
                                JOIN items it ON it.item_id = v.item_id
                                GROUP BY v.variant_id, it.item_id, it.name, v.model, it.image_url
                                ORDER BY " . $orderBy . " DESC
                                LIMIT :limit";

                $stmt = $this->pdo->prepare($sql);
                $stmt->bindValue(':branch_id', $branchId, PDO::PARAM_INT);
                $stmt->bindValue(':start', $start);
                $stmt->bindValue(':end', $end);
                $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
                $stmt->execute();
                return $stmt->fetchAll(PDO::FETCH_ASSOC);
        }

        /**
         * Return slow moving items for a branch. Items with last sold date older than cutoffDays or never sold.
         */
        public function getSlowMoving(int $branchId, int $cutoffDays = 30, int $limit = 100): array
        {
                $cutoff = date('Y-m-d', strtotime(sprintf('-%d days', $cutoffDays)));

                $sql = "SELECT bi.variant_id, it.item_id, it.name AS item_name, v.model AS variant_model, it.image_url,
                           MAX(si.date_of_purchase) AS last_sold
                                FROM branch_item bi
                                LEFT JOIN item_variants v ON v.variant_id = bi.variant_id
                                LEFT JOIN items it ON it.item_id = v.item_id
                                LEFT JOIN sales_details sd ON (
                                        sd.inventory_id IS NOT NULL AND sd.inventory_id IN (SELECT inventory_id FROM inventory WHERE variant_id = bi.variant_id AND branch_id = bi.branch_id)
                                        OR sd.stock_unit_id IS NOT NULL AND sd.stock_unit_id IN (SELECT stock_unit_id FROM stock_unit WHERE variant_id = bi.variant_id AND branch_id = bi.branch_id)
                                )
                                LEFT JOIN sales_invoice si ON sd.sales_invoice_id = si.sales_invoice_id
                                WHERE bi.branch_id = :branch_id
                                GROUP BY bi.variant_id, it.item_id, it.name, v.model, it.image_url
                                HAVING (MAX(si.date_of_purchase) IS NULL OR MAX(si.date_of_purchase) < :cutoff)
                                ORDER BY last_sold ASC
                                LIMIT :limit";

                $stmt = $this->pdo->prepare($sql);
                $stmt->bindValue(':branch_id', $branchId, PDO::PARAM_INT);
                $stmt->bindValue(':cutoff', $cutoff);
                $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
                $stmt->execute();
                return $stmt->fetchAll(PDO::FETCH_ASSOC);
        }

        /**
         * Return total sales grouped by date (date_of_purchase) for a branch between start and end.
         */
        public function getSalesByDate(int $branchId, string $start, string $end): array
        {
                $sql = 'SELECT date_of_purchase AS date, COALESCE(SUM(total_amount),0) AS total_sales
                                FROM sales_invoice
                                WHERE branch_id = :branch_id
                                    AND date_of_purchase BETWEEN :start AND :end
                                GROUP BY date_of_purchase
                                ORDER BY date_of_purchase ASC';

                $stmt = $this->pdo->prepare($sql);
                $stmt->execute([':branch_id' => $branchId, ':start' => $start, ':end' => $end]);
                return $stmt->fetchAll(PDO::FETCH_ASSOC);
        }

        /**
         * Return revenue per category for a branch within date range.
         */
        public function getCategoryDistribution(int $branchId, string $start, string $end, int $limit = 50): array
        {
            // Some PDO/MySQL native prepare drivers do not accept bound parameters for LIMIT when
            // ATTR_EMULATE_PREPARES is disabled. To avoid that class of issues, inject the integer
            // limit directly after casting it to int. Also coalesce NULL categories into 'Uncategorized'.
            $limitInt = (int)$limit;
            $sql = "SELECT COALESCE(c.category_id, 0) AS category_id, COALESCE(c.name, 'Uncategorized') AS category_name, COALESCE(SUM(sd.unit_price_at_sale * sd.quantity),0) AS revenue
                FROM sales_details sd
                JOIN sales_invoice si ON sd.sales_invoice_id = si.sales_invoice_id
                LEFT JOIN inventory inv ON sd.inventory_id = inv.inventory_id
                LEFT JOIN stock_unit su ON sd.stock_unit_id = su.stock_unit_id
                LEFT JOIN item_variants v ON v.variant_id = COALESCE(inv.variant_id, su.variant_id)
                LEFT JOIN items it ON it.item_id = v.item_id
                LEFT JOIN categories c ON c.category_id = it.category_id
                WHERE si.branch_id = :branch_id
                  AND si.date_of_purchase BETWEEN :start AND :end
                GROUP BY COALESCE(c.category_id, 0), COALESCE(c.name, 'Uncategorized')
                ORDER BY revenue DESC
                LIMIT $limitInt";

            $stmt = $this->pdo->prepare($sql);
            $stmt->bindValue(':branch_id', $branchId, PDO::PARAM_INT);
            $stmt->bindValue(':start', $start);
            $stmt->bindValue(':end', $end);
            $stmt->execute();
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
        }

        /**
         * Return sales activity aggregated by hour (based on `created_at`) for a branch between start and end datetimes.
         */
        public function getPeakHours(int $branchId, string $startDateTime, string $endDateTime): array
        {
                $sql = 'SELECT HOUR(si.created_at) AS hour, COUNT(*) AS invoices, COALESCE(SUM(si.total_amount),0) AS revenue
                                FROM sales_invoice si
                                WHERE si.branch_id = :branch_id
                                    AND si.created_at BETWEEN :start_dt AND :end_dt
                                GROUP BY hour
                                ORDER BY hour ASC';

                $stmt = $this->pdo->prepare($sql);
                $stmt->execute([':branch_id' => $branchId, ':start_dt' => $startDateTime, ':end_dt' => $endDateTime]);
                return $stmt->fetchAll(PDO::FETCH_ASSOC);
        }
}
