<?php

namespace App\Repositories;

use App\Entities\StockAdjustmentItem;
use App\Repositories\Traits\SortableRepositoryTrait;
use Doctrine\ORM\EntityRepository;
use Doctrine\ORM\QueryBuilder;

/**
 * @extends EntityRepository<StockAdjustmentItem>
 */
class StockAdjustmentItemRepository extends EntityRepository
{
    use SortableRepositoryTrait;

    private const SORT_MAP = [
        'previous_status' => 'sai.previousStatus',
        'new_status'      => 'sai.newStatus',
        'created_at'      => 'sai.createdAt',
        'id'              => 'sai.id',
    ];

    private const DEFAULT_SORT = [
        'sai.id' => 'ASC',
    ];

    /**
     * Fetch line items belonging to a specific stock adjustment.
     * Pre-loads the referenced stock unit and variant.
     *
     * @param int $adjustmentId
     * @return StockAdjustmentItem[]
     */
    public function findByAdjustmentId(int $adjustmentId): array
    {
        return $this->createQueryBuilder('sai')
            ->leftJoin('sai.stockUnit', 'su')
            ->leftJoin('su.variant', 'v')
            ->leftJoin('v.item', 'it')
            ->addSelect('su', 'v', 'it')
            ->where('sai.stockAdjustment = :adjustmentId')
            ->setParameter('adjustmentId', $adjustmentId)
            ->orderBy('sai.id', 'ASC')
            ->getQuery()
            ->getResult();
    }

    /**
     * Get the adjustment history for a specific individual unit.
     *
     * @param int $stockUnitId
     * @return StockAdjustmentItem[]
     */
    public function findHistoryByStockUnit(int $stockUnitId): array
    {
        return $this->createQueryBuilder('sai')
            ->leftJoin('sai.stockAdjustment', 'sa')
            ->leftJoin('sa.adjustedBy', 'e')
            ->addSelect('sa', 'e')
            ->where('sai.stockUnit = :stockUnitId')
            ->setParameter('stockUnitId', $stockUnitId)
            ->orderBy('sai.createdAt', 'DESC')
            ->getQuery()
            ->getResult();
    }
}