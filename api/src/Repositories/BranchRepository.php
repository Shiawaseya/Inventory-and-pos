<?php

namespace App\Repositories;

use App\Entities\Branch;
use Doctrine\ORM\EntityRepository;

/**
 * @extends EntityRepository<Branch>
 */
class BranchRepository extends EntityRepository
{
    /**
     * Find all branches sorted alphabetically by location.
     *
     * @return Branch[]
     */
    public function findAllOrdered(): array
    {
        return $this->createQueryBuilder('b')
            ->orderBy('b.location', 'ASC')
            ->getQuery()
            ->getResult();
    }

    /**
     * Find a branch by matching location keyword.
     */
    public function findOneByLocation(string $location): ?Branch
    {
        return $this->createQueryBuilder('b')
            ->where('b.location LIKE :loc')
            ->setParameter('loc', '%' . trim($location) . '%')
            ->setMaxResults(1)
            ->getQuery()
            ->getOneOrNullResult();
    }
}