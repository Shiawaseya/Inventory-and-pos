<?php

namespace App\Repositories;

use App\Entities\AuditLog;
use Doctrine\ORM\EntityRepository;
use Doctrine\ORM\QueryBuilder;

/** @extends EntityRepository<AuditLog> */
class AuditLogRepository extends EntityRepository
{
    /** @return AuditLog[] */
    public function findPaginated(int $page = 1, int $perPage = 25, array $filters = []): array
    {
        $qb = $this->createQueryBuilder('a')
            ->leftJoin('a.employee', 'e')->addSelect('e')
            ->leftJoin('a.branch', 'b')->addSelect('b')
            ->setFirstResult(max(0, ($page - 1) * $perPage))
            ->setMaxResults($perPage)
            ->orderBy('a.createdAt', 'DESC')
            ->addOrderBy('a.id', 'DESC');

        $this->applyFilters($qb, $filters);
        return $qb->getQuery()->getResult();
    }

    public function countPaginated(array $filters = []): int
    {
        $qb = $this->createQueryBuilder('a')->select('COUNT(a.id)');
        $this->applyFilters($qb, $filters);
        return (int) $qb->getQuery()->getSingleScalarResult();
    }

    private function applyFilters(QueryBuilder $qb, array $filters): void
    {
        foreach (['action' => 'action', 'module' => 'module', 'record_id' => 'recordId'] as $filter => $field) {
            if (($filters[$filter] ?? '') !== '') {
                $qb->andWhere("a.$field = :$filter")->setParameter($filter, $filters[$filter]);
            }
        }

        foreach (['employee_id' => 'employee', 'branch_id' => 'branch'] as $key => $association) {
            if (!empty($filters[$key])) {
                $qb->andWhere("a.$association = :$key")->setParameter($key, (int) $filters[$key]);
            }
        }
    }
}