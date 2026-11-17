<?php

namespace App\Repositories;

use App\Entities\ServiceReportAction;
use Doctrine\ORM\EntityRepository;

/** @extends EntityRepository<ServiceReportAction> */
class ServiceReportActionRepository extends EntityRepository
{
    /** @return ServiceReportAction[] */
    public function findByServiceReport(int $serviceReportId): array
    {
        return $this->createQueryBuilder('a')
            ->leftJoin('a.employee', 'e')
            ->addSelect('e')
            ->where('a.serviceReport = :serviceReportId')
            ->setParameter('serviceReportId', $serviceReportId)
            ->orderBy('a.actionDate', 'ASC')
            ->addOrderBy('a.id', 'ASC')
            ->getQuery()
            ->getResult();
    }
}