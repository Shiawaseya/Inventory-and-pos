<?php

namespace App\Models;

use PDO;

class ItemVariant extends BaseModel
{

    public function findById(int $variantId): ?array
    {
        $stmt = $this->pdo->prepare('SELECT variant_id, item_id, model, sku, image_url, is_active, created_at FROM item_variants WHERE variant_id = :variant_id LIMIT 1');
        $stmt->execute([':variant_id' => $variantId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ? [
            'variant_id' => (int)$row['variant_id'],
            'item_id' => (int)$row['item_id'],
            'model' => $row['model'] ?? null,
            'sku' => $row['sku'] ?? null,
            'image_url' => $row['image_url'] ?? null,
            'is_active' => isset($row['is_active']) ? (bool)$row['is_active'] : true,
            'created_at' => $row['created_at'] ?? null,
        ] : null;
    }

    public function create(array $data): array
    {
        $stmt = $this->pdo->prepare(
            'INSERT INTO item_variants (item_id, model, sku, image_url, is_active)
             VALUES (:item_id, :model, :sku, :image_url, :is_active)'
        );

        $stmt->execute([
            ':item_id' => isset($data['item_id']) ? (int)$data['item_id'] : null,
            ':model' => $data['model'] ?? null,
            ':sku' => $data['sku'] ?? null,
            ':image_url' => $data['image_url'] ?? null,
            ':is_active' => isset($data['is_active']) ? (int)$data['is_active'] : 1,
        ]);

        $id = (int)$this->pdo->lastInsertId();
        return $this->findById($id);
    }

    public function findByItemId(int $itemId): array
    {
        $stmt = $this->pdo->prepare('SELECT variant_id, item_id, model, sku, image_url, is_active FROM item_variants WHERE item_id = :item_id ORDER BY variant_id ASC');
        $stmt->execute([':item_id' => $itemId]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $result = [];
        foreach ($rows as $row) {
            $result[] = [
                'variant_id' => (int)$row['variant_id'],
                'item_id' => (int)$row['item_id'],
                'model' => $row['model'] ?? null,
                'sku' => $row['sku'] ?? null,
                'image_url' => $row['image_url'] ?? null,
                'is_active' => isset($row['is_active']) ? (bool)$row['is_active'] : true,
            ];
        }
        return $result;
    }

}
