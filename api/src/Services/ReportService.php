<?php

namespace App\Services;

use App\Models\Report;

class ReportService
{
    private Report $report;

    public function __construct(?Report $report = null)
    {
        $this->report = $report instanceof Report ? $report : new Report();
    }

    public function generateDailySalesReportByBranchId(int $branchId, ?string $date = null): array
    {
        return $this->report->generateDailySalesReportByBranchId($branchId, $date);
    }

    public function generateDailySalesReport(int $branchId, ?int $employeeId = null, ?string $date = null): array
    {
        return $this->report->generateDailySalesReport($branchId, $employeeId, $date);
    }

    public function getWarrantyAnalytics(int $branchId): array
    {
        return $this->report->getWarrantyAnalytics($branchId);
    }

    public function getCashierAndPaymentAnalytics(int $branchId, ?string $startDate = null, ?string $endDate = null): array
    {
        return $this->report->getCashierAndPaymentAnalytics($branchId, $startDate, $endDate);
    }

    public function getSalesIntegrityAnalytics(int $branchId, string $startDate, string $endDate): array
    {
        return $this->report->getSalesIntegrityAnalytics($branchId, $startDate, $endDate);
    }

    public function getStockShrinkageAnalytics(int $branchId, string $startDate, string $endDate): array
    {
        return $this->report->getStockShrinkageAnalytics($branchId, $startDate, $endDate);
    }

    public function getCustomerAnalytics(int $branchId, string $startDate, string $endDate): array
    {
        return $this->report->getCustomerAnalytics($branchId, $startDate, $endDate);
    }

    public function getServiceDeskAnalytics(int $branchId, string $startDate, string $endDate): array
    {
        return $this->report->getServiceDeskAnalytics($branchId, $startDate, $endDate);
    }
}