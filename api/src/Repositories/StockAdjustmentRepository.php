<?php

namespace App\Repositories;

use App\Entities\StockAdjustment;
use App\Repositories\Traits\SortableRepositoryTrait;
use DateTime;
use Doctrine\ORM\EntityRepository;
use Doctrine\ORM\QueryBuilder;

/**
 * @extends EntityRepository<StockAdjustment>
 */
class StockAdjustmentRepository extends EntityRepository
{
    use SortableRepositoryTrait;

    private const SORT_MAP = [
        'adjustment_number' => 'sa.adjustmentNumber',
        'reason'            => 'sa.reason',
        'created_at'        => 'sa.createdAt',
        'id'                => 'sa.id',
    ];

    private const DEFAULT_SORT = [
        'sa.createdAt' => 'DESC',
        'sa.id'        => 'DESC',
    ];

    /**
     * Fetch stock adjustments for a specific branch with adjustedBy and items pre-loaded.
     *
     * @param int $branchId
     * @param int $page
     * @param int $perPage
     * @param array $filters
     * @return StockAdjustment[]
     */
    public function findByBranch(
        int $branchId,
        int $page = 1,
        int $perPage = 10,
        array $filters = []
    ): array {
        $qb = $this->createQueryBuilder('sa')
            ->leftJoin('sa.adjustedBy', 'e')
            ->addSelect('e')
            ->where('sa.branch = :branchId')
            ->setParameter('branchId', $branchId)
            ->setFirstResult(($page - 1) * $perPage)
            ->setMaxResults($perPage);

        $this->applyFilters($qb, $filters);
        $this->applySorting($qb, $filters, self::SORT_MAP, self::DEFAULT_SORT);

        return $qb->getQuery()->getResult();
    }

    /**
     * Count total adjustments matching the branch and active filters.
     *
     * @param int $branchId
     * @param array $filters
     * @return int
     */
    public function countByBranch(int $branchId, array $filters = []): int
    {
        $qb = $this->createQueryBuilder('sa')
            ->select('COUNT(sa.id)')
            ->where('sa.branch = :branchId')
            ->setParameter('branchId', $branchId);

        $this->applyFilters($qb, $filters);

        return (int) $qb->getQuery()->getSingleScalarResult();
    }

    /**
     * Find a stock adjustment by its unique adjustment number with relations.
     */
    public function findOneByAdjustmentNumber(string $adjustmentNumber): ?StockAdjustment
    {
        return $this->createQueryBuilder('sa')
            ->leftJoin('sa.adjustedBy', 'e')
            ->leftJoin('sa.items', 'i')
            ->leftJoin('i.stockUnit', 'su')
            ->addSelect('e', 'i', 'su')
            ->where('sa.adjustmentNumber = :adjustmentNumber')
            ->setParameter('adjustmentNumber', $adjustmentNumber)
            ->getQuery()
            ->getOneOrNullResult();
    }

    private function applyFilters(QueryBuilder $qb, array $filters): void
    {
        if (!empty($filters['adjusted_by'])) {
            $qb->andWhere('sa.adjustedBy = :adjustedBy')
               ->setParameter('adjustedBy', $filters['adjusted_by']);
        }

        if (!empty($filters['reason'])) {
            $qb->andWhere('sa.reason = :reason')
               ->setParameter('reason', $filters['reason']);
        }

        if (!empty($filters['adjustment_number'])) {
            $qb->andWhere('sa.adjustmentNumber LIKE :adjustmentNumber')
               ->setParameter('adjustmentNumber', '%' . $filters['adjustment_number'] . '%');
        }

        if (!empty($filters['created_at'])) {
            $qb->andWhere('sa.createdAt >= :createdAt')
               ->setParameter('createdAt', new DateTime($filters['created_at']));
        }
    }
}