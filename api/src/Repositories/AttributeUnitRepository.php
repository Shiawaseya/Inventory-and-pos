<?php

namespace App\Repositories;

use App\Entities\AttributeUnit;
use Doctrine\ORM\EntityRepository;

/** @extends EntityRepository<AttributeUnit> */
class AttributeUnitRepository extends EntityRepository
{
    /** @return AttributeUnit[] */
    public function findAllOrdered(): array
    {
        return $this->createQueryBuilder('u')->orderBy('u.name', 'ASC')->getQuery()->getResult();
    }
}