<?php

namespace App\Repositories;

use App\Entities\ServiceReport;
use Doctrine\ORM\EntityRepository;

/** @extends EntityRepository<ServiceReport> */
class ServiceReportRepository extends EntityRepository
{
    /** @return ServiceReport[] */
    public function findByBranch(int $branchId, int $page = 1, int $perPage = 10): array
    {
        return $this->createQueryBuilder('sr')
            ->leftJoin('sr.stockUnit', 'su')
            ->leftJoin('sr.salesInvoice', 'si')
            ->leftJoin('sr.preparedBy', 'pb')
            ->leftJoin('sr.certifiedBy', 'cb')
            ->addSelect('su', 'si', 'pb', 'cb')
            ->where('sr.branch = :branchId')
            ->setParameter('branchId', $branchId)
            ->orderBy('sr.createdAt', 'DESC')
            ->setFirstResult(($page - 1) * $perPage)
            ->setMaxResults($perPage)
            ->getQuery()
            ->getResult();
    }

    public function findOneByControlNumber(string $controlNumber): ?ServiceReport
    {
        return $this->findOneBy(['controlNumber' => $controlNumber]);
    }

    public function countByBranch(int $branchId): int
    {
        return (int) $this->createQueryBuilder('sr')
            ->select('COUNT(sr.id)')
            ->where('sr.branch = :branchId')
            ->setParameter('branchId', $branchId)
            ->getQuery()
            ->getSingleScalarResult();
    }
}