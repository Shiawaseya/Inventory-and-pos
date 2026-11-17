<?php

namespace App\Models;

use PDO;

class Branch extends BaseModel
{

    public function create(array $data): array
    {
        $location = trim((string)($data['location'] ?? ''));
        $stmt = $this->pdo->prepare('INSERT INTO branches (location) VALUES (:location)');
        $stmt->execute([':location' => $location]);

        return $this->findById((int)$this->pdo->lastInsertId());
    }

    public function findById(int $id): ?array
    {
        $stmt = $this->pdo->prepare('SELECT branch_id, location FROM branches WHERE branch_id = :id LIMIT 1');
        $stmt->execute([':id' => $id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ? [
            'branch_id' => (int)$row['branch_id'],
            'location' => $row['location'],
        ] : null;
    }

    public function findByLocation(string $location): ?array
    {
        $stmt = $this->pdo->prepare('SELECT branch_id, location FROM branches WHERE location = :location LIMIT 1');
        $stmt->execute([':location' => $location]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ? [
            'branch_id' => (int)$row['branch_id'],
            'location' => $row['location'],
        ] : null;
    }

    public function list(): array
    {
        $stmt = $this->pdo->query('SELECT branch_id, location FROM branches ORDER BY location ASC');
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        return array_map(function ($row) {
            return [
                'branch_id' => (int)$row['branch_id'],
                'location' => $row['location'],
            ];
        }, $rows);
    }

}
