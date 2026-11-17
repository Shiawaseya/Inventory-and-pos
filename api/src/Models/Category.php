<?php

namespace App\Models;

use PDO;

class Category extends BaseModel
{

    public function create(array $data): array
    {
        $name = trim((string)($data['name'] ?? ''));
        if ($name === '') {
            throw new \InvalidArgumentException('Category name is required');
        }

        $stmt = $this->pdo->prepare(
            'INSERT INTO categories (name, recorded_by)
             VALUES (:name, :recorded_by)'
        );
        $stmt->execute([
            ':name' => $name,
            ':recorded_by' => isset($data['recorded_by']) && $data['recorded_by'] !== ''
                ? (int)$data['recorded_by']
                : null,
        ]);

        return $this->findById((int)$this->pdo->lastInsertId());
    }

    public function findById(int $categoryId): ?array
    {
        $stmt = $this->pdo->prepare(
            'SELECT category_id, name, recorded_by
             FROM categories
             WHERE category_id = :category_id
             LIMIT 1'
        );
        $stmt->execute([':category_id' => $categoryId]);

        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        return $row ? [
            'category_id' => (int)$row['category_id'],
            'name' => $row['name'],
            'recorded_by' => $row['recorded_by'] !== null ? (int)$row['recorded_by'] : null,
        ] : null;
    }

    public function list(): array
    {
        $stmt = $this->pdo->query('SELECT category_id, name, recorded_by FROM categories ORDER BY name ASC');
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        return array_map(function ($row) {
            return [
                'category_id' => (int)$row['category_id'],
                'name' => $row['name'],
                'recorded_by' => $row['recorded_by'] !== null ? (int)$row['recorded_by'] : null,
            ];
        }, $rows);
    }

}
