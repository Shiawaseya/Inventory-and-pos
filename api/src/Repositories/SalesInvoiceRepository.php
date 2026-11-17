<?php

namespace App\Repositories;

use App\Entities\SalesInvoice;
use App\Repositories\Traits\SortableRepositoryTrait;
use Doctrine\ORM\EntityRepository;
use Doctrine\ORM\QueryBuilder;

/**
 * @extends EntityRepository<SalesInvoice>
 */
class SalesInvoiceRepository extends EntityRepository
{
    use SortableRepositoryTrait;

    private const SORT_MAP = [
        'total_amount'     => 'si.totalAmount',
        'date_of_purchase' => 'si.dateOfPurchase',
        'created_at'       => 'si.createdAt',
        'status'           => 'si.status',
        'id'               => 'si.id',
        'remitted_at'      => 'st.remittedAt',
        'approved_date'    => 'fin.approvedDate',
    ];

    private const DEFAULT_SORT = [
        'si.dateOfPurchase' => 'DESC',
        'si.id'             => 'DESC',
    ];

    /**
     * Fetch invoices for a specific branch with customer, employee, settlement, financing, and sale detail units eager-loaded.
     *
     * @return SalesInvoice[]
     */
    public function findByBranch(
        int $branchId, 
        int $page = 1, 
        int $perPage = 10,
        array $filters = []
    ): array {
        $qb = $this->createQueryBuilder('si')
            ->leftJoin('si.customer', 'c')
            ->leftJoin('si.employee', 'e')
            ->leftJoin('si.authorizedBy', 'a')
            ->leftJoin('si.settlement', 'st')
            ->leftJoin('st.receivedBy', 'str')
            ->leftJoin('si.financing', 'fin')
            ->leftJoin('fin.recordedBy', 'finr')
            ->leftJoin('si.details', 'sd')
            ->leftJoin('sd.stockUnit', 'su')
            ->leftJoin('su.variant', 'v_stock')
            ->leftJoin('v_stock.item', 'i_stock')
            ->leftJoin('sd.inventory', 'inv')
            ->leftJoin('inv.variant', 'v_inv')
            ->leftJoin('v_inv.item', 'i_inv')
            ->addSelect('c', 'e', 'a', 'st', 'str', 'fin', 'finr', 'sd', 'su', 'v_stock', 'i_stock', 'inv', 'v_inv', 'i_inv')
            ->where('si.branch = :branchId')
            ->setParameter('branchId', $branchId)
            ->setFirstResult(($page - 1) * $perPage)
            ->setMaxResults($perPage);

        $this->applyFilters($qb, $filters);
        $this->applySorting($qb, $filters, self::SORT_MAP, self::DEFAULT_SORT);

        return $qb->getQuery()->getResult();
    }

    public function countByBranch(int $branchId, array $filters = []): int
    {
        $qb = $this->createQueryBuilder('si')
            ->leftJoin('si.customer', 'c')
            ->leftJoin('si.settlement', 'st')
            ->leftJoin('si.financing', 'fin')
            ->select('COUNT(si.id)')
            ->where('si.branch = :branchId')
            ->setParameter('branchId', $branchId);

        $this->applyFilters($qb, $filters);

        return (int) $qb->getQuery()->getSingleScalarResult();
    }

    private function applyFilters(QueryBuilder $qb, array $filters): void
    {
        // 1. Partial or exact Invoice Number Search
        if (!empty($filters['sales_invoice_number'])) {
            $invSearch = '%' . strtolower(trim((string) $filters['sales_invoice_number'])) . '%';
            $qb->andWhere('LOWER(si.invoiceNumber) LIKE :invoiceNumber')
               ->setParameter('invoiceNumber', $invSearch);
        }

        // 2. General Multi-field Search (includes driver name & Home Credit loan account number)
        if (!empty($filters['search'])) {
            $search = '%' . strtolower(trim((string) $filters['search'])) . '%';
            $qb->andWhere(
                $qb->expr()->orX(
                    'LOWER(si.invoiceNumber) LIKE :generalSearch',
                    'LOWER(c.firstName) LIKE :generalSearch',
                    'LOWER(c.middleName) LIKE :generalSearch',
                    'LOWER(c.lastName) LIKE :generalSearch',
                    'LOWER(c.contactNumber) LIKE :generalSearch',
                    'LOWER(c.emailAddress) LIKE :generalSearch',
                    'LOWER(st.driverName) LIKE :generalSearch',
                    'LOWER(fin.loanAccountNumber) LIKE :generalSearch'
                )
            )->setParameter('generalSearch', $search);
        }

        // 3. Customer ID
        if (!empty($filters['customer_id'])) {
            $qb->andWhere('c.id = :customerId')
               ->setParameter('customerId', (int) $filters['customer_id']);
        }

        // 4. Customer Specific Search
        if (!empty($filters['customer_search'])) {
            $search = '%' . strtolower(trim((string) $filters['customer_search'])) . '%';
            $qb->andWhere(
                $qb->expr()->orX(
                    'LOWER(c.firstName) LIKE :customerSearch',
                    'LOWER(c.middleName) LIKE :customerSearch',
                    'LOWER(c.lastName) LIKE :customerSearch',
                    'LOWER(c.contactNumber) LIKE :customerSearch',
                    'LOWER(c.emailAddress) LIKE :customerSearch'
                )
            )->setParameter('customerSearch', $search);
        }

        // 5. Staff / Creator
        if (!empty($filters['created_by'])) {
            $qb->andWhere('si.employee = :createdBy')
               ->setParameter('createdBy', (int) $filters['created_by']);
        }

        // 6. Created Date
        if (!empty($filters['created_at'])) {
            $qb->andWhere('si.createdAt >= :createdAt')
               ->setParameter('createdAt', new \DateTime($filters['created_at']));
        }

        // 7. Statuses
        if (!empty($filters['statuses']) && is_array($filters['statuses'])) {
            $qb->andWhere('si.status IN (:statuses)')
               ->setParameter('statuses', $filters['statuses']);
        } elseif (!empty($filters['status'])) {
            $qb->andWhere('si.status = :status')
               ->setParameter('status', $filters['status']);
        }

        // 8. Purchase Date
        if (!empty($filters['date_of_purchase'])) {
            $qb->andWhere('si.dateOfPurchase = :dateOfPurchase')
               ->setParameter('dateOfPurchase', new \DateTime($filters['date_of_purchase']));
        }

        // 9. Settlement Filters
        if (isset($filters['is_settled'])) {
            if ((bool) $filters['is_settled']) {
                $qb->andWhere('st.id IS NOT NULL');
            } else {
                $qb->andWhere('st.id IS NULL');
            }
        }

        if (isset($filters['conforme_received'])) {
            $qb->andWhere('st.conformeReceived = :conforme')
               ->setParameter('conforme', (bool) $filters['conforme_received']);
        }

        // 10. Financing Filters
        if (isset($filters['is_financed'])) {
            if ((bool) $filters['is_financed']) {
                $qb->andWhere('fin.id IS NOT NULL');
            } else {
                $qb->andWhere('fin.id IS NULL');
            }
        }

        if (!empty($filters['financing_status'])) {
            $qb->andWhere('fin.status = :financingStatus')
               ->setParameter('financingStatus', $filters['financing_status']);
        }

        if (!empty($filters['provider'])) {
            $qb->andWhere('fin.provider = :provider')
               ->setParameter('provider', $filters['provider']);
        }
    }
}