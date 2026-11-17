<?php

namespace App\Repositories;

use App\Entities\Brand;
use App\Repositories\Traits\SortableRepositoryTrait;
use Doctrine\ORM\EntityRepository;
use Doctrine\ORM\QueryBuilder;

/**
 * @extends EntityRepository<Brand>
 */
class BrandRepository extends EntityRepository
{
    use SortableRepositoryTrait;

    private const SORT_MAP = [
        'name'       => 'b.name',
        'created_at' => 'b.createdAt',
        'id'         => 'b.id',
    ];

    private const DEFAULT_SORT = [
        'b.name' => 'ASC',
        'b.id'   => 'ASC',
    ];

    /**
     * @return Brand[]
     */
    public function findPaginated(
        int $page = 1, 
        int $perPage = 10, 
        array $filters = []
    ): array {
        $qb = $this->createQueryBuilder('b')
            ->leftJoin('b.recordedBy', 'e')
            ->addSelect('e')
            ->setFirstResult(($page - 1) * $perPage)
            ->setMaxResults($perPage);

        $this->applyFilters($qb, $filters);
        $this->applySorting($qb, $filters, self::SORT_MAP, self::DEFAULT_SORT);

        return $qb->getQuery()->getResult();
    }

    public function countPaginated(array $filters = []): int
    {
        $qb = $this->createQueryBuilder('b')
            ->select('COUNT(b.id)');

        $this->applyFilters($qb, $filters);

        return (int) $qb->getQuery()->getSingleScalarResult();
    }

    private function applyFilters(QueryBuilder $qb, array $filters): void
    {
        if (isset($filters['is_active']) && $filters['is_active'] !== '') {
            $qb->andWhere('b.isActive = :isActive')
               ->setParameter('isActive', filter_var($filters['is_active'], FILTER_VALIDATE_BOOLEAN));
        }

        if (!empty($filters['name'])) {
            $qb->andWhere('b.name LIKE :name')
               ->setParameter('name', '%' . $filters['name'] . '%');
        } elseif (!empty($filters['search'])) {
            $qb->andWhere('b.name LIKE :search')
               ->setParameter('search', '%' . $filters['search'] . '%');
        }

        if (!empty($filters['recorded_by'])) {
            $qb->andWhere('b.recordedBy = :recordedBy')
               ->setParameter('recordedBy', (int) $filters['recorded_by']);
        }
    }
}