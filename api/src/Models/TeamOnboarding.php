<?php

namespace App\Models;

use PDO;
use PDOException;
use App\Models\Role;

class TeamOnboarding extends BaseModel
{

    public function findById($teamOnboardingId): ?array
    {
        $stmt = $this->pdo->prepare(
                'SELECT t.team_onboarding_id,
                    t.first_name,
                    t.middle_name,
                    t.last_name,
                    t.email,
                    t.contact_number,
                    t.address_id,
                    t.username,
                    t.branch_id,
                    t.approved_by_employee_id,
                    t.created_at,
                    q.qrcode_id,
                    q.code,
                    r.role_key AS role,
                    COALESCE(t.role_id, q.role_id) AS role_id,
                    q.status AS qr_status,
                    q.referred_by,
                    q.created_by_employee_id,
                    q.used_at,
                    q.expires_at
             FROM team_onboarding t
                 LEFT JOIN team_onboarding_qr_codes q ON q.team_onboarding_id = t.team_onboarding_id
                 LEFT JOIN roles r ON COALESCE(t.role_id, q.role_id) = r.role_id
             WHERE t.team_onboarding_id = :team_onboarding_id
             LIMIT 1'
        );
        $stmt->execute([':team_onboarding_id' => $teamOnboardingId]);

        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        return $row ? $this->mapOnboardingRow($row) : null;
    }

    public function findByUsername(string $username): ?array
    {
        $stmt = $this->pdo->prepare(
                'SELECT t.team_onboarding_id,
                    t.first_name,
                    t.middle_name,
                    t.last_name,
                    t.email,
                    t.contact_number,
                    t.address_id,
                    t.username,
                    t.branch_id,
                    t.approved_by_employee_id,
                    t.created_at,
                    q.qrcode_id,
                    q.code,
                    r.role_key AS role,
                    COALESCE(t.role_id, q.role_id) AS role_id,
                    q.status AS qr_status,
                    q.referred_by,
                    q.created_by_employee_id,
                    q.used_at,
                    q.expires_at
             FROM team_onboarding t
                 LEFT JOIN team_onboarding_qr_codes q ON q.team_onboarding_id = t.team_onboarding_id
                 LEFT JOIN roles r ON COALESCE(t.role_id, q.role_id) = r.role_id
             WHERE t.username = :username
             LIMIT 1'
        );
        $stmt->execute([':username' => $username]);

        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        return $row ? $this->mapOnboardingRow($row) : null;
    }

    public function listPending(): array
    {
        $stmt = $this->pdo->query(
                'SELECT t.team_onboarding_id,
                    t.first_name,
                    t.middle_name,
                    t.last_name,
                    t.email,
                    t.contact_number,
                    t.address_id,
                    t.username,
                    t.branch_id,
                    t.approved_by_employee_id,
                    t.created_at,
                    q.qrcode_id,
                    q.code,
                    r.role_key AS role,
                    COALESCE(t.role_id, q.role_id) AS role_id,
                    q.status AS qr_status,
                    q.referred_by,
                    q.created_by_employee_id,
                    q.used_at,
                    q.expires_at
             FROM team_onboarding t
                 LEFT JOIN team_onboarding_qr_codes q ON q.team_onboarding_id = t.team_onboarding_id
                 LEFT JOIN roles r ON COALESCE(t.role_id, q.role_id) = r.role_id
             WHERE t.approved_by_employee_id IS NULL
             ORDER BY t.created_at DESC'
        );

        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        return array_map([$this, 'mapOnboardingRow'], $rows);
    }

    public function usernameExistsInOnboarding(string $username): bool
    {
        $stmt = $this->pdo->prepare('SELECT team_onboarding_id FROM team_onboarding WHERE username = :username LIMIT 1');
        $stmt->execute([':username' => $username]);

        return (bool)$stmt->fetchColumn();
    }

    public function usernameExistsInEmployees(string $username): bool
    {
        $stmt = $this->pdo->prepare('SELECT employee_id FROM employees WHERE username = :username LIMIT 1');
        $stmt->execute([':username' => $username]);

        return (bool)$stmt->fetchColumn();
    }

    public function emailExistsInOnboarding(string $email): bool
    {
        $stmt = $this->pdo->prepare('SELECT team_onboarding_id FROM team_onboarding WHERE email = :email LIMIT 1');
        $stmt->execute([':email' => trim($email)]);
        return (bool) $stmt->fetchColumn();
    }

    public function emailExistsInEmployees(string $email): bool
    {
        $stmt = $this->pdo->prepare('SELECT employee_id FROM employees WHERE email = :email LIMIT 1');
        $stmt->execute([':email' => trim($email)]);
        return (bool) $stmt->fetchColumn();
    }

    public function phoneExistsInOnboarding(string $phone): bool
    {
        $variants = \App\Services\AccountValidator::phoneVariants($phone);
        $in = implode(',', array_fill(0, count($variants), '?'));
        $stmt = $this->pdo->prepare(
            "SELECT team_onboarding_id FROM team_onboarding
             WHERE REGEXP_REPLACE(contact_number, '[^0-9+]', '') IN ($in) LIMIT 1"
        );
        $stmt->execute($variants);
        return (bool) $stmt->fetchColumn();
    }

    public function phoneExistsInEmployees(string $phone): bool
    {
        $variants = \App\Services\AccountValidator::phoneVariants($phone);
        $in = implode(',', array_fill(0, count($variants), '?'));
        $stmt = $this->pdo->prepare(
            "SELECT employee_id FROM employees
             WHERE REGEXP_REPLACE(contact_number, '[^0-9+]', '') IN ($in) LIMIT 1"
        );
        $stmt->execute($variants);
        return (bool) $stmt->fetchColumn();
    }

    public function create(array $data): array
    {
        $stmt = $this->pdo->prepare(
            'INSERT INTO team_onboarding (first_name, middle_name, last_name, email, contact_number, address_id, username, pin_hash, branch_id, role_id)
             VALUES (:first_name, :middle_name, :last_name, :email, :contact_number, :address_id, :username, :pin_hash, :branch_id, :role_id)'
        );
        $addressId = $this->createAddress($data);
        $stmt->execute([
            ':first_name' => trim((string)$data['first_name']),
            ':middle_name' => isset($data['middle_name']) && trim((string)$data['middle_name']) !== ''
                ? trim((string)$data['middle_name'])
                : null,
            ':last_name' => trim((string)$data['last_name']),
            ':email' => trim((string)$data['email']),
            ':contact_number' => trim((string)$data['contact_number']),
            ':address_id' => $addressId,
            ':username' => trim((string)$data['username']),
            ':pin_hash' => password_hash((string)$data['pin'], PASSWORD_BCRYPT),
            ':branch_id' => (int)$data['branch_id']
            ,':role_id' => isset($data['role_id']) ? (int)$data['role_id'] : null
        ]);

        return $this->findById((int)$this->pdo->lastInsertId());
    }


    public function approve($teamOnboardingId, $approvedByEmployeeId): array
    {
        $registration = $this->findById($teamOnboardingId);
        if (!$registration) {
            throw new \InvalidArgumentException('Team onboarding record not found');
        }

        if ($registration['approved_by_employee_id'] !== null) {
            throw new \RuntimeException('Team onboarding record is already approved');
        }

        // role may be provided as role key or available via role_id; ensure we have a resolved role_key and role_id
        $roleKey = $registration['role'] ?? null;
        $roleId = $registration['role_id'] ?? null;
        if (empty($roleKey) && empty($roleId)) {
            throw new \RuntimeException('Team onboarding role is missing');
        }
        // resolve role_id if missing
        if (empty($roleId) && !empty($roleKey)) {
            $roleModel = new Role($this->pdo);
            $roleRow = $roleModel->findByKey($roleKey);
            $roleId = $roleRow ? (int)$roleRow['role_id'] : null;
        }
        // resolve role_key if missing and role_id present
        if (empty($roleKey) && !empty($roleId)) {
            $roleModel = new Role($this->pdo);
            $roleRow = $roleModel->findById((int)$roleId);
            $roleKey = $roleRow ? $roleRow['role_key'] : null;
        }

        try {
            $this->pdo->beginTransaction();

            $employeeStmt = $this->pdo->prepare(
                'INSERT INTO employees (first_name, middle_name, last_name, email, contact_number, address_id, username, pin_hash, role_id, is_active, branch_id)
                 SELECT first_name, middle_name, last_name, email, contact_number, address_id, username, pin_hash, :role_id, 1, branch_id
                 FROM team_onboarding
                 WHERE team_onboarding_id = :team_onboarding_id'
            );
            $employeeStmt->execute([
                ':role_id' => $roleId,
                ':team_onboarding_id' => $teamOnboardingId
            ]);

            $employeeId = (int)$this->pdo->lastInsertId();

            if ($roleKey === 'supervisor') {
                $roleStmt = $this->pdo->prepare(
                    'INSERT INTO supervisors (employee_id, branch_id, is_active)
                     VALUES (:employee_id, :branch_id, 1)'
                );
                $roleStmt->execute([
                    ':employee_id' => $employeeId,
                    ':branch_id' => $registration['branch_id']
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

            $approvalStmt = $this->pdo->prepare(
                'UPDATE team_onboarding
                 SET approved_by_employee_id = :approved_by_employee_id
                 WHERE team_onboarding_id = :team_onboarding_id'
            );
            $approvalStmt->execute([
                ':approved_by_employee_id' => $approvedByEmployeeId,
                ':team_onboarding_id' => $teamOnboardingId
            ]);

            $this->pdo->commit();

            return [
                'team_onboarding' => $this->findById($teamOnboardingId),
                'employee_id' => $employeeId,
                'role' => $roleKey,
                'role_id' => $roleId
            ];
        } catch (PDOException $e) {
            if ($this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }

            throw $e;
        }
    }


    private function mapOnboardingRow(array $row): array
    {
        $roleKey = $row['role'] ?? null;
        if ((empty($roleKey) || $roleKey === '') && !empty($row['role_id'])) {
            try {
                $roleModel = new Role($this->pdo);
                $r = $roleModel->findById((int)$row['role_id']);
                $roleKey = $r ? $r['role_key'] : null;
            } catch (\Throwable $e) {
                $roleKey = null;
            }
        }

        return [
            'team_onboarding_id' => (int)$row['team_onboarding_id'],
            'first_name' => $row['first_name'],
            'middle_name' => $row['middle_name'],
            'last_name' => $row['last_name'],
            'email' => $row['email'] ?? null,
            'contact_number' => $row['contact_number'] ?? null,
            'address_id' => $row['address_id'] !== null ? (int) $row['address_id'] : null,
            'full_name' => trim(implode(' ', array_filter([
                $row['first_name'] ?? null,
                $row['middle_name'] ?? null,
                $row['last_name'] ?? null,
            ]))),
            'username' => $row['username'],
            'branch_id' => (int)$row['branch_id'],
            'approved_by_employee_id' => $row['approved_by_employee_id'] !== null ? (int)$row['approved_by_employee_id'] : null,
            'created_at' => $row['created_at'],
            'qrcode_id' => $row['qrcode_id'] !== null ? (int)$row['qrcode_id'] : null,
            'qr_code' => $row['code'] ?? null,
            'role' => $roleKey,
            'role_id' => isset($row['role_id']) ? (int)$row['role_id'] : null,
            'qr_status' => $row['qr_status'] ?? null,
            'referred_by' => $row['referred_by'] ?? null,
            'created_by_employee_id' => $row['created_by_employee_id'] !== null ? (int)$row['created_by_employee_id'] : null,
            'used_at' => $row['used_at'] ?? null,
            'expires_at' => $row['expires_at'] ?? null,
        ];
    }

    private function createAddress(array $data): ?int
    {
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