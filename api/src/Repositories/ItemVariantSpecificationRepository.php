<?php

namespace App\Repositories;

use App\Entities\ItemVariantSpecification;
use Doctrine\ORM\EntityRepository;

/** @extends EntityRepository<ItemVariantSpecification> */
class ItemVariantSpecificationRepository extends EntityRepository
{
    /** @return ItemVariantSpecification[] */
    public function findByVariant(int $variantId): array
    {
        return $this->findBy(['variantId' => $variantId], ['attributeId' => 'ASC']);
    }

    public function findOneByVariantAndAttribute(int $variantId, int $attributeId): ?ItemVariantSpecification
    {
        return $this->findOneBy(['variantId' => $variantId, 'attributeId' => $attributeId]);
    }
}