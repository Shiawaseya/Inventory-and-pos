<?php

namespace App\Services;

use App\Database\DatabaseManager;
use App\Entities\Item;
use App\Entities\ItemVariant;
use App\Repositories\ItemVariantRepository;
use Doctrine\ORM\EntityManager;

class ItemVariantService
{
    private const UPLOAD_URL_PREFIX = '/uploads/item_variant/';
    private const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5MB
    private const ALLOWED_IMAGE_TYPES = [
        'image/jpeg' => 'jpg',
        'image/png' => 'png',
        'image/webp' => 'webp',
        'image/gif' => 'gif',
    ];

    private EntityManager $entityManager;
    private ItemVariantRepository $repository;

    public function __construct(?EntityManager $entityManager = null)
    {
        $this->entityManager = $entityManager ?? DatabaseManager::getEntityManager();
        $this->repository = $this->entityManager->getRepository(ItemVariant::class);
    }

    public function create(array $data): ItemVariant
    {
        $itemId = (int) ($data['item_id'] ?? 0);
        if ($itemId <= 0) {
            throw new \InvalidArgumentException('Valid item_id is required');
        }

        $item = $this->entityManager->find(Item::class, $itemId);
        if (!$item) {
            throw new \InvalidArgumentException('Item not found');
        }

        $imageUrl = $this->resolveImageUrl($data['image'] ?? null, $data['image_url'] ?? null);

        try {
            return $this->entityManager->wrapInTransaction(function () use ($item, $data, $imageUrl) {
                $variant = new ItemVariant(
                    $item,
                    $data['model'] ?? null,
                    $data['sku'] ?? null
                );
                $variant->setImageUrl($imageUrl);
                if (array_key_exists('is_active', $data)) {
                    $variant->setIsActive(filter_var($data['is_active'], FILTER_VALIDATE_BOOLEAN));
                }

                $this->entityManager->persist($variant);
                $this->entityManager->flush();

                (new AuditLogService($this->entityManager))->record([
                    'action' => 'CREATE',
                    'module' => 'item_variants',
                    'employee_id' => $data['employee_id'] ?? null,
                    'branch_id' => $data['branch_id'] ?? null,
                    'record_id' => $variant->getId(),
                    'old_values' => null,
                    'new_values' => [
                        'item_id' => $item->getId(),
                        'model' => $variant->getModel(),
                        'sku' => $variant->getSku(),
                        'image_url' => $variant->getImageUrl(),
                        'is_active' => $variant->isActive(),
                    ],
                    'ip_address' => $data['_audit']['ip_address'] ?? null,
                    'user_agent' => $data['_audit']['user_agent'] ?? null,
                ]);

                return $variant;
            });
        } catch (\Throwable $exception) {
            if ($imageUrl !== null) {
                $this->deleteUploadedFile($imageUrl);
            }
            throw $exception;
        }
    }

    public function findById(int $id): ?ItemVariant
    {
        return $this->entityManager->find(ItemVariant::class, $id);
    }

    public function update(int $id, array $data): ?ItemVariant
    {
        $variant = $this->findById($id);
        if (!$variant) {
            return null;
        }

        $model = null;
        $sku = null;
        if (array_key_exists('model', $data)) {
            $model = trim((string) $data['model']);
            if ($model === '') {
                throw new \InvalidArgumentException('Model is required');
            }
            if (mb_strlen($model) > 255) {
                throw new \InvalidArgumentException('Model must be 255 characters or fewer');
            }
        }
        if (array_key_exists('sku', $data)) {
            $sku = trim((string) $data['sku']);
            if ($sku === '') {
                throw new \InvalidArgumentException('SKU is required');
            }
            if (mb_strlen($sku) > 100) {
                throw new \InvalidArgumentException('SKU must be 100 characters or fewer');
            }
        }
        $initialSerialNumber = null;
        if (array_key_exists('initial_serial_number', $data)) {
            $initialSerialNumber = trim((string) $data['initial_serial_number']);
            if ($initialSerialNumber === '') {
                $initialSerialNumber = null;
            } elseif (mb_strlen($initialSerialNumber) > 100) {
                throw new \InvalidArgumentException('Initial serial number must be 100 characters or fewer');
            }
        }

        $previousImage = $variant->getImageUrl();
        $newImage = null;
        $file = $data['image'] ?? null;
        $imageUrl = $data['image_url'] ?? null;

        if ($this->hasUpload($file)) {
            $newImage = $this->storeUploadedImage($file);
        }

        $oldValues = [
            'model' => $variant->getModel(),
            'sku' => $variant->getSku(),
            'initial_serial_number' => $variant->getInitialSerialNumber(),
            'image_url' => $variant->getImageUrl(),
            'is_active' => $variant->isActive(),
        ];

        try {
            return $this->entityManager->wrapInTransaction(function () use (
                $variant,
                $model,
                $sku,
                $data,
                $newImage,
                $imageUrl,
                $initialSerialNumber,
                $oldValues,
                $previousImage
            ) {
                if ($model !== null) {
                    $variant->setModel($model);
                }
                if ($sku !== null) {
                    $variant->setSku($sku);
                }
                if (array_key_exists('initial_serial_number', $data)) {
                    $variant->setInitialSerialNumber($initialSerialNumber);
                }
                if (array_key_exists('is_active', $data)) {
                    $variant->setIsActive(filter_var($data['is_active'], FILTER_VALIDATE_BOOLEAN));
                }
                if ($newImage !== null) {
                    $variant->setImageUrl($newImage);
                } elseif (is_string($imageUrl) && $imageUrl !== '') {
                    $variant->setImageUrl($imageUrl);
                }

                $this->entityManager->flush();

                (new AuditLogService($this->entityManager))->record([
                    'action' => 'UPDATE',
                    'module' => 'item_variants',
                    'employee_id' => $data['employee_id'] ?? null,
                    'branch_id' => $data['branch_id'] ?? null,
                    'record_id' => $variant->getId(),
                    'old_values' => $oldValues,
                    'new_values' => [
                        'model' => $variant->getModel(),
                        'sku' => $variant->getSku(),
                        'initial_serial_number' => $variant->getInitialSerialNumber(),
                        'image_url' => $variant->getImageUrl(),
                        'is_active' => $variant->isActive(),
                    ],
                    'ip_address' => $data['_audit']['ip_address'] ?? null,
                    'user_agent' => $data['_audit']['user_agent'] ?? null,
                ]);

                if ($newImage !== null && $previousImage !== null && $previousImage !== $newImage) {
                    $this->deleteUploadedFile($previousImage);
                }

                return $variant;
            });
        } catch (\Throwable $exception) {
            if ($newImage !== null) {
                $this->deleteUploadedFile($newImage);
            }
            throw $exception;
        }
    }

    public function delete(int $id, array $auditContext = []): bool
    {
        $variant = $this->findById($id);
        if (!$variant) {
            return false;
        }

        $oldValues = [
            'item_id' => $variant->getItem()->getId(),
            'model' => $variant->getModel(),
            'sku' => $variant->getSku(),
            'image_url' => $variant->getImageUrl(),
            'is_active' => $variant->isActive(),
        ];
        $imageUrl = $variant->getImageUrl();

        return $this->entityManager->wrapInTransaction(function () use ($variant, $id, $oldValues, $imageUrl, $auditContext) {
            (new AuditLogService($this->entityManager))->record([
                'action' => 'DELETE',
                'module' => 'item_variants',
                'employee_id' => $auditContext['employee_id'] ?? null,
                'branch_id' => $auditContext['branch_id'] ?? null,
                'record_id' => $id,
                'old_values' => $oldValues,
                'new_values' => null,
                'ip_address' => $auditContext['_audit']['ip_address'] ?? null,
                'user_agent' => $auditContext['_audit']['user_agent'] ?? null,
            ]);

            $this->entityManager->remove($variant);
            $this->entityManager->flush();

            if ($imageUrl !== null) {
                $this->deleteUploadedFile($imageUrl);
            }

            return true;
        });
    }

    /** @return ItemVariant[] */
    public function findByItem(int $itemId, int $page, int $perPage, array $filters = []): array
    {
        return $this->repository->findByItem($itemId, $page, $perPage, $filters);
    }

    public function countByItem(int $itemId, array $filters = []): int
    {
        return $this->repository->countByItem($itemId, $filters);
    }

    private function resolveImageUrl($file, ?string $imageUrl): ?string
    {
        if ($this->hasUpload($file)) {
            return $this->storeUploadedImage($file);
        }

        return $imageUrl ?: null;
    }

    private function hasUpload($file): bool
    {
        return is_array($file) && ($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_NO_FILE;
    }

    private function uploadDir(): string
    {
        return __DIR__ . '/../../public' . self::UPLOAD_URL_PREFIX;
    }

    private function storeUploadedImage(array $file): string
    {
        if (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
            throw new \InvalidArgumentException('Image upload failed. Please try again.');
        }

        $temporaryPath = (string) ($file['tmp_name'] ?? '');
        if ($temporaryPath === '' || !is_file($temporaryPath)) {
            throw new \InvalidArgumentException('Image upload failed. Please try again.');
        }

        if (filesize($temporaryPath) > self::MAX_IMAGE_BYTES) {
            throw new \InvalidArgumentException('Variant image must be 5MB or smaller');
        }

        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        $mime = $finfo ? finfo_file($finfo, $temporaryPath) : false;
        if ($finfo) {
            finfo_close($finfo);
        }
        if (!is_string($mime) || !isset(self::ALLOWED_IMAGE_TYPES[$mime])) {
            throw new \InvalidArgumentException('Variant image must be JPG, PNG, WEBP, or GIF');
        }

        $uploadDir = $this->uploadDir();
        if (!is_dir($uploadDir) && !mkdir($uploadDir, 0775, true) && !is_dir($uploadDir)) {
            throw new \RuntimeException('Unable to create variant upload directory');
        }

        $filename = uniqid('variant_', true) . '.' . self::ALLOWED_IMAGE_TYPES[$mime];
        $targetPath = $uploadDir . $filename;
        $moved = is_uploaded_file($temporaryPath)
            ? move_uploaded_file($temporaryPath, $targetPath)
            : (@rename($temporaryPath, $targetPath) || @copy($temporaryPath, $targetPath));

        if (!$moved) {
            throw new \RuntimeException('Failed to upload variant image');
        }

        return self::UPLOAD_URL_PREFIX . $filename;
    }

    private function deleteUploadedFile(string $imageUrl): void
    {
        if (!str_starts_with($imageUrl, self::UPLOAD_URL_PREFIX)) {
            return;
        }
        $path = $this->uploadDir() . basename($imageUrl);
        if (is_file($path)) {
            @unlink($path);
        }
    }
}