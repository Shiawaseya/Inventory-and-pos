<?php

namespace App\Repositories;

use App\Entities\Category;
use App\Repositories\Traits\SortableRepositoryTrait;
use DateTime;
use Doctrine\ORM\EntityRepository;
use Doctrine\ORM\QueryBuilder;

/**
 * @extends EntityRepository<Category>
 */
class CategoryRepository extends EntityRepository
{
    use SortableRepositoryTrait;

    private const SORT_MAP = [
        'name'       => 'c.name',
        'created_at' => 'c.createdAt',
        'id'         => 'c.id',
    ];

    private const DEFAULT_SORT = [
        'c.name' => 'ASC',
        'c.id'   => 'ASC',
    ];

    /**
     * @return Category[]
     */
    public function findPaginated(
        int $page = 1,
        int $perPage = 10,
        array $filters = []
    ): array {
        $qb = $this->createQueryBuilder('c')
            ->leftJoin('c.recordedBy', 'e')
            ->addSelect('e')
            ->setFirstResult(($page - 1) * $perPage)
            ->setMaxResults($perPage);

        $this->applyFilters($qb, $filters);
        $this->applySorting($qb, $filters, self::SORT_MAP, self::DEFAULT_SORT);

        return $qb->getQuery()->getResult();
    }

    public function countPaginated(array $filters = []): int
    {
        $qb = $this->createQueryBuilder('c')
            ->select('COUNT(c.id)');

        $this->applyFilters($qb, $filters);

        return (int) $qb->getQuery()->getSingleScalarResult();
    }

    private function applyFilters(QueryBuilder $qb, array $filters): void
    {
        if (!empty($filters['name'])) {
            $qb->andWhere('c.name LIKE :name')
               ->setParameter('name', '%' . $filters['name'] . '%');
        } elseif (!empty($filters['search'])) {
            $qb->andWhere('c.name LIKE :search')
               ->setParameter('search', '%' . $filters['search'] . '%');
        }

        if (!empty($filters['recorded_by'])) {
            $qb->andWhere('c.recordedBy = :recordedBy')
               ->setParameter('recordedBy', (int) $filters['recorded_by']);
        }

        if (!empty($filters['created_at'])) {
            $qb->andWhere('c.createdAt >= :createdAt')
               ->setParameter('createdAt', new DateTime($filters['created_at']));
        }
    }
}