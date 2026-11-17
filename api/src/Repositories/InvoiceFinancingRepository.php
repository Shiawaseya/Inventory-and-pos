<?php

namespace App\Repositories;

use App\Entities\InvoiceFinancing;
use App\Repositories\Traits\SortableRepositoryTrait;
use Doctrine\ORM\EntityRepository;

/**
 * @extends EntityRepository<InvoiceFinancing>
 */
class InvoiceFinancingRepository extends EntityRepository
{
    use SortableRepositoryTrait;

    public function findByInvoiceId(int $invoiceId): ?InvoiceFinancing
    {
        return $this->createQueryBuilder('fin')
            ->leftJoin('fin.salesInvoice', 'si')
            ->leftJoin('fin.recordedBy', 'e')
            ->addSelect('si', 'e')
            ->where('si.id = :invoiceId')
            ->setParameter('invoiceId', $invoiceId)
            ->getQuery()
            ->getOneOrNullResult();
    }

    public function findByProviderAndLoanAccount(string $provider, string $loanAccountNumber): ?InvoiceFinancing
    {
        return $this->createQueryBuilder('fin')
            ->leftJoin('fin.salesInvoice', 'si')
            ->leftJoin('si.customer', 'c')
            ->addSelect('si', 'c')
            ->where('fin.provider = :provider')
            ->andWhere('fin.loanAccountNumber = :loanAccountNumber')
            ->setParameter('provider', $provider)
            ->setParameter('loanAccountNumber', trim($loanAccountNumber))
            ->getQuery()
            ->getOneOrNullResult();
    }
}