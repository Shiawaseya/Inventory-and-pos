<?php

namespace App\Services;

use App\Entities\Address;
use App\Entities\Branch;
use App\Entities\Employee;
use App\Entities\SalesInvoice;
use App\Entities\ServiceReport;
use App\Entities\ServiceReportAction;
use App\Entities\StockUnit;
use App\Repositories\ServiceReportRepository;
use DateTime;
use DateTimeImmutable;
use Doctrine\ORM\EntityManager;
use PDO;

class ServiceReportService
{
    private EntityManager $entityManager;
    private ServiceReportRepository $reports;
    private PDO $pdo;

    public function __construct(?EntityManager $entityManager = null)
    {
        $this->entityManager = $entityManager ?? \App\Database\DatabaseManager::getEntityManager();
        $this->reports = $this->entityManager->getRepository(ServiceReport::class);
        $this->pdo = \App\Database\DatabaseManager::getPdo();
    }

    public function lookup(string $term): ?array
    {
        $term = trim($term);
        if ($term === '') {
            throw new \InvalidArgumentException('serial_number or sales_invoice_number is required');
        }

        $stmt = $this->pdo->prepare(
            'SELECT
                su.stock_unit_id,
                su.serial_number,
                b.name AS brand,
                v.model,
                si.sales_invoice_id,
                si.sales_invoice_number,
                si.date_of_purchase,
                c.customer_id,
                c.first_name,
                c.middle_name,
                c.last_name,
                c.contact_number,
                a.address_id,
                a.street_address,
                a.barangay,
                a.city_municipality,
                a.province,
                a.region,
                a.postal_code,
                a.psgc_code
             FROM sales_details sd
             INNER JOIN sales_invoice si ON si.sales_invoice_id = sd.sales_invoice_id
             INNER JOIN stock_unit su ON su.stock_unit_id = sd.stock_unit_id
             LEFT JOIN item_variants v ON v.variant_id = su.variant_id
             LEFT JOIN items i ON i.item_id = v.item_id
             LEFT JOIN brands b ON b.brand_id = i.brand_id
             LEFT JOIN customers c ON c.customer_id = si.customer_id
             LEFT JOIN addresses a ON a.address_id = c.address_id
             WHERE su.serial_number = :serial_term OR si.sales_invoice_number = :invoice_term
             ORDER BY si.date_of_purchase DESC
             LIMIT 1'
        );
        $stmt->execute([
            ':serial_term' => $term,
            ':invoice_term' => $term,
        ]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$row) {
            return null;
        }

        return [
            'stock_unit_id' => (int) $row['stock_unit_id'],
            'serial_number' => $row['serial_number'],
            'brand' => $row['brand'],
            'model' => $row['model'],
            'sales_invoice_id' => (int) $row['sales_invoice_id'],
            'invoice_number' => $row['sales_invoice_number'],
            'date_of_purchase' => $row['date_of_purchase'],
            'customer' => $row['customer_id'] === null ? null : [
                'id' => (int) $row['customer_id'],
                'name' => trim(implode(' ', array_filter([
                    $row['first_name'],
                    $row['middle_name'],
                    $row['last_name'],
                ]))),
                'address_id' => $row['address_id'] === null ? null : (int) $row['address_id'],
                'address_details' => $row['address_id'] === null ? null : [
                    'street_address' => $row['street_address'],
                    'barangay' => $row['barangay'],
                    'city_municipality' => $row['city_municipality'],
                    'province' => $row['province'],
                    'region' => $row['region'],
                    'postal_code' => $row['postal_code'],
                    'psgc_code' => $row['psgc_code'],
                ],
                'contact_number' => $row['contact_number'],
                'address' => implode(', ', array_filter([
                    $row['street_address'],
                    $row['barangay'],
                    $row['city_municipality'],
                    $row['province'],
                ])),
            ],
        ];
    }

    public function listByBranch(int $branchId, int $page, int $perPage): array
    {
        return [
            'data' => $this->reports->findByBranch($branchId, $page, $perPage),
            'total' => $this->reports->countByBranch($branchId),
        ];
    }

    public function find(int $id): ?ServiceReport
    {
        return $this->reports->find($id);
    }

    public function findByControlNumber(string $controlNumber): ?ServiceReport
    {
        return $this->reports->findOneByControlNumber($controlNumber);
    }

    public function create(array $data, int $employeeId, int $defaultBranchId, array $auditContext = []): ServiceReport
    {
        $controlNumber = trim((string) ($data['control_number'] ?? ''));
        if ($controlNumber === '') {
            $controlNumber = $this->generateControlNumber();
        }
        $complaint = trim((string) ($data['complaint_description'] ?? ''));
        $reportedDate = $this->parseDate($data['reported_date'] ?? null, 'reported_date');
        $branchId = (int) ($data['branch_id'] ?? $defaultBranchId);
        $stockUnitId = (int) ($data['stock_unit_id'] ?? 0);
        $invoiceId = (int) ($data['sales_invoice_id'] ?? 0);

        if ($complaint === '' || $branchId <= 0 || $stockUnitId <= 0 || $invoiceId <= 0) {
            throw new \InvalidArgumentException('branch_id, stock_unit_id, sales_invoice_id, complaint_description, and reported_date are required');
        }

        if ($this->findByControlNumber($controlNumber)) {
            throw new \InvalidArgumentException('control_number already exists');
        }

        $this->assertUnitBelongsToInvoice($stockUnitId, $invoiceId);

        $branch = $this->requireEntity(Branch::class, $branchId, 'Branch');
        $stockUnit = $this->requireEntity(StockUnit::class, $stockUnitId, 'Stock unit');
        $salesInvoice = $this->requireEntity(SalesInvoice::class, $invoiceId, 'Sales invoice');
        $preparedBy = $this->requireEntity(Employee::class, $employeeId, 'Employee');

        $report = new ServiceReport($controlNumber, $branch, $stockUnit, $salesInvoice, $complaint, $reportedDate, $preparedBy);
        $report->setReportTo($this->nullableString($data['report_to'] ?? null));
        $report->setAscName($this->nullableString($data['asc_name'] ?? null));

        $contactNumber = $this->nullableString($data['contact_number'] ?? null);
        if ($contactNumber !== null && mb_strlen($contactNumber) > 50) {
            throw new \InvalidArgumentException('contact_number must not exceed 50 characters');
        }
        $report->setContactNumber($contactNumber);

        return $this->entityManager->wrapInTransaction(function () use (
            $report,
            $data,
            $controlNumber,
            $branchId,
            $stockUnitId,
            $invoiceId,
            $employeeId,
            $auditContext
        ) {
            $report->setAddress($this->resolveAddress($data));
            $this->entityManager->persist($report);
            $this->entityManager->flush();

            (new AuditLogService($this->entityManager))->record([
                'action'        => 'CREATE',
                'module'        => 'service_reports',
                'employee_id'   => $employeeId,
                'branch_id'     => $branchId,
                'record_id'     => (string) $report->getId(),
                'old_values'    => null,
                'new_values'    => [
                    'control_number'        => $controlNumber,
                    'stock_unit_id'         => $stockUnitId,
                    'sales_invoice_id'      => $invoiceId,
                    'complaint_description' => $report->getComplaintDescription(),
                    'report_to'             => $report->getReportTo(),
                    'asc_name'              => $report->getAscName(),
                    'contact_number'        => $report->getContactNumber(),
                    'address_id'            => $report->getAddress()?->getId(),
                    'reported_date'         => $report->getReportedDate()->format('Y-m-d'),
                ],
                'ip_address'    => $auditContext['ip_address'] ?? null,
                'user_agent'    => $auditContext['user_agent'] ?? null,
            ]);

            return $report;
        });
    }

    private function resolveAddress(array $data): ?Address
    {
        $addressId = (int) ($data['address_id'] ?? 0);
        if ($addressId > 0) {
            return $this->requireEntity(Address::class, $addressId, 'Address');
        }

        $input = $data['address'] ?? null;
        if (!is_array($input)) {
            return null;
        }

        $limits = [
            'street_address' => 255,
            'barangay' => 100,
            'city_municipality' => 100,
            'province' => 100,
            'region' => 100,
            'postal_code' => 10,
            'psgc_code' => 20,
        ];
        $row = [];
        foreach ($limits as $field => $max) {
            $value = is_scalar($input[$field] ?? null) ? $this->nullableString($input[$field]) : null;
            if ($value !== null && mb_strlen($value) > $max) {
                throw new \InvalidArgumentException("address.$field must not exceed $max characters");
            }
            $row[$field] = $value;
        }

        if (count(array_filter($row, fn($v) => $v !== null)) === 0) {
            return null;
        }

        $conn = $this->entityManager->getConnection();
        $conn->insert('addresses', $row);

        return $this->entityManager->getReference(Address::class, (int) $conn->lastInsertId());
    }

    private function assertUnitBelongsToInvoice(int $stockUnitId, int $invoiceId): void
    {
        $stmt = $this->pdo->prepare(
            'SELECT 1 FROM sales_details
             WHERE stock_unit_id = :stock_unit_id AND sales_invoice_id = :sales_invoice_id
             LIMIT 1'
        );
        $stmt->execute([
            ':stock_unit_id' => $stockUnitId,
            ':sales_invoice_id' => $invoiceId,
        ]);

        if (!$stmt->fetchColumn()) {
            throw new \InvalidArgumentException('stock_unit_id does not belong to sales_invoice_id');
        }
    }

    private function generateControlNumber(): string
    {
        do {
            $controlNumber = 'SR-' . date('Ymd') . '-' . strtoupper(bin2hex(random_bytes(3)));
        } while ($this->findByControlNumber($controlNumber));

        return $controlNumber;
    }

    public function addAction(int $reportId, array $data, int $employeeId, array $auditContext = []): ServiceReportAction
    {
        $report = $this->find($reportId);
        if (!$report) {
            throw new \InvalidArgumentException('Service report not found');
        }

        $actionTaken = trim((string) ($data['action_taken'] ?? ''));
        if ($actionTaken === '') {
            throw new \InvalidArgumentException('action_taken is required');
        }

        $actionDate = $this->parseDate($data['action_date'] ?? date('Y-m-d'), 'action_date');
        $employee = $this->requireEntity(Employee::class, $employeeId, 'Employee');

        return $this->entityManager->wrapInTransaction(function () use (
            $report,
            $actionDate,
            $actionTaken,
            $employee,
            $reportId,
            $employeeId,
            $auditContext
        ) {
            $action = new ServiceReportAction($actionDate, $actionTaken, $employee);
            $report->addAction($action);
            $this->entityManager->persist($action);
            $this->entityManager->flush();

            (new AuditLogService($this->entityManager))->record([
                'action'        => 'CREATE',
                'module'        => 'service_report_actions',
                'employee_id'   => $employeeId,
                'branch_id'     => $report->getBranch()->getId(),
                'record_id'     => (string) $action->getId(),
                'old_values'    => null,
                'new_values'    => [
                    'service_report_id' => $reportId,
                    'control_number'    => $report->getControlNumber(),
                    'action_date'       => $actionDate->format('Y-m-d'),
                    'action_taken'      => $actionTaken,
                    'logged_by_id'      => $employeeId,
                ],
                'ip_address'    => $auditContext['ip_address'] ?? null,
                'user_agent'    => $auditContext['user_agent'] ?? null,
            ]);

            return $action;
        });
    }

    public function certify(int $reportId, int $employeeId, array $auditContext = []): ServiceReport
    {
        $report = $this->find($reportId);
        if (!$report) {
            throw new \InvalidArgumentException('Service report not found');
        }

        $employee = $this->requireEntity(Employee::class, $employeeId, 'Employee');
        $oldCertifiedAt = $report->getCertifiedAt()?->format('c');
        $oldCertifiedById = $report->getCertifiedBy()?->getId();

        return $this->entityManager->wrapInTransaction(function () use (
            $report,
            $employee,
            $reportId,
            $employeeId,
            $oldCertifiedAt,
            $oldCertifiedById,
            $auditContext
        ) {
            $now = new DateTimeImmutable();
            $report->setCertifiedBy($employee);
            $report->setCertifiedAt($now);
            $this->entityManager->flush();

            (new AuditLogService($this->entityManager))->record([
                'action'        => 'AUTHORIZE',
                'module'        => 'service_reports',
                'employee_id'   => $employeeId,
                'branch_id'     => $report->getBranch()->getId(),
                'record_id'     => (string) $reportId,
                'old_values'    => [
                    'certified_at' => $oldCertifiedAt,
                    'certified_by' => $oldCertifiedById,
                ],
                'new_values'    => [
                    'control_number' => $report->getControlNumber(),
                    'certified_at'   => $now->format('c'),
                    'certified_by'   => $employeeId,
                ],
                'ip_address'    => $auditContext['ip_address'] ?? null,
                'user_agent'    => $auditContext['user_agent'] ?? null,
            ]);

            return $report;
        });
    }

    private function requireEntity(string $class, int $id, string $label): object
    {
        $entity = $this->entityManager->find($class, $id);
        if (!$entity) {
            throw new \InvalidArgumentException($label . ' not found');
        }
        return $entity;
    }

    private function parseDate($value, string $field): DateTime
    {
        try {
            $date = new DateTime((string) $value);
        } catch (\Exception $e) {
            throw new \InvalidArgumentException($field . ' must be a valid date');
        }
        return $date;
    }

    private function nullableString($value): ?string
    {
        $value = trim((string) $value);
        return $value === '' ? null : $value;
    }
}