<?php

namespace App\Models;

use PDO;

class Role extends BaseModel
{

    public function findById($roleId): ?array
    {
        $stmt = $this->pdo->prepare('SELECT role_id, role_key, display_name, created_at FROM roles WHERE role_id = :role_id LIMIT 1');
        $stmt->execute([':role_id' => $roleId]);

        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        return $row ? $this->mapRow($row) : null;
    }

    public function findByKey(string $roleKey): ?array
    {
        $stmt = $this->pdo->prepare('SELECT role_id, role_key, display_name, created_at FROM roles WHERE role_key = :role_key LIMIT 1');
        $stmt->execute([':role_key' => trim($roleKey)]);

        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        return $row ? $this->mapRow($row) : null;
    }

    public function listAll(): array
    {
        $stmt = $this->pdo->query('SELECT role_id, role_key, display_name, created_at FROM roles ORDER BY created_at DESC');
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        return array_map([$this, 'mapRow'], $rows);
    }

    public function create(array $data): array
    {
        $stmt = $this->pdo->prepare('INSERT INTO roles (role_key, display_name) VALUES (:role_key, :display_name)');
        $stmt->execute([
            ':role_key' => trim((string)$data['role_key']),
            ':display_name' => isset($data['display_name']) ? trim((string)$data['display_name']) : null,
        ]);

        return $this->findById((int)$this->pdo->lastInsertId());
    }


    private function mapRow(array $row): array
    {
        return [
            'role_id' => (int)$row['role_id'],
            'role_key' => $row['role_key'],
            'display_name' => $row['display_name'] ?? null,
            'created_at' => $row['created_at'] ?? null,
        ];
    }
}
