<?php

namespace App\Repositories;

use App\Entities\ItemVariant;
use App\Repositories\Traits\SortableRepositoryTrait;
use Doctrine\ORM\EntityRepository;
use Doctrine\ORM\QueryBuilder;

/**
 * @extends EntityRepository<ItemVariant>
 */
class ItemVariantRepository extends EntityRepository
{
    use SortableRepositoryTrait;

    private const SORT_MAP = [
        'id' => 'v.id',
        'model' => 'v.model',
        'sku' => 'v.sku',
        'is_active' => 'v.isActive',
    ];

    private const DEFAULT_SORT = [
        'v.id' => 'ASC',
    ];

    /**
     * @return ItemVariant[]
     */
    public function findByItem(int $itemId, int $page = 1, int $perPage = 10, array $filters = []): array
    {
        $queryBuilder = $this->createQueryBuilder('v')
            ->leftJoin('v.item', 'i')
            ->addSelect('i')
            ->where('v.item = :itemId')
            ->setParameter('itemId', $itemId)
            ->setFirstResult(($page - 1) * $perPage)
            ->setMaxResults($perPage);

        $this->applyFilters($queryBuilder, $filters);
        $this->applySorting($queryBuilder, $filters, self::SORT_MAP, self::DEFAULT_SORT);

        return $queryBuilder->getQuery()->getResult();
    }

    public function countByItem(int $itemId, array $filters = []): int
    {
        $queryBuilder = $this->createQueryBuilder('v')
            ->select('COUNT(v.id)')
            ->where('v.item = :itemId')
            ->setParameter('itemId', $itemId);

        $this->applyFilters($queryBuilder, $filters);

        return (int) $queryBuilder->getQuery()->getSingleScalarResult();
    }

    public function findOneBySku(string $sku): ?ItemVariant
    {
        return $this->findOneBy(['sku' => $sku]);
    }

    private function applyFilters(QueryBuilder $queryBuilder, array $filters): void
    {
        if (!empty($filters['search'])) {
            $queryBuilder
                ->andWhere('v.model LIKE :search OR v.sku LIKE :search')
                ->setParameter('search', '%' . $filters['search'] . '%');
        }

        if (!empty($filters['model'])) {
            $queryBuilder
                ->andWhere('v.model LIKE :model')
                ->setParameter('model', '%' . $filters['model'] . '%');
        }

        if (!empty($filters['sku'])) {
            $queryBuilder
                ->andWhere('v.sku LIKE :sku')
                ->setParameter('sku', '%' . $filters['sku'] . '%');
        }

        if (isset($filters['is_active']) && $filters['is_active'] !== '') {
            $queryBuilder
                ->andWhere('v.isActive = :isActive')
                ->setParameter('isActive', filter_var($filters['is_active'], FILTER_VALIDATE_BOOLEAN));
        }
    }
}