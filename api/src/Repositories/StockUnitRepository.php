<?php

namespace App\Repositories;

use App\Entities\StockUnit;
use App\Repositories\Traits\SortableRepositoryTrait;
use Doctrine\ORM\EntityRepository;
use Doctrine\ORM\QueryBuilder;

/**
 * @extends EntityRepository<StockUnit>
 */
class StockUnitRepository extends EntityRepository
{
    use SortableRepositoryTrait;

    private const SORT_MAP = [
        'id' => 'su.id',
        'serial_number' => 'su.serialNumber',
        'status' => 'su.status',
    ];

    private const DEFAULT_SORT = [
        'su.serialNumber' => 'ASC',
        'su.id' => 'ASC',
    ];

    /**
     * Find a stock unit by its serial number with variant & item details pre-loaded.
     */
    public function findOneBySerialNumber(string $serialNumber): ?StockUnit
    {
        return $this->createQueryBuilder('su')
            ->leftJoin('su.variant', 'v')
            ->leftJoin('v.item', 'it')
            ->leftJoin('su.branch', 'b')
            ->addSelect('v', 'it', 'b')
            ->where('su.serialNumber = :serialNumber')
            ->setParameter('serialNumber', $serialNumber)
            ->getQuery()
            ->getOneOrNullResult();
    }

    /**
     * @return StockUnit[]
     */
    public function findByVariantAndBranch(
        int $variantId,
        int $branchId,
        int $page = 1,
        int $perPage = 10,
        array $filters = []
    ): array {
        $qb = $this->createQueryBuilder('su')
            ->leftJoin('su.variant', 'v')
            ->leftJoin('su.branch', 'b')
            ->addSelect('v', 'b')
            ->where('su.variant = :variantId')
            ->andWhere('su.branch = :branchId')
            ->setParameter('variantId', $variantId)
            ->setParameter('branchId', $branchId)
            ->setFirstResult(($page - 1) * $perPage)
            ->setMaxResults($perPage);

        $this->applyFilters($qb, $filters);
        $this->applySorting($qb, $filters, self::SORT_MAP, self::DEFAULT_SORT);

        return $qb->getQuery()->getResult();
    }

    public function countByVariantAndBranch(int $variantId, int $branchId, array $filters = []): int
    {
        $qb = $this->createQueryBuilder('su')
            ->select('COUNT(su.id)')
            ->where('su.variant = :variantId')
            ->andWhere('su.branch = :branchId')
            ->setParameter('variantId', $variantId)
            ->setParameter('branchId', $branchId);

        $this->applyFilters($qb, $filters);

        return (int) $qb->getQuery()->getSingleScalarResult();
    }

    /**
     * @return StockUnit[]
     */
    public function findByStatusAndBranch(
        string $status,
        int $branchId,
        int $page = 1,
        int $perPage = 100
    ): array {
        return $this->createQueryBuilder('su')
            ->leftJoin('su.variant', 'v')
            ->leftJoin('v.item', 'it')
            ->leftJoin('su.branch', 'b')
            ->addSelect('v', 'it', 'b')
            ->where('su.status = :status')
            ->andWhere('su.branch = :branchId')
            ->setParameter('status', $status)
            ->setParameter('branchId', $branchId)
            ->orderBy('su.serialNumber', 'ASC')
            ->setFirstResult(($page - 1) * $perPage)
            ->setMaxResults($perPage)
            ->getQuery()
            ->getResult();
    }

    public function countByStatusAndBranch(string $status, int $branchId): int
    {
        return (int) $this->createQueryBuilder('su')
            ->select('COUNT(su.id)')
            ->where('su.status = :status')
            ->andWhere('su.branch = :branchId')
            ->setParameter('status', $status)
            ->setParameter('branchId', $branchId)
            ->getQuery()
            ->getSingleScalarResult();
    }

    private function applyFilters(QueryBuilder $qb, array $filters): void
    {
        if (!empty($filters['status'])) {
            $qb->andWhere('su.status = :status')
               ->setParameter('status', $filters['status']);
        }

        if (!empty($filters['search'])) {
            $qb->andWhere('su.serialNumber LIKE :search')
               ->setParameter('search', '%' . $filters['search'] . '%');
        }
    }
}