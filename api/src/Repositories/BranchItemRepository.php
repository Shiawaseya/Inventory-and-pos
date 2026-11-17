<?php

namespace App\Repositories;

use App\Entities\BranchItem;
use App\Repositories\Traits\SortableRepositoryTrait;
use Doctrine\ORM\EntityRepository;
use Doctrine\ORM\QueryBuilder;

/**
 * @extends EntityRepository<BranchItem>
 */
class BranchItemRepository extends EntityRepository
{
    use SortableRepositoryTrait;

    private const SORT_MAP = [
        'id'            => 'bi.id',
        'price'         => 'bi.price',
        'reorder_level' => 'bi.reorderLevel',
        'updated_at'    => 'bi.updatedAt',
        'name'          => 'i.name',
        'model'         => 'v.model',
    ];

    private const DEFAULT_SORT = [
        'bi.id' => 'ASC',
    ];

    /**
     * @return BranchItem[]
     */
    public function findByBranch(
        int $branchId,
        int $page = 1,
        int $perPage = 10,
        array $filters = []
    ): array {
        $qb = $this->createQueryBuilder('bi')
            ->leftJoin('bi.variant', 'v')
            ->leftJoin('v.item', 'i')
            ->leftJoin('bi.branch', 'b')
            ->leftJoin('bi.updatedBy', 'e')
            ->addSelect('v', 'i', 'b', 'e')
            ->where('bi.branch = :branchId')
            ->setParameter('branchId', $branchId)
            ->setFirstResult(($page - 1) * $perPage)
            ->setMaxResults($perPage);

        $this->applyFilters($qb, $filters);
        $this->applySorting($qb, $filters, self::SORT_MAP, self::DEFAULT_SORT);

        return $qb->getQuery()->getResult();
    }

    public function countByBranch(int $branchId, array $filters = []): int
    {
        $qb = $this->createQueryBuilder('bi')
            ->select('COUNT(bi.id)')
            ->leftJoin('bi.variant', 'v')
            ->leftJoin('v.item', 'i')
            ->where('bi.branch = :branchId')
            ->setParameter('branchId', $branchId);

        $this->applyFilters($qb, $filters);

        return (int) $qb->getQuery()->getSingleScalarResult();
    }

    public function findOneByVariantAndBranch(int $variantId, int $branchId): ?BranchItem
    {
        return $this->createQueryBuilder('bi')
            ->leftJoin('bi.variant', 'v')
            ->leftJoin('v.item', 'i')
            ->leftJoin('bi.branch', 'b')
            ->leftJoin('bi.updatedBy', 'e')
            ->addSelect('v', 'i', 'b', 'e')
            ->where('bi.variant = :variantId AND bi.branch = :branchId')
            ->setParameter('variantId', $variantId)
            ->setParameter('branchId', $branchId)
            ->getQuery()
            ->getOneOrNullResult();
    }

    /**
     * @param int[] $itemIds
     * @return BranchItem[]
     */
    public function findByItemIdsAndBranch(array $itemIds, int $branchId): array
    {
        if ($itemIds === []) {
            return [];
        }

        return $this->createQueryBuilder('bi')
            ->leftJoin('bi.variant', 'v')
            ->leftJoin('v.item', 'i')
            ->leftJoin('bi.branch', 'b')
            ->addSelect('v', 'i', 'b')
            ->where('i.id IN (:itemIds)')
            ->andWhere('bi.branch = :branchId')
            ->setParameter('itemIds', array_values(array_unique(array_map('intval', $itemIds))))
            ->setParameter('branchId', $branchId)
            ->getQuery()
            ->getResult();
    }

    private function applyFilters(QueryBuilder $qb, array $filters): void
    {
        if (isset($filters['is_serialized']) && $filters['is_serialized'] !== '') {
            $qb->andWhere('i.isSerialized = :isSerialized')
               ->setParameter('isSerialized', filter_var($filters['is_serialized'], FILTER_VALIDATE_BOOLEAN));
        }

        if (!empty($filters['search'])) {
            $qb->andWhere('i.name LIKE :search OR v.model LIKE :search OR v.sku LIKE :search')
               ->setParameter('search', '%' . $filters['search'] . '%');
        }

        if (!empty($filters['category_id'])) {
            $qb->andWhere('i.category = :categoryId')
               ->setParameter('categoryId', (int) $filters['category_id']);
        }

        if (!empty($filters['brand_id'])) {
            $qb->andWhere('i.brand = :brandId')
               ->setParameter('brandId', (int) $filters['brand_id']);
        }
    }
}