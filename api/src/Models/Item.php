<?php

namespace App\Models;

use PDO;

class Item extends BaseModel
{

    public function create(array $data): array
    {
        $imageUrl = null;
        if (isset($data['image']) && is_array($data['image']) && isset($data['image']['tmp_name']) && $data['image']['error'] === UPLOAD_ERR_OK) {
            $uploadDir = __DIR__ . '/../../public/uploads/items/';
            if (!is_dir($uploadDir)) {
                mkdir($uploadDir, 0777, true);
            }
            $filename = uniqid('item_', true) . '_' . basename($data['image']['name']);
            $targetPath = $uploadDir . $filename;
            $srcTmp = $data['image']['tmp_name'];
            $moved = false;
            // Prefer move_uploaded_file when possible (real HTTP uploads)
            if (is_uploaded_file($srcTmp) && move_uploaded_file($srcTmp, $targetPath)) {
                $moved = true;
            } elseif (file_exists($srcTmp)) {
                // Fallback for temp files created by custom parsers: try rename then copy
                if (@rename($srcTmp, $targetPath)) {
                    $moved = true;
                } elseif (@copy($srcTmp, $targetPath)) {
                    @unlink($srcTmp);
                    $moved = true;
                }
            }

            if ($moved) {
                $imageUrl = '/uploads/items/' . $filename;
            } else {
                throw new \RuntimeException('Failed to upload image.');
            }
        } elseif (isset($data['image_url'])) {
            $imageUrl = $data['image_url'];
        }

        $stmt = $this->pdo->prepare(
            'INSERT INTO items (name, brand_id, image_url, category_id, is_serialized, created_by, updated_by)
             VALUES (:name, :brand_id, :image_url, :category_id, :is_serialized, :created_by, :updated_by)'
        );
        $stmt->execute([
            ':name' => $data['name'] ?? null,
            ':brand_id' => isset($data['brand_id']) && $data['brand_id'] !== '' ? (int)$data['brand_id'] : null,
            ':image_url' => $imageUrl,
            ':category_id' => isset($data['category_id']) && $data['category_id'] !== '' ? (int)$data['category_id'] : null,
            ':is_serialized' => isset($data['is_serialized']) ? (int)$data['is_serialized'] : null,
            ':created_by' => isset($data['created_by']) && $data['created_by'] !== '' ? (int)$data['created_by'] : null,
            ':updated_by' => isset($data['updated_by']) && $data['updated_by'] !== '' ? (int)$data['updated_by'] : null,
        ]);

        return $this->findById((int)$this->pdo->lastInsertId());
    }

    public function findById(int $itemId): ?array
    {
        $stmt = $this->pdo->prepare(
            'SELECT item_id, name, brand_id, image_url, created_at, updated_at, category_id, is_serialized, created_by, updated_by
             FROM items
             WHERE item_id = :item_id
             LIMIT 1'
        );
        $stmt->execute([':item_id' => $itemId]);

        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        return $row ? [
            'item_id' => (int)$row['item_id'],
            'name' => $row['name'],
            'brand_id' => $row['brand_id'] !== null ? (int)$row['brand_id'] : null,
            'image_url' => $row['image_url'],
            'created_at' => $row['created_at'],
            'updated_at' => $row['updated_at'],
            'category_id' => $row['category_id'] !== null ? (int)$row['category_id'] : null,
            'is_serialized' => $row['is_serialized'] !== null ? (int)$row['is_serialized'] : null,
            'created_by' => $row['created_by'] !== null ? (int)$row['created_by'] : null,
            'updated_by' => $row['updated_by'] !== null ? (int)$row['updated_by'] : null,
        ] : null;
    }

    /**
     * Update an item. Updates name, brand_id, category_id and image.
     * Returns the updated item or null if not found.
     */
    public function update(int $itemId, array $data): ?array
    {
        $existing = $this->findById($itemId);
        if (!$existing) {
            return null;
        }

        $imageUrl = $existing['image_url'] ?? null;

        $replacedLocalFile = null;
        if (isset($data['image']) && is_array($data['image']) && isset($data['image']['tmp_name']) && $data['image']['error'] === UPLOAD_ERR_OK) {
            $uploadDir = __DIR__ . '/../../public/uploads/items/';
            if (!is_dir($uploadDir)) {
                mkdir($uploadDir, 0777, true);
            }
            $filename = uniqid('item_', true) . '_' . basename($data['image']['name']);
            $targetPath = $uploadDir . $filename;
            $srcTmp = $data['image']['tmp_name'];
            $moved = false;
            if (is_uploaded_file($srcTmp) && move_uploaded_file($srcTmp, $targetPath)) {
                $moved = true;
            } elseif (file_exists($srcTmp)) {
                if (@rename($srcTmp, $targetPath)) {
                    $moved = true;
                } elseif (@copy($srcTmp, $targetPath)) {
                    @unlink($srcTmp);
                    $moved = true;
                }
            }

            if ($moved) {
                $imageUrl = '/uploads/items/' . $filename;
                // if existing image is a local stored path, schedule it for deletion
                if (!empty($existing['image_url']) && strpos($existing['image_url'], '/uploads/items/') === 0) {
                    $replacedLocalFile = __DIR__ . '/../../public' . $existing['image_url'];
                }
            } else {
                throw new \RuntimeException('Failed to upload image.');
            }
        } elseif (isset($data['image_url'])) {
            $imageUrl = $data['image_url'];
        }

        $stmt = $this->pdo->prepare(
            'UPDATE items
             SET name = :name,
                 brand_id = :brand_id,
                 category_id = :category_id,
                 image_url = :image_url,
                 updated_by = :updated_by,
                 updated_at = NOW()
             WHERE item_id = :item_id'
        );

        $stmt->execute([
            ':name' => $data['name'] ?? $existing['name'] ?? null,
            ':brand_id' => isset($data['brand_id']) && $data['brand_id'] !== '' ? (int)$data['brand_id'] : null,
            ':category_id' => isset($data['category_id']) && $data['category_id'] !== '' ? (int)$data['category_id'] : null,
            ':image_url' => $imageUrl,
            ':updated_by' => isset($data['updated_by']) && $data['updated_by'] !== '' ? (int)$data['updated_by'] : null,
            ':item_id' => $itemId,
        ]);

        // Remove replaced local file after successful DB update
        if ($replacedLocalFile !== null && is_file($replacedLocalFile)) {
            @unlink($replacedLocalFile);
        }

        return $this->findById($itemId);
    }

    /**
     * Return item shaped for API/TypeScript client.
     *
     * Shape:
     * {
     *   id: number,
     *   name: string,
     *   imageUrl: string|null,
     *   category: { id: number, name: string } | null,
     *   brand: { id: number, name: string } | null,
     *   model: string|null,
     *   isSerialized: boolean
     * }
     */
    public function list(int $limit = 100, int $offset = 0): array
    {
        $sql =
            'SELECT i.item_id, i.name AS item_name, i.image_url, i.is_serialized,
                    b.brand_id, b.name AS brand_name,
                    c.category_id, c.name AS category_name
             FROM items i
             LEFT JOIN brands b ON i.brand_id = b.brand_id
             LEFT JOIN categories c ON i.category_id = c.category_id
             ORDER BY i.name ASC
             LIMIT :limit OFFSET :offset';

        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue(':limit', (int)$limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', (int)$offset, PDO::PARAM_INT);
        $stmt->execute();

        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $result = [];

        foreach ($rows as $row) {
            $brand = null;
            if (!empty($row['brand_id'])) {
                $brand = [
                    'id' => (int)$row['brand_id'],
                    'name' => $row['brand_name'] ?? null,
                ];
            }

            $category = null;
            if (!empty($row['category_id'])) {
                $category = [
                    'id' => (int)$row['category_id'],
                    'name' => $row['category_name'] ?? null,
                ];
            }

            $result[] = [
                'id' => (int)$row['item_id'],
                'name' => $row['item_name'],
                'imageUrl' => $this->assetUrl($row['image_url'] ?? null),
                'category' => $category,
                'brand' => $brand,
                'isSerialized' => isset($row['is_serialized']) ? (bool)$row['is_serialized'] : false,
            ];
        }

        return $result;
    }


    /**
     * Return the stored asset path for the client.
     * External URLs are preserved unchanged.
     */
    public function assetUrl(?string $path): ?string
    {
        if ($path === null || $path === '') {
            return null;
        }

        // If already absolute URL, return as-is
        if (preg_match('#^https?://#i', $path)) {
            return $path;
        }

        if ($path[0] !== '/') {
            $path = '/' . $path;
        }

        return $path;
    }
}
