<?php

namespace App\Models;

use PDO;

class Brand extends BaseModel
{

    public function create(array $data): array
    {
        $name = trim((string)($data['name'] ?? ''));
        if ($name === '') {
            throw new \InvalidArgumentException('Brand name is required');
        }

        $stmt = $this->pdo->prepare(
            'INSERT INTO brands (name, is_active, recorded_by)
             VALUES (:name, :is_active, :recorded_by)'
        );
        $stmt->execute([
            ':name' => $name,
            ':is_active' => isset($data['is_active']) ? (int)$data['is_active'] : 1,
            ':recorded_by' => isset($data['recorded_by']) && $data['recorded_by'] !== ''
                ? (int)$data['recorded_by']
                : null,
        ]);

        return $this->findById((int)$this->pdo->lastInsertId());
    }

    public function findById(int $brandId): ?array
    {
        $stmt = $this->pdo->prepare(
            'SELECT brand_id, name, is_active, recorded_by, created_at
             FROM brands
             WHERE brand_id = :brand_id
             LIMIT 1'
        );
        $stmt->execute([':brand_id' => $brandId]);

        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        return $row ? [
            'brand_id' => (int)$row['brand_id'],
            'name' => $row['name'],
            'is_active' => (int)$row['is_active'],
            'recorded_by' => $row['recorded_by'] !== null ? (int)$row['recorded_by'] : null,
            'created_at' => $row['created_at'],
        ] : null;
    }

        public function list(): array
        {
            $stmt = $this->pdo->query('SELECT brand_id, name, is_active, recorded_by, created_at FROM brands ORDER BY name ASC');
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
            return array_map(function ($row) {
                return [
                    'brand_id' => (int)$row['brand_id'],
                    'name' => $row['name'],
                    'is_active' => (int)$row['is_active'],
                    'recorded_by' => $row['recorded_by'] !== null ? (int)$row['recorded_by'] : null,
                    'created_at' => $row['created_at'],
                ];
            }, $rows);
        }

}
