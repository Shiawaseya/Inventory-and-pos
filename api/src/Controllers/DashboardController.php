<?php

namespace App\Controllers;

use App\Services\DashboardService;
use PDOException;

class DashboardController
{
    public static function get(array $request)
    {
        $service = new DashboardService();
        try {
            $user = $request['user'] ?? null;
            // prefer query params for GET, fallback to body for POST/PUT
            $query = $request['query'] ?? $request['body'] ?? [];

            $branchId = isset($query['branch_id']) && $query['branch_id'] !== '' ? (int)$query['branch_id'] : null;
            $period = $query['period'] ?? 'day';
            $start = $query['start_date'] ?? $query['startDate'] ?? null;
            $end = $query['end_date'] ?? $query['endDate'] ?? null;

            $data = $service->getKpi($branchId, $user, $period, $start, $end);

            return ['status' => 200, 'body' => ['success' => true, 'data' => $data]];
        } catch (PDOException $e) {
            return ['status' => 500, 'body' => ['success' => false, 'message' => 'Database error', 'error' => APP_DEBUG ? $e->getMessage() : 'DATABASE_ERROR']];
        } catch (\InvalidArgumentException $e) {
            return ['status' => 400, 'body' => ['success' => false, 'message' => $e->getMessage()]];
        }
    }

    public static function stockAlerts(array $request)
    {
        $service = new DashboardService();
        try {
            $user = $request['user'] ?? null;
            $query = $request['query'] ?? $request['body'] ?? [];

            $branchId = isset($query['branch_id']) && $query['branch_id'] !== '' ? (int)$query['branch_id'] : null;
            $options = [
                'limit' => isset($query['limit']) ? (int)$query['limit'] : 50,
                'top_limit' => isset($query['top_limit']) ? (int)$query['top_limit'] : 10,
                'top_by' => $query['top_by'] ?? 'volume',
                'period' => $query['period'] ?? 'month',
                'startDate' => $query['start_date'] ?? $query['start'] ?? null,
                'endDate' => $query['end_date'] ?? $query['end'] ?? null,
                'cutoffDays' => isset($query['cutoff_days']) ? (int)$query['cutoff_days'] : (isset($query['cutoffDays']) ? (int)$query['cutoffDays'] : 30),
            ];

            $data = $service->getStockAlert($branchId, $user, $options);

            return ['status' => 200, 'body' => ['success' => true, 'data' => $data]];
        } catch (PDOException $e) {
            return ['status' => 500, 'body' => ['success' => false, 'message' => 'Database error', 'error' => APP_DEBUG ? $e->getMessage() : 'DATABASE_ERROR']];
        } catch (\InvalidArgumentException $e) {
            return ['status' => 400, 'body' => ['success' => false, 'message' => $e->getMessage()]];
        }
    }

    public static function salesAnalytics(array $request)
    {
        $service = new DashboardService();
        try {
            $user = $request['user'] ?? null;
            $query = $request['query'] ?? $request['body'] ?? [];

            $branchId = isset($query['branch_id']) && $query['branch_id'] !== '' ? (int)$query['branch_id'] : null;
            // normalize and validate date inputs for custom period
            $periodRaw = $query['period'] ?? ($query['days'] ?? '7');
            $rawStart = $query['start_date'] ?? $query['start'] ?? null;
            $rawEnd = $query['end_date'] ?? $query['end'] ?? null;

            $normalizeDate = function (?string $d): ?string {
                if ($d === null) return null;
                if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $d)) return null;
                [$y, $m, $day] = explode('-', $d);
                $y = (int)$y; $m = (int)$m; $day = (int)$day;
                if ($m < 1 || $m > 12) return null;
                if (checkdate($m, $day, $y)) {
                    return sprintf('%04d-%02d-%02d', $y, $m, $day);
                }
                // day invalid (eg. 2026-04-31) — coerce to last day of month
                $last = cal_days_in_month(CAL_GREGORIAN, $m, $y);
                return sprintf('%04d-%02d-%02d', $y, $m, $last);
            };

            $startDate = $normalizeDate($rawStart);
            $endDate = $normalizeDate($rawEnd);

            $options = [
                'period' => $periodRaw,
                'startDate' => $startDate,
                'endDate' => $endDate,
                'category_limit' => isset($query['category_limit']) ? (int)$query['category_limit'] : 10,
            ];

            $data = $service->getSalesAnalitics($branchId, $user, $options);

            return ['status' => 200, 'body' => ['success' => true, 'data' => $data]];
        } catch (PDOException $e) {
            return ['status' => 500, 'body' => ['success' => false, 'message' => 'Database error', 'error' => APP_DEBUG ? $e->getMessage() : 'DATABASE_ERROR']];
        } catch (\InvalidArgumentException $e) {
            return ['status' => 400, 'body' => ['success' => false, 'message' => $e->getMessage()]];
        }
    }
}
