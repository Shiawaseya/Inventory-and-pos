<?php

namespace App\Models;

use PDO;

class BranchItem extends BaseModel
{

    public function create(array $data): array
    {
        $stmt = $this->pdo->prepare(
            'INSERT INTO branch_item (variant_id, branch_id, price, reorder_level, updated_by)
             VALUES (:variant_id, :branch_id, :price, :reorder_level, :updated_by)'
        );
        $stmt->execute([
            ':variant_id' => (int)($data['variant_id'] ?? 0),
            ':branch_id' => (int)($data['branch_id'] ?? 0),
            ':price' => isset($data['price']) ? (float)$data['price'] : 0.0,
            ':reorder_level' => isset($data['reorder_level']) && $data['reorder_level'] !== '' ? (int)$data['reorder_level'] : null,
            ':updated_by' => isset($data['updated_by']) && $data['updated_by'] !== '' ? (int)$data['updated_by'] : null,
        ]);

        return $this->findById((int)$this->pdo->lastInsertId());
    }

    public function findById(int $id): ?array
    {
        $stmt = $this->pdo->prepare(
            'SELECT branch_item_id, variant_id, branch_id, price, reorder_level, updated_by, updated_at
             FROM branch_item
             WHERE branch_item_id = :id
             LIMIT 1'
        );
        $stmt->execute([':id' => $id]);

        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        return $row ? [
            'branch_item_id' => (int)$row['branch_item_id'],
            'variant_id' => (int)$row['variant_id'],
            'branch_id' => (int)$row['branch_id'],
            'price' => $row['price'] !== null ? (float)$row['price'] : null,
            'reorder_level' => $row['reorder_level'] !== null ? (int)$row['reorder_level'] : null,
            'updated_by' => $row['updated_by'] !== null ? (int)$row['updated_by'] : null,
            'updated_at' => $row['updated_at'],
        ] : null;
    }

    public function findByItemAndBranch(int $itemId, int $branchId): ?array
    {
        $stmt = $this->pdo->prepare(
            'SELECT branch_item_id, variant_id, branch_id, price, reorder_level, updated_by, updated_at
             FROM branch_item
             WHERE variant_id = :variant_id AND branch_id = :branch_id
             LIMIT 1'
        );
        $stmt->execute([':variant_id' => $itemId, ':branch_id' => $branchId]);

        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        return $row ? [
            'branch_item_id' => (int)$row['branch_item_id'],
            'variant_id' => (int)$row['variant_id'],
            'branch_id' => (int)$row['branch_id'],
            'price' => $row['price'] !== null ? (float)$row['price'] : null,
            'reorder_level' => $row['reorder_level'] !== null ? (int)$row['reorder_level'] : null,
            'updated_by' => $row['updated_by'] !== null ? (int)$row['updated_by'] : null,
            'updated_at' => $row['updated_at'],
        ] : null;
    }

    public function update(int $id, array $data): ?array
    {
        $fields = [];
        $params = [':id' => $id];

        if (isset($data['price'])) {
            $fields[] = 'price = :price';
            $params[':price'] = (float)$data['price'];
        }
        if (array_key_exists('reorder_level', $data)) {
            $fields[] = 'reorder_level = :reorder_level';
            $params[':reorder_level'] = $data['reorder_level'] !== '' && $data['reorder_level'] !== null ? (int)$data['reorder_level'] : null;
        }
        if (array_key_exists('updated_by', $data)) {
            $fields[] = 'updated_by = :updated_by';
            $params[':updated_by'] = $data['updated_by'] !== '' && $data['updated_by'] !== null ? (int)$data['updated_by'] : null;
        }

        if (empty($fields)) {
            return $this->findById($id);
        }

        $sql = 'UPDATE branch_item SET ' . implode(', ', $fields) . ' WHERE branch_item_id = :id';
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);

        return $this->findById($id);
    }

    public function listByBranch(int $branchId, int $limit = 100, int $offset = 0): array
    {
        $sql =
            'SELECT branch_item_id, item_id, branch_id, price, reorder_level, updated_at
             FROM branch_item
             WHERE branch_id = :branch_id
             ORDER BY branch_item_id ASC
             LIMIT :limit OFFSET :offset';

        $sql =
            'SELECT branch_item_id, variant_id, branch_id, price, reorder_level, updated_at
             FROM branch_item
             WHERE branch_id = :branch_id
             ORDER BY branch_item_id ASC
             LIMIT :limit OFFSET :offset';

        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue(':branch_id', $branchId, PDO::PARAM_INT);
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();

        // Return raw DB rows; formatting/assembly is the responsibility of higher-level services
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

}
