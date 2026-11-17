<?php

namespace App\Repositories;

use App\Entities\Inventory;
use Doctrine\ORM\EntityRepository;

/**
 * @extends EntityRepository<Inventory>
 */
class InventoryRepository extends EntityRepository
{
    public function findByVariantAndBranch(int $variantId, int $branchId): ?Inventory
    {
        return $this->createQueryBuilder('i')
            ->where('i.variant = :variantId AND i.branch = :branchId')
            ->setParameter('variantId', $variantId)
            ->setParameter('branchId', $branchId)
            ->getQuery()
            ->getOneOrNullResult();
    }
}