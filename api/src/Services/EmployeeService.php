<?php

namespace App\Services;

use App\Models\Employee;
use App\Models\Role;
use App\Models\TeamOnboarding;
use PDO;
use PDOException;

class EmployeeService
{
    /** Role keys that take part in the rotational assignment. */
    public const ROLE_SALES_REP = 'sales-representative';
    /** The clerk key is spelled both ways in the codebase, so both are accepted. */
    public const ROLE_CLERK_KEYS = ['inventory-clerk', 'inventory_clerk'];

    private TeamOnboarding $teamOnboarding;
    private Employee $employee;
    private PDO $pdo;

    public function __construct(?TeamOnboarding $teamOnboarding = null, ?Employee $employee = null)
    {
        $this->pdo = TeamOnboarding::createConnection();
        $this->teamOnboarding = $teamOnboarding instanceof TeamOnboarding
            ? $teamOnboarding
            : new TeamOnboarding($this->pdo);
        $this->employee = $employee instanceof Employee
            ? $employee
            : new Employee($this->pdo);
    }

    public function create(int $teamOnboardingId, array $authUser, array $auditContext = []): array
    {
        $approvedByEmployeeId = $authUser['employeeId'] ?? $authUser['employee_id'] ?? null;
        if (!$approvedByEmployeeId) {
            throw new \RuntimeException('Approver employee id is missing from token');
        }

        $registration = $this->teamOnboarding->findById($teamOnboardingId);
        if (!$registration) {
            throw new \InvalidArgumentException('Team onboarding record not found');
        }

        if ($registration['approved_by_employee_id'] !== null) {
            throw new \RuntimeException('Team onboarding record is already approved');
        }

        if (empty($registration['role'])) {
            throw new \RuntimeException('Team onboarding role is missing');
        }

        if ($this->teamOnboarding->usernameExistsInEmployees($registration['username'])) {
            throw new \RuntimeException('Username already exists');
        }

        try {
            $this->pdo->beginTransaction();

            $createdEmployee = $this->employee->create([
                'first_name' => $registration['first_name'],
                'middle_name' => $registration['middle_name'],
                'last_name' => $registration['last_name'],
                'email' => $registration['email'],
                'contact_number' => $registration['contact_number'],
                'address_id' => $registration['address_id'] ?? null,
                'address' => null,
                'username' => $registration['username'],
                'pin_hash' => $this->readPinHash($teamOnboardingId),
                'role_id' => $registration['role_id'],
                'branch_id' => $registration['branch_id'],
                'is_active' => 1,
            ]);

            $newEmployeeId = (int) $createdEmployee['employee_id'];

            $approvalStmt = $this->pdo->prepare(
                'UPDATE team_onboarding
                 SET approved_by_employee_id = :approved_by_employee_id
                 WHERE team_onboarding_id = :team_onboarding_id'
            );
            $approvalStmt->execute([
                ':approved_by_employee_id' => $approvedByEmployeeId,
                ':team_onboarding_id' => $teamOnboardingId,
            ]);

            // Fetch approver's name for audit log
            $approverStmt = $this->pdo->prepare('SELECT first_name, last_name FROM employees WHERE employee_id = :id');
            $approverStmt->execute([':id' => $approvedByEmployeeId]);
            $approver = $approverStmt->fetch(PDO::FETCH_ASSOC);
            $approverName = $approver ? trim(($approver['first_name'] ?? '') . ' ' . ($approver['last_name'] ?? '')) : null;

            // Audit record under action 'ONBOARDING', module 'team_onboarding'
            $auditStmt = $this->pdo->prepare("
                INSERT INTO audit_logs (
                    employee_id, employee_name, branch_id, action, module, record_id, old_values, new_values, ip_address, user_agent
                ) VALUES (
                    :employee_id, :employee_name, :branch_id, 'ONBOARDING', 'team_onboarding', :record_id, :old_values, :new_values, :ip_address, :user_agent
                )
            ");
            $auditStmt->execute([
                ':employee_id'   => $approvedByEmployeeId,
                ':employee_name' => $approverName,
                ':branch_id'     => $registration['branch_id'],
                ':record_id'     => (string) $teamOnboardingId,
                ':old_values'    => json_encode([
                    'status' => 'pending',
                    'approved_by_employee_id' => null,
                ]),
                ':new_values'    => json_encode([
                    'team_onboarding_id' => $teamOnboardingId,
                    'created_employee_id' => $newEmployeeId,
                    'username' => $registration['username'],
                    'role' => $registration['role'],
                    'branch_id' => $registration['branch_id'],
                    'approved_by_employee_id' => $approvedByEmployeeId,
                ]),
                ':ip_address'    => $auditContext['ip_address'] ?? ($_SERVER['REMOTE_ADDR'] ?? null),
                ':user_agent'    => $auditContext['user_agent'] ?? ($_SERVER['HTTP_USER_AGENT'] ?? null),
            ]);

            (new \App\Services\AuditLogService())->record([
                'action' => 'CREATE',
                'module' => 'employees',
                'employee_id' => $approvedByEmployeeId,
                'branch_id' => $createdEmployee['branch_id'] ?? $registration['branch_id'],
                'record_id' => (string) $newEmployeeId,
                'new_values' => [
                    'employee_id' => $newEmployeeId,
                    'username' => $registration['username'],
                    'role_id' => $registration['role_id'],
                    'branch_id' => $registration['branch_id'],
                ],
                'ip_address' => $auditContext['ip_address'] ?? ($_SERVER['REMOTE_ADDR'] ?? null),
                'user_agent' => $auditContext['user_agent'] ?? ($_SERVER['HTTP_USER_AGENT'] ?? null),
            ]);

            $this->pdo->commit();
        } catch (PDOException $e) {
            if ($this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }

            throw $e;
        }

        return [
            'team_onboarding' => $this->teamOnboarding->findById($teamOnboardingId),
            'employee_id' => $createdEmployee['employee_id'],
            'role_id' => $createdEmployee['role_id'],
        ];
    }

    private function readPinHash(int $teamOnboardingId): string
    {
        $stmt = $this->pdo->prepare(
            'SELECT pin_hash
             FROM team_onboarding
             WHERE team_onboarding_id = :team_onboarding_id
             LIMIT 1'
        );
        $stmt->execute([':team_onboarding_id' => $teamOnboardingId]);

        $pinHash = $stmt->fetchColumn();
        if (!is_string($pinHash) || $pinHash === '') {
            throw new \RuntimeException('PIN hash is missing for onboarding record');
        }

        return $pinHash;
    }

    public function getSalesOicWithBranch(int $branchId): array
    {
        $roleModel = new Role($this->pdo);
        $salesRole = $roleModel->findByKey('sales-oic');
        if ($salesRole === null) {
            return [];
        }

        $employees = $this->employee->getByBranch($branchId);
        $result = [];
        $salesRoleId = $salesRole['role_id'];
        foreach ($employees as $employee) {
            if (isset($employee['role_id']) && (int)$employee['role_id'] === $salesRoleId) {
                $result[] = array_merge($employee, [
                    'role_key' => $salesRole['role_key'],
                    'role_display_name' => $salesRole['display_name'],
                ]);
            }
        }

        return $result;
    }

    public function getSalesRepresentativeById(int $employeeId): ?array
    {
        $roleModel = new Role($this->pdo);
        $salesRole = $roleModel->findByKey('sales-representative');
        if ($salesRole === null) {
            return null;
        }

        $employee = $this->employee->findById($employeeId);
        if ($employee === null) {
            return null;
        }

        if (!isset($employee['role_id']) || (int)$employee['role_id'] !== (int)$salesRole['role_id']) {
            return null;
        }

        return array_merge($employee, [
            'role_key' => $salesRole['role_key'],
            'role_display_name' => $salesRole['display_name'],
        ]);
    }

    public function getSalesRepresentativesByBranch(int $branchId): array
    {
        $roleModel = new Role($this->pdo);
        $salesRole = $roleModel->findByKey('sales-representative');
        if ($salesRole === null) {
            return [];
        }

        $employees = $this->employee->getByBranch($branchId);
        $result = [];
        $salesRoleId = $salesRole['role_id'];
        foreach ($employees as $employee) {
            if (isset($employee['role_id']) && (int)$employee['role_id'] === (int)$salesRoleId) {
                $result[] = array_merge($employee, [
                    'role_key' => $salesRole['role_key'],
                    'role_display_name' => $salesRole['display_name'],
                ]);
            }
        }

        return $result;
    }
    public function getEmployeesByBranch(int $branchId): array
    {
        return $this->employee->getByBranch($branchId);
    }

    public function countEmployeesByBranch(int $branchId, array $filters = []): int
    {
        return $this->employee->countByBranch($branchId, $filters);
    }

    public function getEmployeesByBranchPaginated(
        int $branchId,
        int $page,
        int $perPage,
        array $filters = [],
    ): array {
        return $this->employee->getByBranchPaginated($branchId, $page, $perPage, $filters);
    }

    public function deactivateEmployee(int $employeeId, int $branchId): ?array
    {
        return $this->employee->deactivateByIdInBranch($employeeId, $branchId);
    }

    public function activateEmployee(int $employeeId, int $branchId): ?array
    {
        return $this->employee->activateByIdInBranch($employeeId, $branchId);
    }

    /**
     * Rotate an employee between Sales Representative and Inventory Clerk.
     *
     * @return array|null The updated employee (with role info), or null if the
     *                    employee is not in the Sales-OIC's branch.
     * @throws \InvalidArgumentException for an unsupported target role (400)
     * @throws \DomainException          when the rotation is not allowed (409)
     */
    public function rotateRole(
        int $employeeId,
        int $branchId,
        string $targetRoleKey,
        array $authUser,
        array $auditContext = []
    ): ?array {
        $roleModel = new Role($this->pdo);
        $targetRoleKey = trim($targetRoleKey);

        if ($targetRoleKey === self::ROLE_SALES_REP) {
            $targetRole = $roleModel->findByKey(self::ROLE_SALES_REP);
        } elseif (in_array($targetRoleKey, self::ROLE_CLERK_KEYS, true)) {
            $targetRole = null;
            foreach (self::ROLE_CLERK_KEYS as $key) {
                $targetRole = $roleModel->findByKey($key);
                if ($targetRole !== null) {
                    break;
                }
            }
        } else {
            throw new \InvalidArgumentException(
                'role_key must be sales-representative or inventory-clerk'
            );
        }

        if ($targetRole === null) {
            throw new \InvalidArgumentException('Target role is not configured');
        }

        $actorId = (int) ($authUser['employeeId'] ?? $authUser['employee_id'] ?? 0);
        if ($actorId === $employeeId) {
            throw new \DomainException('You cannot change your own role');
        }

        try {
            $this->pdo->beginTransaction();

            $employee = $this->employee->findByIdInBranch($employeeId, $branchId, true);
            if ($employee === null) {
                $this->pdo->rollBack();
                return null;
            }

            if ((int) $employee['is_active'] !== 1) {
                throw new \DomainException('Activate the employee before changing their role');
            }

            $currentRole = $roleModel->findById((int) $employee['role_id']);
            $currentKey = $currentRole['role_key'] ?? null;
            $currentIsClerk = in_array($currentKey, self::ROLE_CLERK_KEYS, true);
            $currentIsRep = $currentKey === self::ROLE_SALES_REP;

            if (!$currentIsClerk && !$currentIsRep) {
                throw new \DomainException(
                    'Only sales representatives and inventory clerks can be rotated'
                );
            }

            if ((int) $employee['role_id'] === (int) $targetRole['role_id']) {
                throw new \DomainException('Employee already has that role');
            }

            $this->employee->updateRoleInBranch($employeeId, $branchId, (int) $targetRole['role_id']);

            $this->pdo->commit();
        } catch (\Throwable $e) {
            if ($this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }
            throw $e;
        }

        (new \App\Services\AuditLogService())->record([
            'action' => 'UPDATE',
            'module' => 'employees',
            'employee_id' => $actorId ?: null,
            'branch_id' => $branchId,
            'record_id' => (string) $employeeId,
            'old_values' => [
                'role_id' => (int) $employee['role_id'],
                'role_key' => $currentKey,
            ],
            'new_values' => [
                'role_id' => (int) $targetRole['role_id'],
                'role_key' => $targetRole['role_key'],
                'operation' => 'role_rotation',
            ],
            'ip_address' => $auditContext['ip_address'] ?? null,
            'user_agent' => $auditContext['user_agent'] ?? null,
        ]);

        $updated = $this->employee->findById($employeeId) ?? $employee;

        return array_merge($updated, [
            'role_key' => $targetRole['role_key'],
            'role_display_name' => $targetRole['display_name'],
        ]);
    }

    public function auditStatusChange(array $employee, array $authUser, string $action, array $auditContext = []): void
    {
        (new \App\Services\AuditLogService())->record([
            'action' => 'UPDATE',
            'module' => 'employees',
            'employee_id' => $authUser['employeeId'] ?? $authUser['employee_id'] ?? null,
            'branch_id' => $employee['branch_id'] ?? ($authUser['branchId'] ?? $authUser['branch_id'] ?? null),
            'record_id' => (string) $employee['employee_id'],
            'old_values' => ['is_active' => $action === 'ACTIVATE' ? 0 : 1],
            'new_values' => [
                'is_active' => $action === 'ACTIVATE' ? 1 : 0,
                'operation' => strtolower($action),
            ],
            'ip_address' => $auditContext['ip_address'] ?? null,
            'user_agent' => $auditContext['user_agent'] ?? null,
        ]);
    }
}