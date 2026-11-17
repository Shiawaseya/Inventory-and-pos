<?php

namespace App\Repositories;

use App\Entities\ItemAttribute;
use Doctrine\ORM\EntityRepository;

/** @extends EntityRepository<ItemAttribute> */
class ItemAttributeRepository extends EntityRepository
{
    /** @return ItemAttribute[] */
    public function findAllOrdered(): array
    {
        return $this->findBy([], ['name' => 'ASC']);
    }
}