<?php

namespace App\Controllers;

use App\Entities\Address;
use App\Entities\ServiceReport;
use App\Entities\ServiceReportAction;
use App\Services\ServiceReportService;
use Throwable;

class ServiceReportController
{
    private static function auditContext(array $request): array
    {
        return $request['_audit'] ?? [
            'ip_address' => $_SERVER['REMOTE_ADDR'] ?? null,
            'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? null,
        ];
    }

    public static function lookup(array $request): array
    {
        try {
            $query = $request['query'] ?? [];
            $term = $query['q'] ?? $query['serial_number'] ?? $query['sales_invoice_number'] ?? '';
            $result = (new ServiceReportService())->lookup((string) $term);
            return $result
                ? ['status' => 200, 'body' => ['success' => true, 'data' => $result]]
                : self::error(404, 'No matching serial number or sales invoice found');
        } catch (\InvalidArgumentException $e) {
            return self::error(400, $e->getMessage());
        } catch (Throwable $e) {
            return self::error(500, $e->getMessage());
        }
    }

    public static function listByBranch(array $request): array
    {
        try {
            $branchId = (int) (($request['params'][0] ?? null) ?: ($request['query']['branch_id'] ?? 0));
            if ($branchId <= 0) {
                return self::error(400, 'branch_id is required');
            }

            $page = max(1, (int) ($request['query']['page'] ?? 1));
            $perPage = min(100, max(1, (int) ($request['query']['per_page'] ?? 10)));
            $result = (new ServiceReportService())->listByBranch($branchId, $page, $perPage);

            return ['status' => 200, 'body' => [
                'success' => true,
                'data' => array_map([self::class, 'serializeReport'], $result['data']),
                'pagination' => [
                    'page' => $page,
                    'per_page' => $perPage,
                    'total' => $result['total'],
                    'last_page' => (int) ceil($result['total'] / $perPage),
                ],
            ]];
        } catch (Throwable $e) {
            return self::error(500, $e->getMessage());
        }
    }

    public static function show(array $request): array
    {
        try {
            $report = (new ServiceReportService())->find((int) ($request['params'][0] ?? 0));
            return $report ? ['status' => 200, 'body' => ['success' => true, 'data' => self::serializeReport($report, true)]] : self::error(404, 'Service report not found');
        } catch (Throwable $e) {
            return self::error(500, $e->getMessage());
        }
    }

    public static function showByControlNumber(array $request): array
    {
        try {
            $controlNumber = trim((string) ($request['params'][0] ?? ''));
            $report = (new ServiceReportService())->findByControlNumber($controlNumber);
            return $report ? ['status' => 200, 'body' => ['success' => true, 'data' => self::serializeReport($report, true)]] : self::error(404, 'Service report not found');
        } catch (Throwable $e) {
            return self::error(500, $e->getMessage());
        }
    }

    public static function create(array $request): array
    {
        try {
            $employeeId = self::employeeId($request);
            $branchId = (int) ($request['user']['branchId'] ?? $request['user']['branch_id'] ?? 0);
            $auditContext = self::auditContext($request);
            $report = (new ServiceReportService())->create($request['body'] ?? [], $employeeId, $branchId, $auditContext);
            return ['status' => 201, 'body' => ['success' => true, 'message' => 'Service report created successfully', 'data' => self::serializeReport($report, true)]];
        } catch (\InvalidArgumentException $e) {
            return self::error(400, $e->getMessage());
        } catch (Throwable $e) {
            return self::error(500, $e->getMessage());
        }
    }

    public static function addAction(array $request): array
    {
        try {
            $auditContext = self::auditContext($request);
            $action = (new ServiceReportService())->addAction((int) ($request['params'][0] ?? 0), $request['body'] ?? [], self::employeeId($request), $auditContext);
            return ['status' => 201, 'body' => ['success' => true, 'message' => 'Service report action added successfully', 'data' => self::serializeAction($action)]];
        } catch (\InvalidArgumentException $e) {
            return self::error(400, $e->getMessage());
        } catch (Throwable $e) {
            return self::error(500, $e->getMessage());
        }
    }

    public static function certify(array $request): array
    {
        try {
            $auditContext = self::auditContext($request);
            $report = (new ServiceReportService())->certify((int) ($request['params'][0] ?? 0), self::employeeId($request), $auditContext);
            return ['status' => 200, 'body' => ['success' => true, 'message' => 'Service report certified successfully', 'data' => self::serializeReport($report, true)]];
        } catch (\InvalidArgumentException $e) {
            return self::error(400, $e->getMessage());
        } catch (Throwable $e) {
            return self::error(500, $e->getMessage());
        }
    }

    private static function employeeId(array $request): int
    {
        $id = (int) ($request['user']['employeeId'] ?? $request['user']['employee_id'] ?? 0);
        if ($id <= 0) {
            throw new \InvalidArgumentException('Authenticated employee is required');
        }
        return $id;
    }

    private static function serializeReport(ServiceReport $report, bool $includeActions = false): array
    {
        $invoice = $report->getSalesInvoice();
        $stockUnit = $report->getStockUnit();
        $variant = $stockUnit->getVariant();
        $item = $variant?->getItem();
        $customer = $invoice->getCustomer();

        $contactNumber = self::firstFilled($report->getContactNumber(), $customer?->getContactNumber());
        $ownAddress = $report->getAddress();
        $address = self::firstFilled($ownAddress ? self::addressText($ownAddress) : null, $customer ? self::address($customer) : null);

        $data = [
            'id' => $report->getId(),
            'control_number' => $report->getControlNumber(),
            'branch_id' => $report->getBranch()->getId(),
            'reported_date' => $report->getReportedDate()->format('Y-m-d'),
            'complaint_description' => $report->getComplaintDescription(),
            'report_to' => $report->getReportTo(),
            'asc_name' => $report->getAscName(),
            'contact_number' => $report->getContactNumber(),
            'address_id' => $ownAddress ? (int) $ownAddress->getId() : null,
            'address_details' => $ownAddress ? [
                'street_address' => $ownAddress->getStreetAddress(),
                'barangay' => $ownAddress->getBarangay(),
                'city_municipality' => $ownAddress->getCityMunicipality(),
                'province' => $ownAddress->getProvince(),
                'region' => $ownAddress->getRegion(),
                'postal_code' => $ownAddress->getPostalCode(),
                'psgc_code' => $ownAddress->getPsgcCode(),
            ] : null,
            'certified_at' => $report->getCertifiedAt()?->format('c'),
            'created_at' => $report->getCreatedAt()->format('c'),
            'updated_at' => $report->getUpdatedAt()->format('c'),
            'customer' => ($customer || $contactNumber !== null || $address !== null) ? [
                'id' => $customer?->getId(),
                'name' => $customer ? self::personName($customer->getFirstName(), $customer->getMiddleName(), $customer->getLastName()) : '',
                'contact_number' => $contactNumber,
                'address' => $address,
            ] : null,
            'unit' => [
                'stock_unit_id' => $stockUnit->getId(),
                'serial_number' => $stockUnit->getSerialNumber(),
                'brand' => $item?->getBrand()?->getName(),
                'model' => $variant?->getModel(),
            ],
            'invoice' => [
                'sales_invoice_id' => $invoice->getId(),
                'invoice_number' => $invoice->getInvoiceNumber(),
                'date_of_purchase' => $invoice->getDateOfPurchase()?->format('Y-m-d'),
            ],
            'prepared_by' => [
                'employee_id' => $report->getPreparedBy()->getId(),
                'name' => self::employeeName($report->getPreparedBy()),
            ],
            'certified_by' => $report->getCertifiedBy() ? [
                'employee_id' => $report->getCertifiedBy()->getId(),
                'name' => self::employeeName($report->getCertifiedBy()),
            ] : null,
        ];

        if ($includeActions) {
            $data['actions'] = array_map([self::class, 'serializeAction'], $report->getActions()->toArray());
        }
        return $data;
    }

    private static function serializeAction(ServiceReportAction $action): array
    {
        return [
            'id' => $action->getId(),
            'service_report_id' => $action->getServiceReport()->getId(),
            'action_date' => $action->getActionDate()->format('Y-m-d'),
            'action_taken' => $action->getActionTaken(),
            'logged_by' => self::employeeName($action->getEmployee()),
            'created_at' => $action->getCreatedAt()->format('c'),
        ];
    }

    private static function personName(?string $firstName, ?string $middleName, ?string $lastName): string
    {
        return trim(implode(' ', array_filter([$firstName, $middleName, $lastName], fn($value) => $value !== null && trim($value) !== '')));
    }

    private static function employeeName(\App\Entities\Employee $employee): string
    {
        return self::personName($employee->getFirstName(), $employee->getMiddleName(), $employee->getLastName());
    }

    private static function address(\App\Entities\Customer $customer): string
    {
        return implode(', ', array_filter([
            $customer->getStreetAddress(),
            $customer->getBarangay(),
            $customer->getCityMunicipality(),
            $customer->getProvince(),
        ], fn($value) => $value !== null && trim($value) !== ''));
    }

    private static function addressText(Address $address): string
    {
        return implode(', ', array_filter([
            $address->getStreetAddress(),
            $address->getBarangay(),
            $address->getCityMunicipality(),
            $address->getProvince(),
        ], fn($value) => $value !== null && trim($value) !== ''));
    }

    private static function firstFilled(?string ...$values): ?string
    {
        foreach ($values as $value) {
            if ($value !== null && trim($value) !== '') {
                return trim($value);
            }
        }
        return null;
    }

    private static function error(int $status, string $message): array
    {
        return ['status' => $status, 'body' => ['success' => false, 'message' => $message]];
    }
}