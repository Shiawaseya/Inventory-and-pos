<?php

namespace App\Services;

use App\Database\DatabaseManager;
use App\Entities\Category;
use App\Entities\Employee;
use App\Repositories\CategoryRepository;
use Doctrine\ORM\EntityManager;

class CategoryService
{
    private EntityManager $entityManager;
    private CategoryRepository $repository;

    public function __construct(?EntityManager $entityManager = null)
    {
        $this->entityManager = $entityManager ?? DatabaseManager::getEntityManager();
        $this->repository = $this->entityManager->getRepository(Category::class);
    }

    public function create(array $data, ?array $user = null): Category
    {
        $name = trim((string) ($data['name'] ?? ''));
        if ($name === '') {
            throw new \InvalidArgumentException('Category name is required');
        }

        $employeeId = $user['employee_id'] ?? $data['recorded_by'] ?? null;
        $recordedBy = null;

        if (!empty($employeeId)) {
            $recordedBy = $this->entityManager->find(Employee::class, (int) $employeeId);
        }

        $category = new Category($name, $recordedBy);

        $this->entityManager->persist($category);
        $this->entityManager->flush();

        (new AuditLogService($this->entityManager))->record([
            'action' => 'CREATE',
            'module' => 'categories',
            'employee_id' => $employeeId,
            'record_id' => $category->getId(),
            'new_values' => ['category_id' => $category->getId(), 'name' => $category->getName()],
            'ip_address' => $data['_audit']['ip_address'] ?? null,
            'user_agent' => $data['_audit']['user_agent'] ?? null,
        ]);

        return $category;
    }

    public function update(int $id, array $data, ?array $user = null): ?Category
    {
        $category = $this->entityManager->find(Category::class, $id);
        if (!$category) {
            return null;
        }

        $oldValues = [
            'category_id' => $category->getId(),
            'name' => $category->getName(),
        ];

        if (array_key_exists('name', $data)) {
            $name = trim((string) $data['name']);
            if ($name === '') {
                throw new \InvalidArgumentException('Category name cannot be empty');
            }

            // Check if another category already uses this name
            $existing = $this->repository->findOneBy(['name' => $name]);
            if ($existing && $existing->getId() !== $id) {
                throw new \InvalidArgumentException('A category with this name already exists');
            }

            $category->setName($name);
        }

        // Optionally update recorded_by if passed or resolved from authenticated user
        $employeeId = $user['employeeId'] ?? $user['employee_id'] ?? $data['recorded_by'] ?? null;
        if (!empty($employeeId)) {
            $employee = $this->entityManager->find(Employee::class, (int) $employeeId);
            if ($employee) {
                $category->setRecordedBy($employee);
            }
        }

        $this->entityManager->flush();

        if (!empty($data['_audit'])) {
            (new AuditLogService($this->entityManager))->record([
                'action' => 'UPDATE',
                'module' => 'categories',
                'employee_id' => $data['_audit']['employee_id'] ?? $employeeId,
                'record_id' => $category->getId(),
                'old_values' => $oldValues,
                'new_values' => [
                    'category_id' => $category->getId(),
                    'name' => $category->getName(),
                ],
                'ip_address' => $data['_audit']['ip_address'] ?? null,
                'user_agent' => $data['_audit']['user_agent'] ?? null,
            ]);
        }

        return $category;
    }

    /**
     * @return Category[]
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