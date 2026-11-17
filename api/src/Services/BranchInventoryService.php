<?php

namespace App\Services;

use App\Database\DatabaseManager;
use Doctrine\ORM\EntityManager;

/**
 * Per-variant stock movement report for a branch.
 *
 * "Count" = sellable on-hand units (stock_unit.status = 'available', or inventory.quantity
 * for non-serialized items).
 *
 *   ending    = current_count - net movement AFTER the range
 *   beginning = ending - net movement INSIDE the range
 *   net       = stock_in + found + void - stock_out - lost - damage - written_off
 */
class BranchItemMovementService
{
    private const BUCKETS = ['stock_in', 'void', 'lost', 'damage', 'written_off', 'stock_out', 'found'];

    private EntityManager $em;

    public function __construct(?EntityManager $em = null)
    {
        $this->em = $em ?? DatabaseManager::getEntityManager();
    }

    /**
     * Turns ?range=daily|weekly|monthly|yearly|custom (+ date / from / to) into [from, to) boundaries.
     *
     * @return array{type:string,from:\DateTimeImmutable,to:\DateTimeImmutable}  `to` is EXCLUSIVE
     */
    public static function resolveRange(array $query): array
    {
        // Use the app's timezone so range boundaries match how PHP writes timestamps (voided_at, received_at, created_at)
        $tz = new \DateTimeZone(date_default_timezone_get());
        $type = strtolower((string) ($query['range'] ?? ''));

        $parse = static function (?string $value, string $field) use ($tz): \DateTimeImmutable {
            $d = $value ? \DateTimeImmutable::createFromFormat('!Y-m-d', $value, $tz) : false;
            if (!$d || $d->format('Y-m-d') !== $value) {
                throw new \InvalidArgumentException("{$field} must be a valid date in YYYY-MM-DD format");
            }
            return $d;
        };

        if ($type === 'custom') {
            $from = $parse($query['from'] ?? null, 'from');
            $to   = $parse($query['to'] ?? null, 'to');
            if ($from > $to) {
                throw new \InvalidArgumentException('from must be on or before to');
            }
            if ($from->diff($to)->days > 731) {
                throw new \InvalidArgumentException('Custom range cannot exceed 2 years');
            }
            return ['type' => 'custom', 'from' => $from, 'to' => $to->modify('+1 day')];
        }

        $anchor = isset($query['date']) && $query['date'] !== ''
            ? $parse($query['date'], 'date')
            : new \DateTimeImmutable('today', $tz);

        switch ($type) {
            case 'daily':
                return ['type' => $type, 'from' => $anchor, 'to' => $anchor->modify('+1 day')];
            case 'weekly': // Monday - Sunday
                $from = $anchor->modify('monday this week');
                return ['type' => $type, 'from' => $from, 'to' => $from->modify('+7 days')];
            case 'monthly':
                $from = $anchor->modify('first day of this month');
                return ['type' => $type, 'from' => $from, 'to' => $from->modify('+1 month')];
            case 'yearly':
                $from = $anchor->setDate((int) $anchor->format('Y'), 1, 1);
                return ['type' => $type, 'from' => $from, 'to' => $from->modify('+1 year')];
        }

        throw new \InvalidArgumentException('range must be one of: daily, weekly, monthly, yearly, custom');
    }

    public static function describeRange(array $range): array
    {
        return [
            'type' => $range['type'],
            'from' => $range['from']->format('Y-m-d'),
            'to'   => $range['to']->modify('-1 day')->format('Y-m-d'), // inclusive for display
        ];
    }

    /**
     * @param array<int,bool> $variants variant_id => is_serialized
     * @return array<int,array<string,int|bool>> variant_id => movement
     */
    public function getReport(int $branchId, array $variants, array $range): array
    {
        if (!$variants) {
            return [];
        }

        $ids = array_keys($variants);
        $base = [
            'branch' => $branchId,
            'from'   => $range['from']->format('Y-m-d H:i:s'),
            'to'     => $range['to']->format('Y-m-d H:i:s'),
        ];
        [$in, $inParams] = $this->inClause($ids);
        $p = $base + $inParams;

        // bucket => variant_id => ['in' => int, 'after' => int]
        $data = array_fill_keys(self::BUCKETS, []);
        $data['stock_out'] = $this->pair($this->fetch($this->sqlStockOut($in), $p));
        $data['void']      = $this->pair($this->fetch($this->sqlVoid($in), $p));

        $serial    = array_keys(array_filter($variants));
        $nonSerial = array_keys(array_filter($variants, fn($s) => !$s));
        $stockIn   = [];
        if ($serial) {
            [$sIn, $sParams] = $this->inClause($serial);
            $stockIn += $this->pair($this->fetch($this->sqlStockInSerialized($sIn), $base + $sParams));
        }
        if ($nonSerial) {
            [$nIn, $nParams] = $this->inClause($nonSerial);
            $stockIn += $this->pair($this->fetch($this->sqlStockInNonSerialized($nIn), $base + $nParams));
        }
        $data['stock_in'] = $stockIn;

        foreach ($this->fetch($this->sqlAdjustments($in), $p) as $r) {
            foreach (['lost', 'damage', 'written_off', 'found'] as $b) {
                $data[$b][(int) $r['variant_id']] = [
                    'in'    => (int) $r["{$b}_in"],
                    'after' => (int) $r["{$b}_after"],
                ];
            }
        }

        $current = $this->currentCounts($branchId, $variants);

        $out = [];
        foreach ($ids as $vid) {
            $inRange = $after = [];
            foreach (self::BUCKETS as $b) {
                $inRange[$b] = $data[$b][$vid]['in'] ?? 0;
                $after[$b]   = $data[$b][$vid]['after'] ?? 0;
            }

            $ending    = ($current[$vid] ?? 0) - $this->net($after);
            $beginning = $ending - $this->net($inRange);

            $out[$vid] = $inRange + [
                'beginning'     => $beginning,
                'ending'        => $ending,
                // false => history doesn't add up (e.g. stock-in never logged); inspect that variant
                'is_reconciled' => $beginning >= 0 && $ending >= 0,
            ];
        }

        return $out;
    }

    private function net(array $m): int
    {
        return $m['stock_in'] + $m['found'] + $m['void']
             - $m['stock_out'] - $m['lost'] - $m['damage'] - $m['written_off'];
    }

    // ---------------------------------------------------------------- SQL

    /** Units sold. Voided invoices stay here; the void bucket reverses them. */
    private function sqlStockOut(string $in): string
    {
        return "SELECT COALESCE(su.variant_id, inv.variant_id) AS variant_id,
                    SUM(CASE WHEN si.created_at <  :to THEN sd.quantity ELSE 0 END) AS in_range,
                    SUM(CASE WHEN si.created_at >= :to THEN sd.quantity ELSE 0 END) AS after_range
                FROM sales_details sd
                JOIN sales_invoice si ON si.sales_invoice_id = sd.sales_invoice_id
                LEFT JOIN stock_unit su ON su.stock_unit_id = sd.stock_unit_id
                LEFT JOIN inventory inv ON inv.inventory_id = sd.inventory_id
                WHERE si.branch_id = :branch
                  AND si.status IN ('completed','authorized','voided')
                  AND si.created_at >= :from
                  AND COALESCE(su.variant_id, inv.variant_id) IN ($in)
                GROUP BY COALESCE(su.variant_id, inv.variant_id)";
    }

    /**
     * Units returned to stock by a voided invoice, dated by sales_invoice.voided_at.
     * Legacy voids with voided_at = NULL fall back to created_at: backfill them.
     */
    private function sqlVoid(string $in): string
    {
        $ts = 'COALESCE(si.voided_at, si.created_at)';
        return "SELECT COALESCE(su.variant_id, inv.variant_id) AS variant_id,
                    SUM(CASE WHEN $ts <  :to THEN sd.quantity ELSE 0 END) AS in_range,
                    SUM(CASE WHEN $ts >= :to THEN sd.quantity ELSE 0 END) AS after_range
                FROM sales_details sd
                JOIN sales_invoice si ON si.sales_invoice_id = sd.sales_invoice_id
                LEFT JOIN stock_unit su ON su.stock_unit_id = sd.stock_unit_id
                LEFT JOIN inventory inv ON inv.inventory_id = sd.inventory_id
                WHERE si.branch_id = :branch
                  AND si.status = 'voided'
                  AND $ts >= :from
                  AND COALESCE(su.variant_id, inv.variant_id) IN ($in)
                GROUP BY COALESCE(su.variant_id, inv.variant_id)";
    }

    /**
     * Lost / damage / written-off / found, from stock adjustments (serialized units only).
     * Only transitions that change the 'available' count are counted.
     */
    private function sqlAdjustments(string $in): string
    {
        $defs = [
            'lost'        => "sai.previous_status = 'available' AND sai.new_status = 'lost'",
            'damage'      => "sai.previous_status = 'available' AND sai.new_status = 'damaged'",
            'written_off' => "sai.previous_status = 'available' AND sai.new_status = 'written_off'",
            'found'       => "sai.new_status = 'available' AND sai.previous_status <> 'available'
                              AND (sai.previous_status = 'lost' OR sa.reason = 'found_stock')",
        ];

        $cols = [];
        foreach ($defs as $name => $cond) {
            $cols[] = "SUM(CASE WHEN sa.created_at <  :to AND ($cond) THEN 1 ELSE 0 END) AS {$name}_in";
            $cols[] = "SUM(CASE WHEN sa.created_at >= :to AND ($cond) THEN 1 ELSE 0 END) AS {$name}_after";
        }

        return "SELECT su.variant_id, " . implode(', ', $cols) . "
                FROM stock_adjustment_items sai
                JOIN stock_adjustments sa ON sa.stock_adjustment_id = sai.stock_adjustment_id
                JOIN stock_unit su ON su.stock_unit_id = sai.stock_unit_id
                WHERE sa.branch_id = :branch
                  AND sa.created_at >= :from
                  AND su.variant_id IN ($in)
                GROUP BY su.variant_id";
    }

    /** Serialized stock-in: one stock_unit row = one unit received, dated by received_at. */
    private function sqlStockInSerialized(string $in): string
    {
        return "SELECT variant_id,
                    SUM(CASE WHEN received_at <  :to THEN 1 ELSE 0 END) AS in_range,
                    SUM(CASE WHEN received_at >= :to THEN 1 ELSE 0 END) AS after_range
                FROM stock_unit
                WHERE branch_id = :branch
                  AND received_at >= :from
                  AND variant_id IN ($in)
                GROUP BY variant_id";
    }

    /**
     * Non-serialized stock-in (no date column exists on `inventory`), so it still reads the audit log.
     * ASSUMPTION: STOCK_IN audit rows carry new_values.variant_id and either
     * new_values.quantity or new_values.serial_numbers[] (else 1 row = 1 unit).
     * Adjust the JSON paths below to match what your stock-in code really writes.
     */
    private function sqlStockInNonSerialized(string $in): string
    {
        return "SELECT t.variant_id,
                    SUM(CASE WHEN t.created_at <  :to THEN t.qty ELSE 0 END) AS in_range,
                    SUM(CASE WHEN t.created_at >= :to THEN t.qty ELSE 0 END) AS after_range
                FROM (
                    SELECT al.created_at,
                           CAST(JSON_UNQUOTE(JSON_EXTRACT(al.new_values, '\$.variant_id')) AS UNSIGNED) AS variant_id,
                           COALESCE(
                               CAST(JSON_UNQUOTE(JSON_EXTRACT(al.new_values, '\$.quantity')) AS UNSIGNED),
                               JSON_LENGTH(al.new_values, '\$.serial_numbers'),
                               1
                           ) AS qty
                    FROM audit_logs al
                    WHERE al.action = 'STOCK_IN'
                      AND al.branch_id = :branch
                      AND al.module = 'inventory'
                      AND al.created_at >= :from
                ) t
                WHERE t.variant_id IN ($in)
                GROUP BY t.variant_id";
    }

    // ------------------------------------------------------------ helpers

    /** @return array<int,int> variant_id => current on-hand count */
    private function currentCounts(int $branchId, array $variants): array
    {
        $counts = [];

        $serial    = array_keys(array_filter($variants));
        $nonSerial = array_keys(array_filter($variants, fn($s) => !$s));

        if ($serial) {
            [$in, $params] = $this->inClause($serial);
            $rows = $this->fetch(
                "SELECT variant_id, COUNT(*) AS c FROM stock_unit
                 WHERE branch_id = :branch AND status = 'available' AND variant_id IN ($in)
                 GROUP BY variant_id",
                ['branch' => $branchId] + $params
            );
            foreach ($rows as $r) {
                $counts[(int) $r['variant_id']] = (int) $r['c'];
            }
        }

        if ($nonSerial) {
            [$in, $params] = $this->inClause($nonSerial);
            $rows = $this->fetch(
                "SELECT variant_id, quantity FROM inventory
                 WHERE branch_id = :branch AND variant_id IN ($in)",
                ['branch' => $branchId] + $params
            );
            foreach ($rows as $r) {
                $counts[(int) $r['variant_id']] = (int) $r['quantity'];
            }
        }

        return $counts;
    }

    private function inClause(array $ids): array
    {
        $names = $params = [];
        foreach (array_values($ids) as $i => $id) {
            $names[] = ":v{$i}";
            $params["v{$i}"] = (int) $id;
        }
        return [implode(',', $names), $params];
    }

    private function fetch(string $sql, array $params): array
    {
        return $this->em->getConnection()->fetchAllAssociative($sql, $params);
    }

    private function pair(array $rows): array
    {
        $out = [];
        foreach ($rows as $r) {
            $out[(int) $r['variant_id']] = ['in' => (int) $r['in_range'], 'after' => (int) $r['after_range']];
        }
        return $out;
    }
}