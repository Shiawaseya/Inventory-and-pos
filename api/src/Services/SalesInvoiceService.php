<?php

namespace App\Services;

use App\Database\DatabaseManager;
use App\Entities\SalesInvoice;
use App\Repositories\SalesInvoiceRepository;
use Doctrine\ORM\EntityManager;

class SalesInvoiceService
{
    private EntityManager $entityManager;
    private SalesInvoiceRepository $repository;

    public function __construct(?EntityManager $entityManager = null)
    {
        $this->entityManager = $entityManager ?? DatabaseManager::getEntityManager();
        $this->repository = $this->entityManager->getRepository(SalesInvoice::class);
    }

    /**
     * Get all invoices for a branch.
     *
     * @return SalesInvoice[]
     */
public function getByBranch(int $branchId, int $page, int $perPage, array $filters = []): array
{
    return $this->repository->findByBranch($branchId, $page, $perPage, $filters);
}

public function countByBranch(int $branchId, array $filters = []): int
{
    return $this->repository->countByBranch($branchId, $filters);
}
}
