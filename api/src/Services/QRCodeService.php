<?php

namespace App\Services;

use PDO;
use App\Models\Role;

class QRCodeService
{
    public function generate(array $authUser, array $payload): array
    {
        // resolve role: payload may include 'role' (key) or 'role_id' (numeric)
        $roleKey = $payload['role'] ?? null;
        $resolvedRoleId = null;

        $roleModel = new Role($this->db());

        if (isset($payload['role_id']) && $payload['role_id'] !== '') {
            $roleRow = $roleModel->findById((int)$payload['role_id']);
            if ($roleRow === null) {
                throw new \InvalidArgumentException('Invalid role_id');
            }
            $roleKey = $roleRow['role_key'];
            $resolvedRoleId = (int)$roleRow['role_id'];
        } elseif (!empty($roleKey)) {
            // try to resolve role_id from provided role key
            $roleRow = $roleModel->findByKey($roleKey);
            if ($roleRow !== null) {
                $resolvedRoleId = (int)$roleRow['role_id'];
            }
        }

        $record = [
            'code' => $payload['code'] ?? $this->generateUniqueCode(),
            'role_key' => $roleKey,
            'role_id' => $resolvedRoleId,
            'branch_id' => isset($payload['branch_id']) ? (int)$payload['branch_id'] : (int)($authUser['branchId'] ?? $authUser['branch_id'] ?? 0),
            'referred_by' => $payload['referred_by'] ?? null,
            'created_by_employee_id' => (int)$authUser['employeeId'],
            'expires_at' => $payload['expires_at'] ?? null,
            'status' => $payload['status'] ?? 'active'
        ];

        $pdo = $this->db();
        // Insert using `role` (role key) because the DB schema stores role as ENUM.
        // Insert using role_id; role_key is kept for response mapping
        $stmt = $pdo->prepare(
            'INSERT INTO team_onboarding_qr_codes (code, role_id, branch_id, referred_by, created_by_employee_id, status, expires_at)
             VALUES (:code, :role_id, :branch_id, :referred_by, :created_by_employee_id, :status, :expires_at)'
        );
        $stmt->execute([
            ':code' => $record['code'],
            ':role_id' => isset($record['role_id']) ? $record['role_id'] : null,
            ':branch_id' => $record['branch_id'],
            ':referred_by' => $record['referred_by'],
            ':created_by_employee_id' => $record['created_by_employee_id'],
            ':status' => $record['status'],
            ':expires_at' => $this->normalizeDatetime($record['expires_at'])
        ]);

        // role_id already set from resolution; include role key for response when possible
        if (!empty($record['role_id'])) {
            $roleModel = new Role($pdo);
            $roleRow = $roleModel->findById((int)$record['role_id']);
            $record['role'] = $roleRow ? $roleRow['role_key'] : null;
        } else {
            $record['role'] = null;
        }

        $record['id'] = (string)$pdo->lastInsertId();

        return $record;
    }

    public function verifyByCode(string $code): array
    {
        $pdo = $this->db();
        $stmt = $pdo->prepare('SELECT * FROM team_onboarding_qr_codes WHERE code = :code LIMIT 1');
        $stmt->execute([':code' => $code]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$row) {
            throw new \InvalidArgumentException('QR code not found');
        }

        if (($row['status'] ?? 'active') !== 'active') {
            throw new \RuntimeException('QR code is no longer active');
        }

        if (!empty($row['expires_at'])) {
            $expiryTime = strtotime($row['expires_at']);
            if ($expiryTime !== false && $expiryTime < time()) {
                $this->markExpired($row['qrcode_id']);
                throw new \RuntimeException('QR code has expired');
            }
        }

        return $this->rowToApiData($row);
    }

    public function listAll(): array
    {
        $pdo = $this->db();
        $rows = $pdo->query('SELECT * FROM team_onboarding_qr_codes ORDER BY created_at DESC')->fetchAll(PDO::FETCH_ASSOC);
        return array_map([$this, 'rowToApiData'], $rows);
    }

    public function findById(string $id): array
    {
        $pdo = $this->db();
        $stmt = $pdo->prepare('SELECT * FROM team_onboarding_qr_codes WHERE qrcode_id = :qrcode_id LIMIT 1');
        $stmt->execute([':qrcode_id' => $id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$row) {
            throw new \InvalidArgumentException('QR code not found');
        }

        return $this->rowToApiData($row);
    }

    public function deleteById(string $id): bool
    {
        $pdo = $this->db();
        $stmt = $pdo->prepare('DELETE FROM team_onboarding_qr_codes WHERE qrcode_id = :qrcode_id');
        $stmt->execute([':qrcode_id' => $id]);
        return $stmt->rowCount() > 0;
    }

    private function db(): PDO
    {
        static $pdo = null;

        if ($pdo instanceof PDO) {
            return $pdo;
        }

        $dsn = sprintf('mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4', DB_HOST, DB_PORT, DB_NAME);
        $pdo = new PDO($dsn, DB_USER, DB_PASSWORD, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false
        ]);

        return $pdo;
    }

    private function generateUniqueCode(): string
    {
        do {
            $candidate = strtoupper(bin2hex(random_bytes(6)));
        } while ($this->codeExists($candidate));

        return $candidate;
    }

    private function codeExists(string $code): bool
    {
        try {
            $pdo = $this->db();
            $stmt = $pdo->prepare('SELECT COUNT(*) FROM team_onboarding_qr_codes WHERE code = :code');
            $stmt->execute([':code' => $code]);
            return (int)$stmt->fetchColumn() > 0;
        } catch (\PDOException $e) {
            return false;
        }
    }

    private function normalizeDatetime($value)
    {
        if ($value === null || $value === '') {
            return null;
        }

        $timestamp = strtotime((string)$value);
        if ($timestamp === false) {
            return null;
        }

        return date('Y-m-d H:i:s', $timestamp);
    }

    private function rowToApiData(array $row): array
    {
        // Attempt to provide both role_id and role (role_key). If role column is empty, resolve role_key from role_id.
        $roleKey = $row['role'] ?? null;
        if ((empty($roleKey) || $roleKey === '') && !empty($row['role_id'])) {
            try {
                $roleModel = new Role($this->db());
                $r = $roleModel->findById((int)$row['role_id']);
                $roleKey = $r ? $r['role_key'] : null;
            } catch (\Throwable $e) {
                $roleKey = null;
            }
        }

        return [
            'id' => $row['qrcode_id'],
            'code' => $row['code'],
            'role' => $roleKey,
            'role_id' => isset($row['role_id']) ? (int)$row['role_id'] : null,
            'branch_id' => (string)$row['branch_id'],
            'referred_by' => $row['referred_by'],
            'team_onboarding_id' => $row['team_onboarding_id'] ? (string)$row['team_onboarding_id'] : null,
            'created_by_employee_id' => $row['created_by_employee_id'] ? (string)$row['created_by_employee_id'] : null,
            'created_at' => $this->toIsoDate($row['created_at'] ?? null),
            'expires_at' => $this->toIsoDate($row['expires_at'] ?? null),
            'used_at' => $this->toIsoDate($row['used_at'] ?? null),
            'status' => $row['status']
        ];
    }

    private function toIsoDate($value)
    {
        if ($value === null || $value === '') {
            return null;
        }

        $timestamp = strtotime((string)$value);
        if ($timestamp === false) {
            return null;
        }

        return date('c', $timestamp);
    }

    private function markExpired($id): void
    {
        try {
            $pdo = $this->db();
            $stmt = $pdo->prepare("UPDATE team_onboarding_qr_codes SET status = 'expired' WHERE qrcode_id = :qrcode_id");
            $stmt->execute([':qrcode_id' => $id]);
        } catch (\PDOException $e) {
        }
    }
}