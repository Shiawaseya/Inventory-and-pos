<?php

namespace App\Repositories;

use App\Entities\Customer;
use App\Repositories\Traits\SortableRepositoryTrait;
use Doctrine\ORM\EntityRepository;
use Doctrine\ORM\QueryBuilder;

/**
 * @extends EntityRepository<Customer>
 */
class CustomerRepository extends EntityRepository
{
    use SortableRepositoryTrait;

    private const SORT_MAP = [
        'id' => 'c.id',
        'first_name' => 'c.firstName',
        'last_name' => 'c.lastName',
        'contact_number' => 'c.contactNumber',
        'email_address' => 'c.emailAddress',
        'street_address' => 'a.streetAddress',
        'barangay' => 'a.barangay',
        'city_municipality' => 'a.cityMunicipality',
        'province' => 'a.province',
        'region' => 'a.region',
        'postal_code' => 'a.postalCode',
        'created_at' => 'c.createdAt',
    ];

    private const DEFAULT_SORT = [
        'c.lastName' => 'ASC',
        'c.firstName' => 'ASC',
        'c.id' => 'ASC',
    ];

    /**
     * @return Customer[]
     */
    public function findPaginated(int $page = 1, int $perPage = 10, array $filters = []): array
    {
        $qb = $this->createQueryBuilder('c')
            ->leftJoin('c.address', 'a')
            ->addSelect('a')
            ->setFirstResult(($page - 1) * $perPage)
            ->setMaxResults($perPage);

        $this->applyFilters($qb, $filters);
        $this->applySorting($qb, $filters, self::SORT_MAP, self::DEFAULT_SORT);

        return $qb->getQuery()->getResult();
    }

    public function countPaginated(array $filters = []): int
    {
        $qb = $this->createQueryBuilder('c')
            ->leftJoin('c.address', 'a')
            ->select('COUNT(DISTINCT c.id)');

        $this->applyFilters($qb, $filters);

        return (int) $qb->getQuery()->getSingleScalarResult();
    }

    private function applyFilters(QueryBuilder $qb, array $filters): void
    {
        if (!empty($filters['search'])) {
            $qb->andWhere(
                $qb->expr()->orX(
                    'LOWER(c.firstName) LIKE LOWER(:search)',
                    'LOWER(c.middleName) LIKE LOWER(:search)',
                    'LOWER(c.lastName) LIKE LOWER(:search)',
                    'LOWER(c.contactNumber) LIKE LOWER(:search)',
                    'LOWER(c.emailAddress) LIKE LOWER(:search)',
                    'LOWER(a.cityMunicipality) LIKE LOWER(:search)',
                    'LOWER(a.province) LIKE LOWER(:search)'
                )
            )->setParameter('search', '%' . trim((string) $filters['search']) . '%');
        }

        $fieldFilters = [
            'first_name' => 'c.firstName',
            'middle_name' => 'c.middleName',
            'last_name' => 'c.lastName',
            'contact_number' => 'c.contactNumber',
            'email_address' => 'c.emailAddress',
            'street_address' => 'a.streetAddress',
            'barangay' => 'a.barangay',
            'city_municipality' => 'a.cityMunicipality',
            'province' => 'a.province',
            'region' => 'a.region',
            'postal_code' => 'a.postalCode',
            'psgc_code' => 'a.psgcCode',
            'tin' => 'c.tin',
            'business_style' => 'c.businessStyle',
        ];

        foreach ($fieldFilters as $filter => $field) {
            if (isset($filters[$filter]) && $filters[$filter] !== '') {
                $parameter = 'filter_' . $filter;
                $qb->andWhere(sprintf('LOWER(%s) LIKE LOWER(:%s)', $field, $parameter))
                    ->setParameter($parameter, '%' . trim((string) $filters[$filter]) . '%');
            }
        }

        if (!empty($filters['branch_id'])) {
            $qb->andWhere(
                'c.id IN (
                    SELECT IDENTITY(si.customer)
                    FROM App\Entities\SalesInvoice si
                    WHERE si.branch = :branchId
                )'
            );
            $qb->setParameter('branchId', (int) $filters['branch_id']);
        }
    }

    /**
     * Search customers across first name, last name, and contact number.
     *
     * @return Customer[]
     */
    public function search(string $term, int $limit = 20, int $offset = 0): array
    {
        return $this->createQueryBuilder('c')
            ->leftJoin('c.address', 'a')
            ->where('c.firstName LIKE :term')
            ->orWhere('c.lastName LIKE :term')
            ->orWhere('c.contactNumber LIKE :term')
            ->orWhere('a.cityMunicipality LIKE :term')
            ->orWhere('a.province LIKE :term')
            ->setParameter('term', '%' . trim($term) . '%')
            ->orderBy('c.lastName', 'ASC')
            ->addOrderBy('c.firstName', 'ASC')
            ->setMaxResults($limit)
            ->setFirstResult($offset)
            ->getQuery()
            ->getResult();
    }

    /**
     * Find an existing customer by exact contact number.
     */
    public function findOneByContactNumber(string $contactNumber): ?Customer
    {
        return $this->createQueryBuilder('c')
            ->where('c.contactNumber = :contact')
            ->setParameter('contact', trim($contactNumber))
            ->setMaxResults(1)
            ->getQuery()
            ->getOneOrNullResult();
    }
}