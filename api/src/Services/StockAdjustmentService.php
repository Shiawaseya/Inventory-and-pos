<?php

namespace App\Services;

use App\Database\DatabaseManager;
use App\Entities\Branch;
use App\Entities\Employee;
use App\Entities\StockAdjustment;
use App\Entities\StockAdjustmentItem;
use App\Entities\StockUnit;
use App\Enums\StockAdjustmentReason;
use App\Enums\StockUnitStatus;
use App\Repositories\StockAdjustmentRepository;
use Doctrine\ORM\EntityManager;
use Exception;
use InvalidArgumentException;

class StockAdjustmentService
{
    private EntityManager $entityManager;
    private StockAdjustmentRepository $repository;

    public function __construct(?EntityManager $entityManager = null)
    {
        $this->entityManager = $entityManager ?? DatabaseManager::getEntityManager();
        $this->repository = $this->entityManager->getRepository(StockAdjustment::class);
    }

    public function getByBranch(int $branchId, int $page, int $perPage, array $filters = []): array
    {
        return $this->repository->findByBranch($branchId, $page, $perPage, $filters);
    }

    public function countByBranch(int $branchId, array $filters = []): int
    {
        return $this->repository->countByBranch($branchId, $filters);
    }

    /**
     * Atomically executes a stock unit adjustment.
     *
     * @param array $payload Expected keys: branch_id, employee_id, reason, notes, items: [['stock_unit_id' => int, 'new_status' => string, 'notes' => ?string]]
     * @return StockAdjustment
     * @throws Exception
     */
    public function createAdjustment(array $payload): StockAdjustment
    {
        $branchId = (int) ($payload['branch_id'] ?? 0);
        $employeeId = (int) ($payload['employee_id'] ?? 0);
        $reasonRaw = (string) ($payload['reason'] ?? '');
        $itemsData = (array) ($payload['items'] ?? []);

        if ($branchId <= 0) {
            throw new InvalidArgumentException('Branch ID is required.');
        }

        if (empty($itemsData)) {
            throw new InvalidArgumentException('At least one stock unit must be selected for adjustment.');
        }

        $reason = StockAdjustmentReason::tryFrom($reasonRaw);
        if ($reason === null) {
            throw new InvalidArgumentException("Invalid adjustment reason: {$reasonRaw}");
        }

        $branch = $this->entityManager->find(Branch::class, $branchId);
        if (!$branch) {
            throw new InvalidArgumentException("Branch with ID {$branchId} not found.");
        }

        $employee = null;
        if ($employeeId > 0) {
            $employee = $this->entityManager->find(Employee::class, $employeeId);
        }

        // Generate unique adjustment number
        $adjustmentNumber = 'ADJ-' . date('Ymd') . '-' . strtoupper(bin2hex(random_bytes(3)));

        // Wrap execution in a database transaction
        return $this->entityManager->wrapInTransaction(function () use ($branch, $adjustmentNumber, $reason, $payload, $employee, $itemsData, $branchId) {
            $adjustment = new StockAdjustment($branch, $adjustmentNumber, $reason);
            $adjustment->setNotes($payload['notes'] ?? null);
            $adjustment->setAdjustedBy($employee);

            $this->entityManager->persist($adjustment);
            $changes = [];

            foreach ($itemsData as $itemRow) {
                $stockUnitId = (int) ($itemRow['stock_unit_id'] ?? 0);
                $newStatusRaw = (string) ($itemRow['new_status'] ?? '');
                $itemNotes = $itemRow['notes'] ?? null;

                $newStatus = StockUnitStatus::tryFrom($newStatusRaw);
                if ($newStatus === null) {
                    throw new InvalidArgumentException("Invalid target status '{$newStatusRaw}' for stock unit #{$stockUnitId}.");
                }

                /** @var StockUnit|null $stockUnit */
                $stockUnit = $this->entityManager->find(StockUnit::class, $stockUnitId);
                if (!$stockUnit) {
                    throw new InvalidArgumentException("Stock unit #{$stockUnitId} not found.");
                }

                // Verify stock unit belongs to the branch
                if ($stockUnit->getBranch() && $stockUnit->getBranch()->getId() !== $branchId) {
                    throw new InvalidArgumentException("Stock unit #{$stockUnitId} does not belong to branch #{$branchId}.");
                }

                $previousStatus = $stockUnit->getStatus();

                // Create adjustment line item
                $adjustmentItem = new StockAdjustmentItem(
                    $adjustment,
                    $stockUnit,
                    $previousStatus,
                    $newStatus,
                    $itemNotes
                );

                $adjustment->addItem($adjustmentItem);
                $this->entityManager->persist($adjustmentItem);

                // Update physical stock unit status
                $stockUnit->setStatus($newStatus);
                $changes[] = [
                    'stock_unit_id' => $stockUnitId,
                    'previous_status' => $previousStatus->value,
                    'new_status' => $newStatus->value,
                    'notes' => $itemNotes,
                ];
            }

            // Flush first so the generated adjustment ID is available to the audit record.
            $this->entityManager->flush();

            (new AuditLogService($this->entityManager))->record([
                'action' => 'STOCK_ADJUSTMENT',
                'module' => 'stock_adjustments',
                'employee_id' => $employee?->getId(),
                'branch_id' => $branchId,
                'record_id' => $adjustment->getId(),
                'old_values' => [
                    'items' => array_map(static fn(array $change) => [
                        'stock_unit_id' => $change['stock_unit_id'],
                        'status' => $change['previous_status'],
                    ], $changes),
                ],
                'new_values' => [
                    'adjustment_number' => $adjustmentNumber,
                    'reason' => $reason->value,
                    'notes' => $payload['notes'] ?? null,
                    'items' => array_map(static fn(array $change) => [
                        'stock_unit_id' => $change['stock_unit_id'],
                        'status' => $change['new_status'],
                        'notes' => $change['notes'],
                    ], $changes),
                ],
                'ip_address' => $payload['_audit']['ip_address'] ?? null,
                'user_agent' => $payload['_audit']['user_agent'] ?? null,
            ]);

            return $adjustment;
        });
    }
}