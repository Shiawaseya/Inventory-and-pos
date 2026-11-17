<?php

namespace App\Services;

use App\Models\StockUnit;
use App\Database\DatabaseManager;
use App\Entities\ItemVariant;
use App\Enums\StockUnitStatus;
use App\Repositories\StockUnitRepository;
use Doctrine\ORM\EntityManager;

class StockUnitService
{
    private StockUnit $model;
    private EntityManager $entityManager;
    private StockUnitRepository $repository;

    public function __construct(?StockUnit $model = null, ?EntityManager $entityManager = null)
    {
        $this->model = $model instanceof StockUnit ? $model : new StockUnit();
        $this->entityManager = $entityManager ?? DatabaseManager::getEntityManager();
        $this->repository = $this->entityManager->getRepository(\App\Entities\StockUnit::class);
    }

    public function create(array $data): array
    {
        $row = $this->model->create($data);

        if (!empty($data['_audit'])) {
            (new AuditLogService())->record([
                'action' => 'STOCK_IN',
                'module' => 'stock_unit',
                'employee_id' => $data['_audit']['employee_id'] ?? null,
                'branch_id' => $data['branch_id'] ?? null,
                'record_id' => $row['stock_unit_id'] ?? null,
                'new_values' => [
                    'stock_unit_id' => $row['stock_unit_id'] ?? null,
                    'serial_number' => $row['serial_number'] ?? null,
                    'status' => $row['status'] ?? 'available',
                    'variant_id' => $row['variant_id'] ?? ($data['variant_id'] ?? null),
                    'branch_id' => $row['branch_id'] ?? ($data['branch_id'] ?? null),
                ],
                'ip_address' => $data['_audit']['ip_address'] ?? null,
                'user_agent' => $data['_audit']['user_agent'] ?? null,
            ]);
        }

        return $row;
    }

    public function findById(int $id): ?array
    {
        return $this->model->findById($id);
    }

    public function findBySerial(string $serial): ?array
    {
        return $this->model->findBySerial($serial);
    }

    public function findVariantBySerial(string $serial): ?array
    {
        return $this->model->findVariantBySerial($serial);
    }

    public function listByItemAndBranch(int $itemId, int $branchId, int $limit = 100, int $offset = 0): array
    {
        return $this->listByVariantAndBranch($itemId, $branchId, $limit, $offset);
    }

    public function listByVariantAndBranch(int $variantId, int $branchId, int $limit = 100, int $offset = 0): array
    {
        return $this->model->listByVariantAndBranch($variantId, $branchId, $limit, $offset);
    }

    public function getByVariantAndBranch(int $variantId, int $branchId, int $page, int $perPage, array $filters = []): array
    {
        return $this->repository->findByVariantAndBranch($variantId, $branchId, $page, $perPage, $filters);
    }

    public function countByVariantAndBranch(int $variantId, int $branchId, array $filters = []): int
    {
        return $this->repository->countByVariantAndBranch($variantId, $branchId, $filters);
    }

    public function getByStatusAndBranch(string $status, int $branchId, int $page, int $perPage): array
    {
        return $this->repository->findByStatusAndBranch($status, $branchId, $page, $perPage);
    }

    public function countByStatusAndBranch(string $status, int $branchId): int
    {
        return $this->repository->countByStatusAndBranch($status, $branchId);
    }

    public function findVariantIdBySku(string $sku): ?int
    {
        $variant = $this->entityManager->getRepository(ItemVariant::class)->findOneBySku($sku);
        return $variant?->getId();
    }

    public function countByStatus(int $itemId, int $branchId): array
    {
        return $this->model->countByStatus($itemId, $branchId);
    }

    /**
     * Bulk create stock units from client payload.
     * Payload shape: { branch_id: "1", items: [{ item_id:8, serials:["s1","s2"] }, ...] }
     * Returns array with 'created' and 'skipped' entries.
     */
    public function bulkCreateFromPayload(array $payload, ?array $user = null): array
    {
        $results = ['created' => [], 'skipped' => []];

        $branchId = isset($payload['branch_id']) ? (int)$payload['branch_id'] : null;
        // fall back to user token branch if provided
        if ($branchId === null && $user !== null) {
            if (isset($user['branchId'])) $branchId = (int)$user['branchId'];
            elseif (isset($user['branch_id'])) $branchId = (int)$user['branch_id'];
        }

        if ($branchId === null) {
            throw new \InvalidArgumentException('branch_id is required');
        }

        $items = $payload['items'] ?? [];
        if (!is_array($items) || empty($items)) {
            throw new \InvalidArgumentException('items array is required');
        }

        $status = StockUnitStatus::tryFrom((string) ($payload['status'] ?? 'available'));
        if ($status === null || !in_array($status, [
            StockUnitStatus::AVAILABLE,
            StockUnitStatus::UNDER_INSPECTION,
        ], true)) {
            throw new \InvalidArgumentException('Restock status must be available or under_inspection');
        }

        foreach ($items as $it) {
            $itemId = isset($it['variant_id']) ? (int)$it['variant_id'] : (isset($it['item_id']) ? (int)$it['item_id'] : null);
            $serials = $it['serials'] ?? [];
            if ($itemId === null || !is_array($serials)) {
                $results['skipped'][] = ['variant' => $it, 'reason' => 'invalid_item_entry'];
                continue;
            }

            foreach ($serials as $serial) {
                $serial = trim((string)$serial);
                if ($serial === '') {
                    $results['skipped'][] = ['variant_id' => $itemId, 'serial' => $serial, 'reason' => 'empty_serial'];
                    continue;
                }

                // skip if serial already exists
                    $existing = $this->findBySerial($serial);
                if ($existing !== null) {
                        $results['skipped'][] = ['variant_id' => $itemId, 'serial' => $serial, 'reason' => 'exists'];
                    continue;
                }

                try {
                    $row = $this->create([
                        'serial_number' => $serial,
                        'status' => $status->value,
                        'variant_id' => $itemId,
                        'branch_id' => $branchId,
                        '_audit' => [
                            'employee_id' => $payload['_audit']['employee_id'] ?? ($user['employeeId'] ?? $user['employee_id'] ?? null),
                            'ip_address' => $payload['_audit']['ip_address'] ?? null,
                            'user_agent' => $payload['_audit']['user_agent'] ?? null,
                        ],
                    ]);
                    $results['created'][] = $row;
                } catch (\Throwable $e) {
                    $results['skipped'][] = ['variant_id' => $itemId, 'serial' => $serial, 'reason' => 'error', 'error' => $e->getMessage()];
                }
            }
        }

        return $results;
    }
}
