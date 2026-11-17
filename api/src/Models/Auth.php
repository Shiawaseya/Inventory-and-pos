<?php

namespace App\Models;

use PDO;

class Auth extends BaseModel
{
    private string $baseEmployeeSelect = '
        SELECT 
            e.employee_id, e.username, e.pin_hash, e.email, e.contact_number, e.address_id,
            e.first_name, e.middle_name, e.last_name, e.is_active, e.branch_id,
            r.role_key AS role,
            a.street_address, a.barangay, a.city_municipality, a.province, a.region, a.postal_code, a.psgc_code
        FROM employees e
        LEFT JOIN roles r ON e.role_id = r.role_id
        LEFT JOIN addresses a ON e.address_id = a.address_id
    ';

    /**
     * Login for SRIC, Sales OIC, and inventory clerk users.
     */
    public function login_SRIC_SALESOIC(string $username, string $credential): array
    {
        $stmt = $this->pdo->prepare(
            $this->baseEmployeeSelect . '
            WHERE e.username = :username
              AND r.role_key IN (\'sales-oic\', \'sr-ic\', \'inventory_clerk\')
              AND e.is_active = 1
            LIMIT 1'
        );

        $stmt->execute([':username' => $username]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$row || !$this->verifyCredential($credential, (string)($row['pin_hash'] ?? ''))) {
            throw new \RuntimeException('Invalid credentials for SRIC/Sales OIC/Inventory Clerk');
        }

        return $this->mapEmployee($row);
    }

    /**
     * Login for Sales Representative users.
     */
    public function loginSALESREPRESENTATIVE(string $username, string $credential): array
    {
        $stmt = $this->pdo->prepare(
            $this->baseEmployeeSelect . '
            WHERE e.username = :username
              AND r.role_key = :role
              AND e.is_active = 1
            LIMIT 1'
        );

        $stmt->execute([':username' => $username, ':role' => 'sales-representative']);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$row || !$this->verifyCredential($credential, (string)($row['pin_hash'] ?? ''))) {
            throw new \RuntimeException('Invalid credentials for Sales Representative');
        }

        return $this->mapEmployee($row);
    }

    public function getEmployeeRowById($employeeId): ?array
    {
        $stmt = $this->pdo->prepare(
            $this->baseEmployeeSelect . '
            WHERE CAST(e.employee_id AS CHAR) = :employee_id
            LIMIT 1'
        );

        $stmt->execute([':employee_id' => $employeeId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ?: null;
    }

    public function getEmployeeRowByUsername(string $username): ?array
    {
        $stmt = $this->pdo->prepare(
            $this->baseEmployeeSelect . '
            WHERE e.username = :username
            LIMIT 1'
        );

        $stmt->execute([':username' => $username]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ?: null;
    }

    private function verifyCredential(string $plain, string $hash): bool
    {
        if ($hash === '') {
            return false;
        }

        if (password_verify($plain, $hash)) {
            return true;
        }

        return hash_equals($hash, $plain);
    }

    public function mapEmployee(array $row): array
    {
        $fullName = trim(implode(' ', array_filter([
            $row['first_name'] ?? null,
            $row['middle_name'] ?? null,
            $row['last_name'] ?? null,
        ])));

        // Structure address sub-object
        $address = null;
        if (!empty($row['address_id'])) {
            $address = [
                'addressId'        => (int) $row['address_id'],
                'streetAddress'    => $row['street_address'] ?? null,
                'barangay'         => $row['barangay'] ?? null,
                'cityMunicipality' => $row['city_municipality'] ?? null,
                'province'         => $row['province'] ?? null,
                'region'           => $row['region'] ?? null,
                'postalCode'       => $row['postal_code'] ?? null,
                'psgcCode'         => $row['psgc_code'] ?? null,
            ];
        }

        return [
            'employeeId'    => (string)$row['employee_id'],
            'username'      => $row['username'] ?? null,
            'role'          => $row['role'] ?? null,
            'status'        => (int) ($row['is_active'] ?? 0),
            'name'          => $fullName !== '' ? $fullName : null,
            'firstName'     => $row['first_name'] ?? null,
            'middleName'    => $row['middle_name'] ?? null,
            'lastName'      => $row['last_name'] ?? null,
            'email'         => $row['email'] ?? null,
            'contactNumber' => $row['contact_number'] ?? null,
            'branchId'      => isset($row['branch_id']) ? (string)$row['branch_id'] : null,
            'address'       => $address,
        ];
    }
}