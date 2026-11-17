<?php

namespace App\Services;

use App\Database\DatabaseManager;
use App\Entities\Branch;
use App\Entities\BranchItem;
use App\Entities\Employee;
use App\Entities\Inventory;
use App\Entities\ItemVariant;
use App\Entities\StockUnit;
use App\Repositories\BranchItemRepository;
use Doctrine\ORM\EntityManager;

class BranchItemService
{
    private EntityManager $entityManager;
    private BranchItemRepository $repository;

    public function __construct(?EntityManager $entityManager = null)
    {
        $this->entityManager = $entityManager ?? DatabaseManager::getEntityManager();
        $this->repository = $this->entityManager->getRepository(BranchItem::class);
    }

    public function create(array $data, ?array $user = null): BranchItem
    {
        $variantId = (int) ($data['variant_id'] ?? 0);
        $branchId = (int) ($data['branch_id'] ?? 0);
        $price = (float) ($data['price'] ?? 0);

        if ($variantId <= 0 || $branchId <= 0 || $price <= 0) {
            throw new \InvalidArgumentException('Valid variant_id, branch_id, and positive price are required');
        }

        $variant = $this->entityManager->find(ItemVariant::class, $variantId);
        if (!$variant) {
            throw new \InvalidArgumentException('Item variant not found');
        }

        $branch = $this->entityManager->find(Branch::class, $branchId);
        if (!$branch) {
            throw new \InvalidArgumentException('Branch not found');
        }

        $existing = $this->repository->findOneByVariantAndBranch($variantId, $branchId);
        if ($existing) {
            throw new \InvalidArgumentException('Pricing for this variant and branch already exists');
        }

        $employee = null;
        $employeeId = $user['employee_id'] ?? $user['employeeId'] ?? $data['updated_by'] ?? null;
        if (!empty($employeeId)) {
            $employee = $this->entityManager->find(Employee::class, (int) $employeeId);
        }

        $reorderLevel = isset($data['reorder_level']) && $data['reorder_level'] !== '' ? (int) $data['reorder_level'] : null;

        return $this->entityManager->wrapInTransaction(function () use ($variant, $branch, $price, $reorderLevel, $employee, $data, $branchId) {
            $branchItem = new BranchItem($variant, $branch, $price, $reorderLevel, $employee);

            $this->entityManager->persist($branchItem);
            $this->entityManager->flush();

            (new AuditLogService($this->entityManager))->record([
                'action'        => 'CREATE',
                'module'        => 'branch_item',
                'employee_id'   => $employee?->getId(),
                'branch_id'     => $branchId,
                'record_id'     => (string) $branchItem->getId(),
                'old_values'    => null,
                'new_values'    => [
                    'variant_id'    => $variant->getId(),
                    'branch_id'     => $branchId,
                    'price'         => $price,
                    'reorder_level' => $reorderLevel,
                ],
                'ip_address'    => $data['_audit']['ip_address'] ?? null,
                'user_agent'    => $data['_audit']['user_agent'] ?? null,
            ]);

            return $branchItem;
        });
    }

    public function update(int $id, array $data, ?array $user = null): ?BranchItem
    {
        $branchItem = $this->entityManager->find(BranchItem::class, $id);
        if (!$branchItem) {
            return null;
        }

        $price = null;
        if (isset($data['price'])) {
            $price = (float) $data['price'];
            if ($price <= 0) {
                throw new \InvalidArgumentException('Price must be greater than 0');
            }
        }

        $reorder = null;
        $reorderProvided = array_key_exists('reorder_level', $data);
        if ($reorderProvided) {
            $reorder = $data['reorder_level'] !== '' && $data['reorder_level'] !== null ? (int) $data['reorder_level'] : null;
        }

        $employee = null;
        $employeeId = $user['employee_id'] ?? $user['employeeId'] ?? $data['updated_by'] ?? null;
        if (!empty($employeeId)) {
            $employee = $this->entityManager->find(Employee::class, (int) $employeeId);
        }

        $oldValues = [
            'price'         => $branchItem->getPrice(),
            'reorder_level' => $branchItem->getReorderLevel(),
        ];

        return $this->entityManager->wrapInTransaction(function () use (
            $branchItem,
            $price,
            $reorder,
            $reorderProvided,
            $employee,
            $oldValues,
            $data
        ) {
            $action = 'UPDATE';
            if ($price !== null && (float)$oldValues['price'] !== (float)$price) {
                $action = 'PRICE_CHANGE';
                $branchItem->setPrice($price);
            }

            if ($reorderProvided) {
                $branchItem->setReorderLevel($reorder);
            }

            if ($employee !== null) {
                $branchItem->setUpdatedBy($employee);
            }

            $this->entityManager->flush();

            (new AuditLogService($this->entityManager))->record([
                'action'        => $action,
                'module'        => 'branch_item',
                'employee_id'   => $employee?->getId(),
                'branch_id'     => $branchItem->getBranch()?->getId(),
                'record_id'     => (string) $branchItem->getId(),
                'old_values'    => $oldValues,
                'new_values'    => [
                    'price'         => $branchItem->getPrice(),
                    'reorder_level' => $branchItem->getReorderLevel(),
                ],
                'ip_address'    => $data['_audit']['ip_address'] ?? null,
                'user_agent'    => $data['_audit']['user_agent'] ?? null,
            ]);

            return $branchItem;
        });
    }

    /**
     * Bulk update prices atomically.
     * Expects $items as array of: [['id' => int, 'price' => float], ...]
     */
    public function bulkUpdatePrices(array $items, ?array $user = null, array $auditContext = []): array
    {
        $employee = null;
        $employeeId = $user['employee_id'] ?? $user['employeeId'] ?? null;
        if (!empty($employeeId)) {
            $employee = $this->entityManager->find(Employee::class, (int) $employeeId);
        }

        return $this->entityManager->wrapInTransaction(function () use ($items, $employee, $auditContext) {
            $updatedRecords = [];
            $auditService = new AuditLogService($this->entityManager);

            foreach ($items as $entry) {
                $id = (int) ($entry['id'] ?? $entry['branch_item_id'] ?? 0);
                $newPrice = (float) ($entry['price'] ?? 0);

                if ($id <= 0 || $newPrice <= 0) {
                    throw new \InvalidArgumentException("Valid branch_item_id and price > 0 required for every item");
                }

                $branchItem = $this->entityManager->find(BranchItem::class, $id);
                if (!$branchItem) {
                    throw new \InvalidArgumentException("Branch item #{$id} not found");
                }

                $oldPrice = (float) $branchItem->getPrice();
                if ($oldPrice === $newPrice) {
                    $updatedRecords[] = $branchItem;
                    continue;
                }

                $branchItem->setPrice($newPrice);
                if ($employee !== null) {
                    $branchItem->setUpdatedBy($employee);
                }

                $auditService->record([
                    'action'        => 'PRICE_CHANGE',
                    'module'        => 'branch_item',
                    'employee_id'   => $employee?->getId(),
                    'branch_id'     => $branchItem->getBranch()?->getId(),
                    'record_id'     => (string) $branchItem->getId(),
                    'old_values'    => ['price' => $oldPrice],
                    'new_values'    => ['price' => $newPrice],
                    'ip_address'    => $auditContext['ip_address'] ?? null,
                    'user_agent'    => $auditContext['user_agent'] ?? null,
                ]);

                $updatedRecords[] = $branchItem;
            }

            $this->entityManager->flush();
            return $updatedRecords;
        });
    }

    public function delete(int $id, ?array $user = null, array $auditContext = []): bool
    {
        $branchItem = $this->entityManager->find(BranchItem::class, $id);
        if (!$branchItem) {
            return false;
        }

        $employee = null;
        $employeeId = $user['employee_id'] ?? $user['employeeId'] ?? null;
        if (!empty($employeeId)) {
            $employee = $this->entityManager->find(Employee::class, (int) $employeeId);
        }

        $branchId = $branchItem->getBranch()?->getId();
        $variantId = $branchItem->getVariant()?->getId();
        $oldValues = [
            'variant_id'    => $variantId,
            'branch_id'     => $branchId,
            'price'         => $branchItem->getPrice(),
            'reorder_level' => $branchItem->getReorderLevel(),
        ];

        return $this->entityManager->wrapInTransaction(function () use ($branchItem, $id, $branchId, $oldValues, $employee, $auditContext) {
            (new AuditLogService($this->entityManager))->record([
                'action'        => 'DELETE',
                'module'        => 'branch_item',
                'employee_id'   => $employee?->getId(),
                'branch_id'     => $branchId,
                'record_id'     => (string) $id,
                'old_values'    => $oldValues,
                'new_values'    => null,
                'ip_address'    => $auditContext['ip_address'] ?? null,
                'user_agent'    => $auditContext['user_agent'] ?? null,
            ]);

            $this->entityManager->remove($branchItem);
            $this->entityManager->flush();
            return true;
        });
    }

    public function findById(int $id): ?BranchItem
    {
        return $this->entityManager->find(BranchItem::class, $id);
    }

    /**
     * @return BranchItem[]
     */
    public function getByBranch(int $branchId, int $page, int $perPage, array $filters = []): array
    {
        return $this->repository->findByBranch($branchId, $page, $perPage, $filters);
    }

    public function countByBranch(int $branchId, array $filters = []): int
    {
        return $this->repository->countByBranch($branchId, $filters);
    }

    /**
     * Builds stock availability aggregated from StockUnit or Inventory entities.
     */
    public function getStockStats(int $variantId, int $branchId, bool $isSerialized): array
    {
        if ($isSerialized) {
            $dql = "SELECT s.status, COUNT(s.id) as cnt 
                    FROM " . StockUnit::class . " s 
                    WHERE s.variant = :variantId AND s.branch = :branchId 
                    GROUP BY s.status";

            $rows = $this->entityManager->createQuery($dql)
                ->setParameter('variantId', $variantId)
                ->setParameter('branchId', $branchId)
                ->getArrayResult();

            $counts = [
                'available' => 0, 
                'sold'      => 0, 
                'reserved'  => 0, 
                'damaged'   => 0, 
                'returned'  => 0
            ];

            foreach ($rows as $r) {
                $status = $r['status'];

                if ($status instanceof \BackedEnum) {
                    $statusKey = (string) $status->value;
                } elseif ($status instanceof \UnitEnum) {
                    $statusKey = $status->name;
                } elseif (is_object($status) && method_exists($status, '__toString')) {
                    $statusKey = (string) $status;
                } else {
                    $statusKey = (string) $status;
                }

                if (array_key_exists($statusKey, $counts)) {
                    $counts[$statusKey] = (int) $r['cnt'];
                }
            }

            return [
                'stock_quantity'  => $counts['reserved'] + $counts['available'] + $counts['damaged'],
                'available_count' => $counts['available'],
                'reserved_count'  => $counts['reserved'],
                'damaged_count'   => $counts['damaged'],
            ];
        }

        $inventory = $this->entityManager->getRepository(Inventory::class)
            ->findOneBy(['variant' => $variantId, 'branch' => $branchId]);

        $quantity = $inventory ? (int) $inventory->getQuantity() : 0;

        return [
            'stock_quantity'  => $quantity,
            'available_count' => $quantity,
            'reserved_count'  => 0,
            'damaged_count'   => 0,
        ];
    }
}