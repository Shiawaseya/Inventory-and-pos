<?php

namespace App\Repositories;

use App\Entities\SalesSettlement;
use App\Repositories\Traits\SortableRepositoryTrait;
use Doctrine\ORM\EntityRepository;

/**
 * @extends EntityRepository<SalesSettlement>
 */
class SalesSettlementRepository extends EntityRepository
{
    use SortableRepositoryTrait;

    public function findByInvoiceId(int $invoiceId): ?SalesSettlement
    {
        return $this->createQueryBuilder('st')
            ->leftJoin('st.salesInvoice', 'si')
            ->leftJoin('st.receivedBy', 'e')
            ->addSelect('si', 'e')
            ->where('si.id = :invoiceId')
            ->setParameter('invoiceId', $invoiceId)
            ->getQuery()
            ->getOneOrNullResult();
    }
}