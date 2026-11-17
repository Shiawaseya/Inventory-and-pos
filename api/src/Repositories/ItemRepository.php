<?php

namespace App\Repositories;

use App\Entities\Item;
use App\Repositories\Traits\SortableRepositoryTrait;
use Doctrine\ORM\EntityRepository;
use Doctrine\ORM\QueryBuilder;
use Doctrine\ORM\Tools\Pagination\Paginator; // <--- Import Paginator

/**
 * @extends EntityRepository<Item>
 */
class ItemRepository extends EntityRepository
{
    use SortableRepositoryTrait;

    private const SORT_MAP = [
        'id'          => 'i.id',
        'name'        => 'i.name',
        'brand'       => 'b.name',
        'category'    => 'c.name',
        'created_at'  => 'i.createdAt',
        'updated_at'  => 'i.updatedAt',
    ];

    private const DEFAULT_SORT = [
        'i.name' => 'ASC',
        'i.id'   => 'ASC',
    ];

    /**
     * @return Item[]
     */
    public function findAllWithRelations(int $page = 1, int $perPage = 12, array $filters = []): array
    {
        $qb = $this->createQueryBuilder('i')
            ->leftJoin('i.brand', 'b')
            ->leftJoin('i.category', 'c')
            ->leftJoin('i.variants', 'v')
            ->addSelect('b', 'c', 'v')
            ->setFirstResult(($page - 1) * $perPage)
            ->setMaxResults($perPage);

        $this->applyFilters($qb, $filters);
        $this->applySorting($qb, $filters, self::SORT_MAP, self::DEFAULT_SORT);

        // fetchJoinCollection = true instructs Doctrine to paginate distinct items, not joined rows
        $paginator = new Paginator($qb->getQuery(), $fetchJoinCollection = true);

        return iterator_to_array($paginator->getIterator());
    }

    public function countAll(array $filters = []): int
    {
        $qb = $this->createQueryBuilder('i')
            ->select('COUNT(DISTINCT i.id)')
            ->leftJoin('i.brand', 'b')
            ->leftJoin('i.category', 'c');

        $this->applyFilters($qb, $filters);

        return (int) $qb->getQuery()->getSingleScalarResult();
    }

    public function findByIdWithRelations(int $id): ?Item
    {
        return $this->createQueryBuilder('i')
            ->leftJoin('i.brand', 'b')
            ->leftJoin('i.category', 'c')
            ->leftJoin('i.variants', 'v')
            ->addSelect('b', 'c', 'v')
            ->where('i.id = :id')
            ->setParameter('id', $id)
            ->getQuery()
            ->getOneOrNullResult();
    }

    private function applyFilters(QueryBuilder $qb, array $filters): void
    {
        if (!empty($filters['search'])) {
            $search = '%' . trim((string)$filters['search']) . '%';
            $qb->andWhere('i.name LIKE :search OR b.name LIKE :search OR c.name LIKE :search')
               ->setParameter('search', $search);
        }

        if (!empty($filters['category_id'])) {
            $qb->andWhere('i.category = :categoryId')
               ->setParameter('categoryId', (int)$filters['category_id']);
        }

        if (!empty($filters['brand_id'])) {
            $qb->andWhere('i.brand = :brandId')
               ->setParameter('brandId', (int)$filters['brand_id']);
        }

        if (isset($filters['is_serialized']) && $filters['is_serialized'] !== '') {
            $qb->andWhere('i.isSerialized = :isSerialized')
               ->setParameter('isSerialized', filter_var($filters['is_serialized'], FILTER_VALIDATE_BOOLEAN));
        }
    }
}