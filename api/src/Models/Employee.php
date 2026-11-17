<?php

namespace App\Models;

use PDO;
use App\Models\Role;

class Employee extends BaseModel
{

    /**
     * Get all employees by branch ID
     * @param int $branchId
     * @return array
     */
    public function getByBranch(int $branchId): array
    {
        $stmt = $this->pdo->prepare(
            'SELECT employee_id, first_name, middle_name, last_name, email, contact_number, address_id, username, role_id, is_active, created_at, deactivated_at, branch_id
             FROM employees
             WHERE branch_id = :branch_id AND is_active = 1'
        );
        $stmt->execute([':branch_id' => $branchId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function countByBranch(int $branchId, array $filters = []): int
    {
        [$where, $parameters] = $this->buildBranchFilters($branchId, $filters);
        $stmt = $this->pdo->prepare(
            'SELECT COUNT(*)
             FROM employees e
             LEFT JOIN roles r ON r.role_id = e.role_id
             WHERE ' . $where
        );
        $stmt->execute($parameters);
        return (int) $stmt->fetchColumn();
    }

    public function getByBranchPaginated(
        int $branchId,
        int $page,
        int $perPage,
        array $filters = [],
    ): array {
        [$where, $parameters] = $this->buildBranchFilters($branchId, $filters);
        $sortColumns = [
            'id' => 'e.employee_id',
            'first_name' => 'e.first_name',
            'last_name' => 'e.last_name',
            'email' => 'e.email',
            'created_at' => 'e.created_at',
            'status' => 'e.is_active',
            'position' => 'r.display_name',
        ];
        $sort = $sortColumns[$filters['sort'] ?? 'last_name'] ?? $sortColumns['last_name'];
        $direction = strtolower((string) ($filters['direction'] ?? 'asc'));
        if (!in_array($direction, ['asc', 'desc'], true)) {
            throw new \InvalidArgumentException('direction must be asc or desc');
        }

        $offset = ($page - 1) * $perPage;
        $stmt = $this->pdo->prepare(
            'SELECT e.employee_id, e.first_name, e.middle_name, e.last_name,
                    e.email, e.contact_number, e.address_id, e.username,
                    e.is_active, e.created_at, e.deactivated_at, e.branch_id,
                    r.role_key, r.display_name AS position
             FROM employees e
             LEFT JOIN roles r ON r.role_id = e.role_id
             WHERE ' . $where . '
             ORDER BY ' . $sort . ' ' . strtoupper($direction) . ', e.employee_id ASC
             LIMIT :limit OFFSET :offset'
        );
        foreach ($parameters as $name => $value) {
            $stmt->bindValue($name, $value, PDO::PARAM_STR);
        }
        $stmt->bindValue(':limit', $perPage, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();

        return array_map(static function (array $employee): array {
            $employee['status'] = (int) $employee['is_active'] === 1 ? 'Active' : 'Inactive';
            return $employee;
        }, $stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    private function buildBranchFilters(int $branchId, array $filters): array
    {
        $where = 'e.branch_id = :branch_id';
        $parameters = [':branch_id' => $branchId];
        $search = trim((string) ($filters['search'] ?? ''));
        if ($search !== '') {
            // Native prepared statements need a unique placeholder per use,
            // so :search can't be repeated in the SQL.
            $searchColumns = [
                'e.first_name',
                'e.middle_name',
                'e.last_name',
                'e.email',
                'e.username',
                'e.contact_number',
                'r.display_name',
            ];
            $like = '%' . $search . '%';
            $conditions = [];
            foreach ($searchColumns as $index => $column) {
                $placeholder = ':search_' . $index;
                $conditions[] = $column . ' LIKE ' . $placeholder;
                $parameters[$placeholder] = $like;
            }
            $where .= ' AND (' . implode(' OR ', $conditions) . ')';
        }

        return [$where, $parameters];
    }

    public function create(array $data): array
    {
        $roleId = isset($data['role_id']) ? (int)$data['role_id'] : null;
        $roleKey = isset($data['role']) ? trim((string)$data['role']) : null;

        if ($roleKey === null && $roleId !== null) {
            $role = (new Role($this->pdo))->findById($roleId);
            $roleKey = $role['role_key'] ?? null;
        }

        $stmt = $this->pdo->prepare(
            'INSERT INTO employees (first_name, middle_name, last_name, email, contact_number, address_id, username, pin_hash, role_id, is_active, branch_id)
             VALUES (:first_name, :middle_name, :last_name, :email, :contact_number, :address_id, :username, :pin_hash, :role_id, :is_active, :branch_id)'
        );
        $addressId = $this->createAddress($data);
        $stmt->execute([
            ':first_name' => $data['first_name'],
            ':middle_name' => $data['middle_name'] ?? null,
            ':last_name' => $data['last_name'],
            ':email' => $data['email'] ?? null,
            ':contact_number' => $data['contact_number'] ?? null,
            ':address_id' => $addressId,
            ':username' => $data['username'],
            ':pin_hash' => $data['pin_hash'],
            ':role_id' => $roleId,
            ':is_active' => isset($data['is_active']) ? (int)$data['is_active'] : 1,
            ':branch_id' => (int)$data['branch_id'],
        ]);

        $employeeId = (int)$this->pdo->lastInsertId();

        if ($roleKey === 'supervisor') {
            $roleStmt = $this->pdo->prepare(
                'INSERT INTO supervisors (employee_id, branch_id, is_active)
                 VALUES (:employee_id, :branch_id, 1)'
            );
            $roleStmt->execute([
                ':employee_id' => $employeeId,
                ':branch_id' => (int)$data['branch_id'],
            ]);
        }

        if ($roleKey === 'inventory_clerk') {
            $roleStmt = $this->pdo->prepare(
                'INSERT INTO inventory_clerk (employee_id, is_active)
                 VALUES (:employee_id, 1)'
            );
            $roleStmt->execute([
                ':employee_id' => $employeeId,
            ]);
        }

        return [
            'employee_id' => $employeeId,
            'role_id' => isset($data['role_id']) ? (int)$data['role_id'] : null,
        ];
    }

    public function findById(int $employeeId): ?array
    {
        $stmt = $this->pdo->prepare(
            'SELECT employee_id, first_name, middle_name, last_name, email, contact_number, address_id, username, role_id, is_active, created_at, deactivated_at, branch_id
             FROM employees
             WHERE employee_id = :employee_id
             LIMIT 1'
        );
        $stmt->execute([':employee_id' => $employeeId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        return $row ?: null;
    }

    /**
     * Find an employee by id inside a branch. Pass $forUpdate = true inside a
     * transaction to lock the row while the role is being changed.
     */
    public function findByIdInBranch(int $employeeId, int $branchId, bool $forUpdate = false): ?array
    {
        $stmt = $this->pdo->prepare(
            'SELECT employee_id, first_name, middle_name, last_name, email, contact_number, address_id, username, role_id, is_active, created_at, deactivated_at, branch_id
             FROM employees
             WHERE employee_id = :employee_id
               AND branch_id = :branch_id
             LIMIT 1' . ($forUpdate ? ' FOR UPDATE' : '')
        );
        $stmt->execute([
            ':employee_id' => $employeeId,
            ':branch_id' => $branchId,
        ]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        return $row ?: null;
    }

    public function updateRoleInBranch(int $employeeId, int $branchId, int $roleId): bool
    {
        $stmt = $this->pdo->prepare(
            'UPDATE employees
             SET role_id = :role_id
             WHERE employee_id = :employee_id
               AND branch_id = :branch_id'
        );
        $stmt->execute([
            ':role_id' => $roleId,
            ':employee_id' => $employeeId,
            ':branch_id' => $branchId,
        ]);

        return $stmt->rowCount() > 0;
    }

    public function deactivateByIdInBranch(int $employeeId, int $branchId): ?array
    {
        $stmt = $this->pdo->prepare(
            'UPDATE employees
             SET is_active = 0, deactivated_at = CURRENT_TIMESTAMP
             WHERE employee_id = :employee_id
               AND branch_id = :branch_id
               AND is_active = 1'
        );
        $stmt->execute([
            ':employee_id' => $employeeId,
            ':branch_id' => $branchId,
        ]);

        if ($stmt->rowCount() === 0) {
            $lookup = $this->pdo->prepare(
                'SELECT employee_id, first_name, middle_name, last_name, email, username,
                        is_active, deactivated_at, branch_id
                 FROM employees
                 WHERE employee_id = :employee_id
                   AND branch_id = :branch_id
                 LIMIT 1'
            );
            $lookup->execute([
                ':employee_id' => $employeeId,
                ':branch_id' => $branchId,
            ]);
            $existing = $lookup->fetch(PDO::FETCH_ASSOC);
            return $existing ?: null;
        }

        return $this->findById($employeeId);
    }

    public function activateByIdInBranch(int $employeeId, int $branchId): ?array
    {
        $stmt = $this->pdo->prepare(
            'UPDATE employees
             SET is_active = 1, deactivated_at = NULL
             WHERE employee_id = :employee_id
               AND branch_id = :branch_id
               AND is_active = 0'
        );
        $stmt->execute([
            ':employee_id' => $employeeId,
            ':branch_id' => $branchId,
        ]);

        $lookup = $this->pdo->prepare(
            'SELECT employee_id
             FROM employees
             WHERE employee_id = :employee_id
               AND branch_id = :branch_id
             LIMIT 1'
        );
        $lookup->execute([
            ':employee_id' => $employeeId,
            ':branch_id' => $branchId,
        ]);

        return $lookup->fetch(PDO::FETCH_ASSOC)
            ? $this->findById($employeeId)
            : null;
    }

    private function createAddress(array $data): ?int
    {
        if (!empty($data['address_id'])) {
            return (int) $data['address_id'];
        }
        $address = is_array($data['address'] ?? null) ? $data['address'] : $data;
        $fields = ['street_address', 'barangay', 'city_municipality', 'province', 'region', 'postal_code', 'psgc_code'];
        $values = [];
        foreach ($fields as $field) {
            $values[$field] = isset($address[$field]) && trim((string) $address[$field]) !== ''
                ? trim((string) $address[$field])
                : null;
        }
        if (!array_filter($values, static fn ($value) => $value !== null)) {
            return null;
        }
        $stmt = $this->pdo->prepare(
            'INSERT INTO addresses (street_address, barangay, city_municipality, province, region, postal_code, psgc_code)
             VALUES (:street_address, :barangay, :city_municipality, :province, :region, :postal_code, :psgc_code)'
        );
        $stmt->execute($values);
        return (int) $this->pdo->lastInsertId();
    }
}