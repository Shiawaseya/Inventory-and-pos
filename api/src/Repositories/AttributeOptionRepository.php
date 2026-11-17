<?php

namespace App\Repositories;

use App\Entities\AttributeOption;
use Doctrine\ORM\EntityRepository;

/** @extends EntityRepository<AttributeOption> */
class AttributeOptionRepository extends EntityRepository
{
    /** @return AttributeOption[] */
    public function findByAttribute(int $attributeId): array
    {
        return $this->findBy(['attributeId' => $attributeId], ['value' => 'ASC']);
    }
}