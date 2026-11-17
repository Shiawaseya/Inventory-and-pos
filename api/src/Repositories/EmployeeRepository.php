<?php

namespace App\Repositories;

use App\Entities\Employee;
use Doctrine\ORM\EntityRepository;

/**
 * @extends EntityRepository<Employee>
 */
class EmployeeRepository extends EntityRepository
{
    /**
     * Find an active employee by username for authentication workflows.
     */
    public function findActiveByUsername(string $username): ?Employee
    {
        return $this->createQueryBuilder('e')
            ->innerJoin('e.branch', 'b')
            ->addSelect('b')
            ->where('e.username = :username')
            ->andWhere('e.isActive = :active')
            ->setParameter('username', trim($username))
            ->setParameter('active', true)
            ->getQuery()
            ->getOneOrNullResult();
    }

    /**
     * Get all active employees assigned to a specific branch.
     *
     * @return Employee[]
     */
    public function findActiveByBranch(int $branchId): array
    {
        return $this->createQueryBuilder('e')
            ->where('e.branch = :branchId')
            ->andWhere('e.isActive = :active')
            ->setParameter('branchId', $branchId)
            ->setParameter('active', true)
            ->orderBy('e.lastName', 'ASC')
            ->addOrderBy('e.firstName', 'ASC')
            ->getQuery()
            ->getResult();
    }

    /**
     * Check if a username is already taken by another employee.
     */
    public function isUsernameTaken(string $username, ?int $excludeEmployeeId = null): bool
    {
        $qb = $this->createQueryBuilder('e')
            ->select('COUNT(e.id)')
            ->where('e.username = :username')
            ->setParameter('username', trim($username));

        if ($excludeEmployeeId !== null) {
            $qb->andWhere('e.id != :excludeId')
               ->setParameter('excludeId', $excludeEmployeeId);
        }

        return (int) $qb->getQuery()->getSingleScalarResult() > 0;
    }
}