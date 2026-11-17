<?php

namespace App\Services;

use PDO;

class AuthService
{
    public function loginAdmin(string $username, string $credential): array
    {
        $authModel = new \App\Models\Auth($this->db());

        $row = $authModel->getEmployeeRowByUsername($username);
        if (!$row || empty($row['is_active'])) {
            throw new \RuntimeException('Invalid username or inactive account');
        }

        $role = $row['role'] ?? null;
        if (!$role) {
            throw new \RuntimeException('Invalid employee record');
        }

        // SRIC / Sales OIC / Inventory Clerk login
        if (in_array($role, ['sales-oic', 'sr-ic', 'inventory_clerk'], true)) {
            $employee = $authModel->login_SRIC_SALESOIC($username, $credential);
            $authConfig = require __DIR__ . '/../../config/auth.php';
            
            $tokenPayload = array_merge($employee, [
                'position' => $role,
                'iat'      => time(),
                'exp'      => time() + $authConfig['token']['expiration']
            ]);

            $token = base64_encode(json_encode($tokenPayload));

            return [
                'success'    => true, 
                'message'    => 'Login successful', 
                'token'      => $token, 
                'employee'   => $employee,
                'expires_in' => $authConfig['token']['expiration']
            ];
        }

        // Sales representatives (and any other role) cannot use admin login; they must use /team/login.
        // Same message as an unknown account so roles aren't revealed.
        throw new \RuntimeException('Invalid username or inactive account');
    }

    public function loginTeam(string $employeeIdInput, string $pin): array
    {
        $authModel = new \App\Models\Auth($this->db());
        $row = $authModel->getEmployeeRowById($employeeIdInput);
        return $this->loginTeamWithRow($authModel, $row, $pin);
    }

    public function loginTeamByUsername(string $username, string $password): array
    {
        $authModel = new \App\Models\Auth($this->db());
        $row = $authModel->getEmployeeRowByUsername($username);
        return $this->loginTeamWithRow($authModel, $row, $password);
    }

    private function loginTeamWithRow(\App\Models\Auth $authModel, ?array $row, string $credential): array
    {
        if (!$row || empty($row['is_active'])) {
            throw new \RuntimeException('Invalid username or inactive account');
        }

        $username = $row['username'] ?? null;
        $role = $row['role'] ?? null;

        if (!$username || !$role) {
            throw new \RuntimeException('Invalid employee record');
        }

        // Team login is restricted to sales representatives only.
        // Same message as a missing account so we don't reveal which usernames exist or their roles.
        if (!in_array($role, ['sales-representative', 'sales_representative'], true)) {
            throw new \RuntimeException('Invalid username or inactive account');
        }

        $employee = $authModel->loginSALESREPRESENTATIVE($username, $credential);
        $teamAuthConfig = require __DIR__ . '/../../config/team_auth.php';

        $tokenPayload = array_merge($employee, [
            'role'     => 'team',
            'position' => $role,
            'iat'      => time(),
            'exp'      => time() + $teamAuthConfig['token']['expiration']
        ]);

        $token = base64_encode(json_encode($tokenPayload));

        return [
            'success'    => true,
            'message'    => 'Login successful',
            'token'      => $token,
            'employee'   => $employee,
            'expires_in' => $teamAuthConfig['token']['expiration']
        ];
    }

    private function db(): PDO
    {
        return \App\Database\DatabaseManager::getPdo();
    }
}