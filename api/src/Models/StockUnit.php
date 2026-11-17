<?php

namespace App\Models;

use PDO;

class StockUnit extends BaseModel
{

    public function create(array $data): array
    {
        $stmt = $this->pdo->prepare(
            'INSERT INTO stock_unit (serial_number, status, variant_id, branch_id)
             VALUES (:serial_number, :status, :variant_id, :branch_id)'
        );

        $stmt->execute([
            ':serial_number' => $data['serial_number'] ?? null,
            ':status' => $data['status'] ?? 'available',
            ':variant_id' => isset($data['variant_id']) ? (int)$data['variant_id'] : null,
            ':branch_id' => isset($data['branch_id']) ? (int)$data['branch_id'] : null,
        ]);

        return $this->findById((int)$this->pdo->lastInsertId());
    }

    public function findById(int $id): ?array
    {
        $stmt = $this->pdo->prepare('SELECT stock_unit_id, serial_number, status, variant_id, branch_id FROM stock_unit WHERE stock_unit_id = :id LIMIT 1');
        $stmt->execute([':id' => $id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ? [
            'stock_unit_id' => (int)$row['stock_unit_id'],
            'serial_number' => $row['serial_number'],
            'status' => $row['status'],
            'variant_id' => $row['variant_id'] !== null ? (int)$row['variant_id'] : null,
            'branch_id' => $row['branch_id'] !== null ? (int)$row['branch_id'] : null,
        ] : null;
    }

    public function findBySerial(string $serial): ?array
    {
        $stmt = $this->pdo->prepare('SELECT stock_unit_id, serial_number, status, variant_id, branch_id FROM stock_unit WHERE serial_number = :serial LIMIT 1');
        $stmt->execute([':serial' => $serial]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ? [
            'stock_unit_id' => (int)$row['stock_unit_id'],
            'serial_number' => $row['serial_number'],
            'status' => $row['status'],
            'variant_id' => $row['variant_id'] !== null ? (int)$row['variant_id'] : null,
            'branch_id' => $row['branch_id'] !== null ? (int)$row['branch_id'] : null,
        ] : null;
    }

    public function findVariantBySerial(string $serial): ?array
    {
        $stmt = $this->pdo->prepare(
            'SELECT
                su.stock_unit_id,
                su.serial_number,
                su.status,
                su.branch_id,
                iv.variant_id,
                iv.item_id,
                iv.model,
                iv.sku,
                iv.image_url AS variant_image_url,
                bi.branch_item_id,
                bi.price,
                i.name AS item_name,
                i.image_url AS item_image_url,
                i.is_serialized
             FROM stock_unit su
             INNER JOIN item_variants iv ON iv.variant_id = su.variant_id
             INNER JOIN items i ON i.item_id = iv.item_id
             LEFT JOIN branch_item bi
                ON bi.variant_id = iv.variant_id
               AND bi.branch_id = su.branch_id
             WHERE su.serial_number = :serial
             LIMIT 1'
        );
        $stmt->execute([':serial' => $serial]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        return $row ? [
            'stock_unit_id' => (int)$row['stock_unit_id'],
            'serial_number' => $row['serial_number'],
            'status' => $row['status'],
            'branch_id' => (int)$row['branch_id'],
            'variant_id' => (int)$row['variant_id'],
            'branch_item_id' => $row['branch_item_id'] !== null ? (int)$row['branch_item_id'] : null,
            'item_id' => (int)$row['item_id'],
            'model' => $row['model'],
            'sku' => $row['sku'],
            'image_url' => $row['variant_image_url'] ?? $row['item_image_url'],
            'price' => $row['price'] !== null ? (float)$row['price'] : null,
            'is_serialized' => (bool)$row['is_serialized'],
            'item' => [
                'name' => $row['item_name'],
                'image_url' => $row['item_image_url'],
            ],
        ] : null;
    }

    public function listByVariantAndBranch(int $variantId, int $branchId, int $limit = 100, int $offset = 0): array
    {
        $stmt = $this->pdo->prepare('SELECT stock_unit_id, serial_number, status, variant_id, branch_id FROM stock_unit WHERE variant_id = :variant_id AND branch_id = :branch_id ORDER BY serial_number ASC LIMIT :limit OFFSET :offset');
        $stmt->bindValue(':variant_id', $variantId, PDO::PARAM_INT);
        $stmt->bindValue(':branch_id', $branchId, PDO::PARAM_INT);
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();

        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        return array_map(function ($row) {
            return [
                'stock_unit_id' => (int)$row['stock_unit_id'],
                'serial_number' => $row['serial_number'],
                'status' => $row['status'],
                'variant_id' => $row['variant_id'] !== null ? (int)$row['variant_id'] : null,
                'branch_id' => $row['branch_id'] !== null ? (int)$row['branch_id'] : null,
            ];
        }, $rows);
    }

    public function countByStatus(int $variantId, int $branchId): array
    {
        $stmt = $this->pdo->prepare('SELECT status, COUNT(*) AS cnt FROM stock_unit WHERE variant_id = :variant_id AND branch_id = :branch_id GROUP BY status');
        $stmt->execute([':variant_id' => $variantId, ':branch_id' => $branchId]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $result = [
            'available' => 0,
            'under_inspection' => 0,
            'sold' => 0,
            'reserved' => 0,
            'damaged' => 0,
            'returned' => 0,
        ];
        foreach ($rows as $r) {
            $status = $r['status'];
            $result[$status] = isset($r['cnt']) ? (int)$r['cnt'] : 0;
        }
        return $result;
    }

}
