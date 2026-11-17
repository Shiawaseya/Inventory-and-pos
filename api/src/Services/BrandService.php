<?php

namespace App\Services;

use App\Database\DatabaseManager;
use App\Entities\Brand;
use App\Entities\Employee;
use App\Repositories\BrandRepository;
use Doctrine\ORM\EntityManager;

class BrandService
{
    private EntityManager $entityManager;
    private BrandRepository $repository;

    public function __construct(?EntityManager $entityManager = null)
    {
        $this->entityManager = $entityManager ?? DatabaseManager::getEntityManager();
        $this->repository = $this->entityManager->getRepository(Brand::class);
    }

    public function create(array $data): Brand
    {
        $name = trim((string)($data['name'] ?? ''));
        if ($name === '') {
            throw new \InvalidArgumentException('Brand name is required');
        }

        $recordedBy = null;
        if (!empty($data['recorded_by'])) {
            $recordedBy = $this->entityManager->find(Employee::class, (int) $data['recorded_by']);
        }

        $brand = new Brand($name, $recordedBy);

        if (isset($data['is_active'])) {
            $brand->setIsActive(filter_var($data['is_active'], FILTER_VALIDATE_BOOLEAN));
        }

        $this->entityManager->persist($brand);
        $this->entityManager->flush();

        if (!empty($data['_audit'])) {
            (new AuditLogService($this->entityManager))->record([
                'action' => 'CREATE',
                'module' => 'brands',
                'employee_id' => $data['_audit']['employee_id'] ?? null,
                'record_id' => $brand->getId(),
                'new_values' => [
                    'brand_id' => $brand->getId(),
                    'name' => $brand->getName(),
                    'is_active' => $brand->isActive(),
                ],
                'ip_address' => $data['_audit']['ip_address'] ?? null,
                'user_agent' => $data['_audit']['user_agent'] ?? null,
            ]);
        }

        return $brand;
    }

    public function update(int $id, array $data, ?array $user = null): ?Brand
    {
        $brand = $this->entityManager->find(Brand::class, $id);
        if (!$brand) {
            return null;
        }

        $oldValues = [
            'brand_id' => $brand->getId(),
            'name' => $brand->getName(),
            'is_active' => $brand->isActive(),
        ];

        if (array_key_exists('name', $data)) {
            $name = trim((string) $data['name']);
            if ($name === '') {
                throw new \InvalidArgumentException('Brand name cannot be empty');
            }

            // Check if another brand already uses this name
            $existing = $this->repository->findOneBy(['name' => $name]);
            if ($existing && $existing->getId() !== $id) {
                throw new \InvalidArgumentException('A brand with this name already exists');
            }

            $brand->setName($name);
        }

        if (array_key_exists('is_active', $data)) {
            $brand->setIsActive(filter_var($data['is_active'], FILTER_VALIDATE_BOOLEAN));
        }

        // Optionally update recorded_by if passed or resolved from authenticated user
        $employeeId = $user['employeeId'] ?? $user['employee_id'] ?? $data['recorded_by'] ?? null;
        if (!empty($employeeId)) {
            $employee = $this->entityManager->find(Employee::class, (int) $employeeId);
            if ($employee) {
                $brand->setRecordedBy($employee);
            }
        }

        $this->entityManager->flush();

        if (!empty($data['_audit'])) {
            (new AuditLogService($this->entityManager))->record([
                'action' => 'UPDATE',
                'module' => 'brands',
                'employee_id' => $data['_audit']['employee_id'] ?? $employeeId,
                'record_id' => $brand->getId(),
                'old_values' => $oldValues,
                'new_values' => [
                    'brand_id' => $brand->getId(),
                    'name' => $brand->getName(),
                    'is_active' => $brand->isActive(),
                ],
                'ip_address' => $data['_audit']['ip_address'] ?? null,
                'user_agent' => $data['_audit']['user_agent'] ?? null,
            ]);
        }

        return $brand;
    }

    /**
     * @return Brand[]
     */
    public function getPaginated(int $page, int $perPage, array $filters = []): array
    {
        return $this->repository->findPaginated($page, $perPage, $filters);
    }

    public function countPaginated(array $filters = []): int
    {
        return $this->repository->countPaginated($filters);
    }
}