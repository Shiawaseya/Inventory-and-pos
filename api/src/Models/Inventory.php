<?php

namespace App\Models;

use PDO;

class Inventory extends BaseModel
{

    public function create(array $data): array
    {
        $stmt = $this->pdo->prepare(
            'INSERT INTO inventory (variant_id, branch_id, quantity, updated_by)
             VALUES (:variant_id, :branch_id, :quantity, :updated_by)'
        );

        $stmt->execute([
            ':variant_id' => isset($data['variant_id']) ? (int)$data['variant_id'] : null,
            ':branch_id' => isset($data['branch_id']) ? (int)$data['branch_id'] : null,
            ':quantity' => isset($data['quantity']) ? (int)$data['quantity'] : null,
            ':updated_by' => isset($data['updated_by']) && $data['updated_by'] !== '' ? (int)$data['updated_by'] : null,
        ]);

        return $this->findById((int)$this->pdo->lastInsertId());
    }

    public function findById(int $id): ?array
    {
        $stmt = $this->pdo->prepare(
            'SELECT inventory_id, variant_id, branch_id, quantity, updated_by, created_at, updated_at
             FROM inventory WHERE inventory_id = :id LIMIT 1'
        );
        $stmt->execute([':id' => $id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        return $row ? [
            'inventory_id' => (int)$row['inventory_id'],
            'variant_id' => $row['variant_id'] !== null ? (int)$row['variant_id'] : null,
            'branch_id' => $row['branch_id'] !== null ? (int)$row['branch_id'] : null,
            'quantity' => $row['quantity'] !== null ? (int)$row['quantity'] : null,
            'updated_by' => $row['updated_by'] !== null ? (int)$row['updated_by'] : null,
            'created_at' => $row['created_at'],
            'updated_at' => $row['updated_at'],
        ] : null;
    }

    public function findByItemAndBranch(int $itemId, int $branchId): ?array
    {
        $stmt = $this->pdo->prepare(
            'SELECT inventory_id, variant_id, branch_id, quantity, updated_by, created_at, updated_at
             FROM inventory WHERE variant_id = :variant_id AND branch_id = :branch_id LIMIT 1'
        );
        $stmt->execute([':variant_id' => $itemId, ':branch_id' => $branchId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        return $row ? [
            'inventory_id' => (int)$row['inventory_id'],
            'variant_id' => $row['variant_id'] !== null ? (int)$row['variant_id'] : null,
            'branch_id' => $row['branch_id'] !== null ? (int)$row['branch_id'] : null,
            'quantity' => $row['quantity'] !== null ? (int)$row['quantity'] : null,
            'updated_by' => $row['updated_by'] !== null ? (int)$row['updated_by'] : null,
            'created_at' => $row['created_at'],
            'updated_at' => $row['updated_at'],
        ] : null;
    }

    public function update(int $id, array $data): ?array
    {
        $fields = [];
        $params = [':id' => $id];

        if (isset($data['quantity'])) {
            $fields[] = 'quantity = :quantity';
            $params[':quantity'] = (int)$data['quantity'];
        }
        if (array_key_exists('updated_by', $data)) {
            $fields[] = 'updated_by = :updated_by';
            $params[':updated_by'] = $data['updated_by'] !== '' && $data['updated_by'] !== null ? (int)$data['updated_by'] : null;
        }

        if (empty($fields)) {
            return $this->findById($id);
        }

        $sql = 'UPDATE inventory SET ' . implode(', ', $fields) . ' WHERE inventory_id = :id';
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);

        return $this->findById($id);
    }

    public function listByBranch(int $branchId, int $limit = 100, int $offset = 0): array
    {
        $stmt = $this->pdo->prepare('SELECT inventory_id, variant_id, branch_id, quantity, updated_by, created_at, updated_at FROM inventory WHERE branch_id = :branch_id ORDER BY created_at DESC LIMIT :limit OFFSET :offset');
        $stmt->bindValue(':branch_id', $branchId, PDO::PARAM_INT);
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();

        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        return array_map(function ($row) {
            return [
                'inventory_id' => (int)$row['inventory_id'],
                'variant_id' => $row['variant_id'] !== null ? (int)$row['variant_id'] : null,
                'branch_id' => $row['branch_id'] !== null ? (int)$row['branch_id'] : null,
                'quantity' => $row['quantity'] !== null ? (int)$row['quantity'] : null,
                'updated_by' => $row['updated_by'] !== null ? (int)$row['updated_by'] : null,
                'created_at' => $row['created_at'],
                'updated_at' => $row['updated_at'],
            ];
        }, $rows);
    }

}
