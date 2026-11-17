<?php

namespace App\Services;

use App\Models\Role;
use App\Services\AuditLogService;

class RoleService
{
    private Role $model;

    public function __construct(?Role $model = null)
    {
        $this->model = $model instanceof Role ? $model : new Role();
    }

    public function listAll(): array
    {
        return $this->model->listAll();
    }

    public function findById(int $id): ?array
    {
        return $this->model->findById($id);
    }

    public function findByKey(string $key): ?array
    {
        return $this->model->findByKey($key);
    }

    public function create(array $data, ?array $user = null, array $auditContext = []): array
    {
        $role = $this->model->create($data);

        (new AuditLogService())->record([
            'action' => 'CREATE',
            'module' => 'roles',
            'employee_id' => $user['employeeId'] ?? $user['employee_id'] ?? null,
            'branch_id' => $user['branchId'] ?? $user['branch_id'] ?? null,
            'record_id' => (string) $role['role_id'],
            'new_values' => $role,
            'ip_address' => $auditContext['ip_address'] ?? null,
            'user_agent' => $auditContext['user_agent'] ?? null,
        ]);

        return $role;
    }
}
