<?php

namespace App\Services;

use App\Models\Dashboard;
use App\Models\Item;

class DashboardService
{
    private Dashboard $dashboard;

    public function __construct(?Dashboard $dashboard = null)
    {
        $this->dashboard = $dashboard instanceof Dashboard ? $dashboard : new Dashboard();
    }

    /**
     * Get dashboard metrics for a branch. If $branchId is null, use $user['branch_id']
     * $user is the decoded token array attached by AuthMiddleware.
     */
    public function getKpi(?int $branchId, array $user = null, string $period = 'day', ?string $startDate = null, ?string $endDate = null): array
    {
        $branch = $branchId ?? ($user['branch_id'] ?? null);
        if (!$branch) {
            throw new \InvalidArgumentException('branch_id is required');
        }

        // resolve period range using model helper
        [$start, $end] = $this->dashboard->resolvePeriod($period, $startDate, $endDate);

        $totalSales = $this->dashboard->getTotalSales($branch, $start, $end);
        $txCount = $this->dashboard->getTransactionCount($branch, $start, $end);
        $inventoryValue = $this->dashboard->getInventoryValue($branch);

        return [
            'total_sales' => $totalSales,
            'transaction_count' => $txCount,
            'inventory_value' => $inventoryValue,
            'period' => ['start' => $start, 'end' => $end],
        ];
    }

    /**
     * Get stock alerts for a branch: low stock, out of stock, top selling, slow moving.
     * Options:
     *  - limit: int
     *  - top_by: 'volume'|'revenue'
     *  - period: 'day'|'week'|'month'|'custom'
     *  - startDate, endDate for custom period
     *  - cutoffDays: int for slow moving
     */
    public function getStockAlert(?int $branchId, array $user = null, array $options = []): array
    {
        $branch = $branchId ?? ($user['branch_id'] ?? null);
        if (!$branch) {
            throw new \InvalidArgumentException('branch_id is required');
        }

        $limit = isset($options['limit']) ? (int)$options['limit'] : 50;
        $topLimit = isset($options['top_limit']) ? (int)$options['top_limit'] : 10;
        $topBy = isset($options['top_by']) && $options['top_by'] === 'revenue' ? 'revenue' : 'volume';
        $period = $options['period'] ?? 'month';
        [$start, $end] = $this->dashboard->resolvePeriod($period, $options['startDate'] ?? $options['start'] ?? null, $options['endDate'] ?? $options['end'] ?? null);
        $cutoffDays = isset($options['cutoffDays']) ? (int)$options['cutoffDays'] : 30;

        $low = $this->dashboard->getLowStock($branch, $limit);
        $out = $this->dashboard->getOutOfStock($branch, $limit);
        $top = $this->dashboard->getTopSellingItem($branch, $start, $end, $topLimit, $topBy === 'revenue' ? 'revenue' : 'volume');
        $slow = $this->dashboard->getSlowMoving($branch, $cutoffDays, $limit);

        // Convert image paths to absolute URLs using Item::assetUrl
        $itemModel = new Item();
        $mapImage = function (&$rows) use ($itemModel) {
            foreach ($rows as &$r) {
                $r['imageUrl'] = isset($r['image_url']) ? $itemModel->assetUrl($r['image_url']) : null;
            }
            return $rows;
        };

        $mapImage($low);
        $mapImage($out);
        $mapImage($top);
        $mapImage($slow);

        return [
            'low_stock' => $low,
            'out_of_stock' => $out,
            'top_selling' => $top,
            'slow_moving' => $slow,
            'period' => ['start' => $start, 'end' => $end],
        ];
    }

    /**
     * Build analytics payload for charts: sales trend, category distribution, peak hours.
     * Options:
     *  - period: '7'|'30'|'custom'|'day'|'week'|'month'
     *  - startDate, endDate for custom
     *  - limit / category_limit
     */
    public function getSalesAnalitics(?int $branchId, array $user = null, array $options = []): array
    {
        $branch = $branchId ?? ($user['branch_id'] ?? null);
        if (!$branch) {
            throw new \InvalidArgumentException('branch_id is required');
        }

        $period = $options['period'] ?? '7';

        if ($period === '7') {
            $end = date('Y-m-d');
            $start = date('Y-m-d', strtotime('-6 days'));
        } elseif ($period === '30') {
            $end = date('Y-m-d');
            $start = date('Y-m-d', strtotime('-29 days'));
        } else {
            [$start, $end] = $this->dashboard->resolvePeriod($period, $options['startDate'] ?? $options['start'] ?? null, $options['endDate'] ?? $options['end'] ?? null);
        }

        // Sales trend (daily totals)
        $salesRows = $this->dashboard->getSalesByDate($branch, $start, $end);
        // fill missing dates
        $trend = [];
        $periodStart = new \DateTime($start);
        $periodEnd = new \DateTime($end);
        $interval = new \DateInterval('P1D');
        $periodRange = new \DatePeriod($periodStart, $interval, (clone $periodEnd)->modify('+1 day'));

        $map = [];
        foreach ($salesRows as $r) {
            $map[$r['date']] = (float)$r['total_sales'];
        }
        foreach ($periodRange as $d) {
            $date = $d->format('Y-m-d');
            $trend[] = [
                'date' => $date,
                'label' => $date,
                'total' => $map[$date] ?? 0.0,
                'ts' => (int)strtotime($date) * 1000,
            ];
        }

        // Category distribution
        $categoryLimit = isset($options['category_limit']) ? (int)$options['category_limit'] : 10;
        $categories = $this->dashboard->getCategoryDistribution($branch, $start, $end, $categoryLimit);

        // Peak hours (use created_at day range)
        $startDt = $start . ' 00:00:00';
        $endDt = $end . ' 23:59:59';
        $hoursRows = $this->dashboard->getPeakHours($branch, $startDt, $endDt);
        $hoursMap = [];
        foreach ($hoursRows as $h) {
            $hoursMap[(int)$h['hour']] = ['hour' => (int)$h['hour'], 'invoices' => (int)$h['invoices'], 'revenue' => (float)$h['revenue']];
        }
        $peak = [];
        for ($i = 0; $i < 24; $i++) {
            if (isset($hoursMap[$i])) {
                $row = $hoursMap[$i];
            } else {
                $row = ['hour' => $i, 'invoices' => 0, 'revenue' => 0.0];
            }
            $row['label'] = sprintf('%02d:00', $i);
            $row['ts'] = $i * 3600 * 1000; // milliseconds since day start
            $peak[] = $row;
        }

        return [
            'trend' => $trend,
            'category_distribution' => $categories,
            'peak_hours' => $peak,
            'period' => ['start' => $start, 'end' => $end],
        ];
    }
}
