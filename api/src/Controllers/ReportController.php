<?php

namespace App\Controllers;

use App\Services\ReportService;
use PDOException;

class ReportController
{
    public static function dailyByBranch(int $branchId, ?string $date = null)
    {
        $service = new ReportService();
        try {
            $report = $service->generateDailySalesReportByBranchId($branchId, $date);
        } catch (PDOException $e) {
            return [
                'success' => false,
                'message' => 'Database error',
                'error' => defined('APP_DEBUG') && APP_DEBUG ? $e->getMessage() : 'DATABASE_ERROR'
            ];
        }

        return [
            'success' => true,
            'data' => $report
        ];
    }

    public static function dailySales(array $user, ?string $date = null): array
    {
        $branchId = (int) ($user['branchId'] ?? $user['branch_id'] ?? 0);
        $role = strtolower(str_replace('_', '-', (string) ($user['position'] ?? $user['role'] ?? '')));
        $employeeId = (int) ($user['employeeId'] ?? $user['employee_id'] ?? 0);

        if ($branchId <= 0 || $employeeId <= 0) {
            return ['success' => false, 'message' => 'The authenticated user has incomplete branch or employee information.'];
        }

        if ($date === null || $date === '') {
            $date = date('Y-m-d');
        }
        $parsed = \DateTimeImmutable::createFromFormat('!Y-m-d', $date);
        if (!$parsed || $parsed->format('Y-m-d') !== $date) {
            return ['success' => false, 'message' => 'date must use YYYY-MM-DD format.'];
        }

        if ($role === 'sales-representative') {
            $employeeFilter = $employeeId;
        } elseif ($role === 'sales-oic') {
            $employeeFilter = null;
        } else {
            return ['success' => false, 'message' => 'This role cannot access sales reports.'];
        }

        return self::wrap(fn() => (new ReportService())->generateDailySalesReport($branchId, $employeeFilter, $date));
    }

    public static function warrantyByBranch(int $branchId)
    {
        $service = new ReportService();
        try {
            $data = $service->getWarrantyAnalytics($branchId);
        } catch (PDOException $e) {
            return [
                'success' => false,
                'message' => 'Database error',
                'error' => defined('APP_DEBUG') && APP_DEBUG ? $e->getMessage() : 'DATABASE_ERROR'
            ];
        }

        return [
            'success' => true,
            'data' => $data
        ];
    }

    public static function cashierAndPayments(int $branchId, ?string $startDate = null, ?string $endDate = null)
    {
        $service = new ReportService();
        try {
            $data = $service->getCashierAndPaymentAnalytics($branchId, $startDate, $endDate);
        } catch (PDOException $e) {
            return [
                'success' => false,
                'message' => 'Database error',
                'error' => defined('APP_DEBUG') && APP_DEBUG ? $e->getMessage() : 'DATABASE_ERROR'
            ];
        }

        return [
            'success' => true,
            'data' => $data
        ];
    }

    /** Validates Y-m-d dates; defaults to month-to-date. Returns [start, end] or null when invalid. */
    private static function range(?string $start, ?string $end): ?array
    {
        $start = $start ?: date('Y-m-01');
        $end = $end ?: date('Y-m-d');
        foreach ([$start, $end] as $d) {
            $dt = \DateTimeImmutable::createFromFormat('Y-m-d', $d);
            if (!$dt || $dt->format('Y-m-d') !== $d) {
                return null;
            }
        }
        return $start <= $end ? [$start, $end] : null;
    }

    private static function wrap(callable $fn): array
    {
        try {
            return ['success' => true, 'data' => $fn()];
        } catch (PDOException $e) {
            return [
                'success' => false,
                'message' => 'Database error',
                'error' => defined('APP_DEBUG') && APP_DEBUG ? $e->getMessage() : 'DATABASE_ERROR'
            ];
        }
    }

    public static function salesIntegrity(int $branchId, ?string $startDate = null, ?string $endDate = null)
    {
        $r = self::range($startDate, $endDate);
        if ($branchId <= 0 || !$r) {
            return ['success' => false, 'message' => 'A valid branch and a start_date/end_date (YYYY-MM-DD) range are required.'];
        }
        return self::wrap(fn() => (new ReportService())->getSalesIntegrityAnalytics($branchId, $r[0], $r[1]));
    }

    public static function stockShrinkage(int $branchId, ?string $startDate = null, ?string $endDate = null)
    {
        $r = self::range($startDate, $endDate);
        if ($branchId <= 0 || !$r) {
            return ['success' => false, 'message' => 'A valid branch and a start_date/end_date (YYYY-MM-DD) range are required.'];
        }
        return self::wrap(fn() => (new ReportService())->getStockShrinkageAnalytics($branchId, $r[0], $r[1]));
    }

    public static function customerInsights(int $branchId, ?string $startDate = null, ?string $endDate = null)
    {
        $r = self::range($startDate, $endDate);
        if ($branchId <= 0 || !$r) {
            return ['success' => false, 'message' => 'A valid branch and a start_date/end_date (YYYY-MM-DD) range are required.'];
        }
        return self::wrap(fn() => (new ReportService())->getCustomerAnalytics($branchId, $r[0], $r[1]));
    }

    public static function serviceDesk(int $branchId, ?string $startDate = null, ?string $endDate = null)
    {
        $r = self::range($startDate, $endDate);
        if ($branchId <= 0 || !$r) {
            return ['success' => false, 'message' => 'A valid branch and a start_date/end_date (YYYY-MM-DD) range are required.'];
        }
        return self::wrap(fn() => (new ReportService())->getServiceDeskAnalytics($branchId, $r[0], $r[1]));
    }
}