<?php

namespace App\Services;

use App\Entities\Item;
use App\Entities\ItemVariant;
use App\Entities\BranchItem;
use App\Entities\Brand;
use App\Entities\Category;
use App\Repositories\ItemRepository;
use App\Repositories\ItemVariantRepository;
use App\Repositories\StockUnitRepository;
use App\Repositories\BranchItemRepository;
use Doctrine\ORM\EntityManagerInterface;
use RuntimeException;

class ItemService
{
    private EntityManagerInterface $em;
    private ItemRepository $itemRepo;
    private ItemVariantRepository $variantRepo;
    private StockUnitRepository $stockUnitRepo;
    private BranchItemRepository $branchItemRepo;

    public function __construct(
        EntityManagerInterface $em,
        ItemRepository $itemRepo,
        ItemVariantRepository $variantRepo,
        StockUnitRepository $stockUnitRepo
    ) {
        $this->em = $em;
        $this->itemRepo = $itemRepo;
        $this->variantRepo = $variantRepo;
        $this->stockUnitRepo = $stockUnitRepo;
        $this->branchItemRepo = $em->getRepository(BranchItem::class);
    }

    public function create(array $data, ?int $userId = null, array $auditContext = []): array
    {
        $this->em->beginTransaction();
        try {
            $item = new Item();
            $item->setName(trim((string)($data['name'] ?? '')));

            if (isset($data['is_serialized'])) {
                $item->setIsSerialized(filter_var($data['is_serialized'], FILTER_VALIDATE_BOOLEAN));
            }

            if (!empty($data['brand_id'])) {
                $brand = $this->em->getReference(Brand::class, (int)$data['brand_id']);
                $item->setBrand($brand);
            }

            if (!empty($data['category_id'])) {
                $category = $this->em->getReference(Category::class, (int)$data['category_id']);
                $item->setCategory($category);
            }

            $imageUrl = $this->handleImageUpload($data['image'] ?? null, $data['image_url'] ?? null);
            $item->setImageUrl($imageUrl);

            $this->em->persist($item);
            $this->em->flush();

            $models = $data['models'] ?? $data['models[]'] ?? [];
            $createdVariants = [];
            if (is_array($models) && !empty($models)) {
                foreach ($models as $idx => $m) {
                    $m = trim((string)$m);
                    if ($m === '') continue;

                    $sku = $data['sku'] ?? $item->getId();
                    if ($sku !== null) {
                        $sku = $sku . '-' . ($idx + 1);
                    }

                    $variant = new ItemVariant($item, $m, (string)$sku);
                    $variant->setIsActive(true);

                    $this->em->persist($variant);
                    $createdVariants[] = [
                        'model' => $m,
                        'sku'   => (string)$sku,
                    ];
                }
                $this->em->flush();
            }

            // Write audit record
            (new AuditLogService($this->em))->record([
                'action'        => 'CREATE',
                'module'        => 'items',
                'employee_id'   => $userId,
                'branch_id'     => $auditContext['branch_id'] ?? null,
                'record_id'     => (string)$item->getId(),
                'old_values'    => null,
                'new_values'    => [
                    'name'          => $item->getName(),
                    'is_serialized' => $item->getIsSerialized(),
                    'brand_id'      => !empty($data['brand_id']) ? (int)$data['brand_id'] : null,
                    'category_id'   => !empty($data['category_id']) ? (int)$data['category_id'] : null,
                    'image_url'     => $imageUrl,
                    'variants'      => $createdVariants,
                ],
                'ip_address'    => $auditContext['ip_address'] ?? null,
                'user_agent'    => $auditContext['user_agent'] ?? null,
            ]);

            $this->em->commit();
            return $this->formatItem($item);
        } catch (\Throwable $e) {
            $this->em->rollback();
            throw $e;
        }
    }

    public function list(int $page = 1, int $perPage = 10, array $filters = [], ?int $branchId = null): array
    {
        $totalItems = $this->itemRepo->countAll($filters);
        $totalPages = $perPage > 0 ? (int)ceil($totalItems / $perPage) : 1;
        $items = $this->itemRepo->findAllWithRelations($page, $perPage, $filters);
        $branchItemsByVariant = [];

        if ($branchId !== null && $branchId > 0 && $items !== []) {
            $branchItems = $this->branchItemRepo->findByItemIdsAndBranch(
                array_map(static fn (Item $item): int => (int) $item->getId(), $items),
                $branchId
            );

            foreach ($branchItems as $branchItem) {
                $branchItemsByVariant[$branchItem->getVariant()->getId()] = $branchItem;
            }
        }

        return [
            'data' => array_map(
                fn (Item $item): array => $this->formatItem($item, $branchItemsByVariant),
                $items
            ),
            'pagination' => [
                'current_page' => $page,
                'per_page'     => $perPage,
                'total_items'  => $totalItems,
                'total_pages'  => $totalPages,
                'has_next'     => $page < $totalPages,
                'has_prev'     => $page > 1,
            ],
            'filters' => [
                'search'        => $filters['search'] ?? null,
                'category_id'   => isset($filters['category_id']) ? (int)$filters['category_id'] : null,
                'brand_id'      => isset($filters['brand_id']) ? (int)$filters['brand_id'] : null,
                'is_serialized' => $filters['is_serialized'] ?? null,
                'sort'          => $filters['sort'] ?? null,
            ],
        ];
    }

    public function update(int $itemId, array $data, ?int $userId = null, array $auditContext = []): ?array
    {
        $item = $this->itemRepo->findByIdWithRelations($itemId);
        if (!$item) {
            return null;
        }

        $oldValues = [
            'name'          => $item->getName(),
            'is_serialized' => $item->getIsSerialized(),
            'brand_id'      => $item->getBrand()?->getId(),
            'category_id'   => $item->getCategory()?->getId(),
            'image_url'     => $item->getImageUrl(),
        ];

        if (array_key_exists('name', $data)) {
            $item->setName(trim((string)$data['name']));
        }

        if (isset($data['is_serialized'])) {
            $item->setIsSerialized(filter_var($data['is_serialized'], FILTER_VALIDATE_BOOLEAN));
        }

        if (array_key_exists('brand_id', $data)) {
            $brand = !empty($data['brand_id']) ? $this->em->getReference(Brand::class, (int)$data['brand_id']) : null;
            $item->setBrand($brand);
        }

        if (array_key_exists('category_id', $data)) {
            $category = !empty($data['category_id']) ? $this->em->getReference(Category::class, (int)$data['category_id']) : null;
            $item->setCategory($category);
        }

        $replacedLocalFile = null;
        if (isset($data['image']) && is_array($data['image'])) {
            $oldUrl = $item->getImageUrl();
            $newUrl = $this->handleImageUpload($data['image'], null);
            $item->setImageUrl($newUrl);

            if ($oldUrl && str_starts_with($oldUrl, '/uploads/items/')) {
                $replacedLocalFile = __DIR__ . '/../../public' . $oldUrl;
            }
        } elseif (array_key_exists('image_url', $data)) {
            $item->setImageUrl($data['image_url']);
        }

        $this->em->flush();

        // Write audit record
        (new AuditLogService($this->em))->record([
            'action'        => 'UPDATE',
            'module'        => 'items',
            'employee_id'   => $userId,
            'branch_id'     => $auditContext['branch_id'] ?? null,
            'record_id'     => (string)$item->getId(),
            'old_values'    => $oldValues,
            'new_values'    => [
                'name'          => $item->getName(),
                'is_serialized' => $item->getIsSerialized(),
                'brand_id'      => $item->getBrand()?->getId(),
                'category_id'   => $item->getCategory()?->getId(),
                'image_url'     => $item->getImageUrl(),
            ],
            'ip_address'    => $auditContext['ip_address'] ?? null,
            'user_agent'    => $auditContext['user_agent'] ?? null,
        ]);

        if ($replacedLocalFile && file_exists($replacedLocalFile)) {
            @unlink($replacedLocalFile);
        }

        return $this->formatItem($item);
    }

    public function getItemBySerial(string $serial): ?array
    {
        $serial = trim($serial);
        if ($serial === '') return null;

        $stockUnit = $this->stockUnitRepo->findOneBySerialNumber($serial);
        if (!$stockUnit) {
            return null;
        }

        $variant = $stockUnit->getVariant();
        $item = $variant ? $variant->getItem() : null;

        return [
            'stock_unit_id' => $stockUnit->getId(),
            'serial_number' => $stockUnit->getSerialNumber(),
            'status'        => $stockUnit->getStatus(),
            'branch_id'     => $stockUnit->getBranch() ? $stockUnit->getBranch()->getId() : null,
            'variant'       => $variant ? [
                'variant_id' => $variant->getId(),
                'item_id'    => $item ? $item->getId() : null,
                'model'      => $variant->getModel(),
                'sku'        => $variant->getSku(),
            ] : null,
            'item'          => $item ? [
                'id'           => $item->getId(),
                'name'         => $item->getName(),
                'imageUrl'     => $this->assetUrl($item->getImageUrl()),
                'model'        => $variant ? $variant->getModel() : null,
                'isSerialized' => (bool)$item->getIsSerialized(),
                'brand'        => $item->getBrand() ? [
                    'id'   => $item->getBrand()->getId(),
                    'name' => $item->getBrand()->getName()
                ] : null,
                'category'     => $item->getCategory() ? [
                    'id'   => $item->getCategory()->getId(),
                    'name' => $item->getCategory()->getName()
                ] : null,
            ] : null,
        ];
    }

    private function formatItem(Item $item, array $branchItemsByVariant = []): array
    {
        $variants = [];
        $models = [];
        foreach ($item->getVariants() as $variant) {
            $models[] = $variant->getModel();
            $branchItem = $branchItemsByVariant[$variant->getId()] ?? null;
            $variants[] = [
                'variant_id' => $variant->getId(),
                'model'      => $variant->getModel(),
                'sku'        => $variant->getSku(),
                'image_url'  => $this->assetUrl($variant->getImageUrl()),
                'is_active'  => $variant->isActive(),
                'branch_item_id' => $branchItem?->getId(),
                'branch_configuration' => $branchItem ? [
                    'branch_id' => $branchItem->getBranch()->getId(),
                    'branch' => [
                        'id' => $branchItem->getBranch()->getId(),
                        'location' => $branchItem->getBranch()->getLocation(),
                    ],
                    'price' => $branchItem->getPrice(),
                    'reorder_level' => $branchItem->getReorderLevel(),
                    'updated_at' => $branchItem->getUpdatedAt()?->format('c'),
                ] : null,
            ];
        }

        return [
            'id'           => $item->getId(),
            'name'         => $item->getName(),
            'imageUrl'     => $this->assetUrl($item->getImageUrl()),
            'category'     => $item->getCategory() ? [
                'id'   => $item->getCategory()->getId(),
                'name' => $item->getCategory()->getName()
            ] : null,
            'brand'        => $item->getBrand() ? [
                'id'   => $item->getBrand()->getId(),
                'name' => $item->getBrand()->getName()
            ] : null,
            'model'        => $models,
            'variants'     => $variants,
            'isSerialized' => (bool)$item->getIsSerialized(),
        ];
    }

    private function handleImageUpload(?array $file, ?string $fallbackUrl): ?string
    {
        if (isset($file['tmp_name']) && ($file['error'] ?? null) === UPLOAD_ERR_OK) {
            $uploadDir = __DIR__ . '/../../public/uploads/items/';
            if (!is_dir($uploadDir)) {
                mkdir($uploadDir, 0777, true);
            }
            $filename = uniqid('item_', true) . '_' . basename($file['name']);
            $targetPath = $uploadDir . $filename;
            $srcTmp = $file['tmp_name'];

            if (is_uploaded_file($srcTmp) && move_uploaded_file($srcTmp, $targetPath)) {
                return '/uploads/items/' . $filename;
            } elseif (file_exists($srcTmp) && (@rename($srcTmp, $targetPath) || @copy($srcTmp, $targetPath))) {
                @unlink($srcTmp);
                return '/uploads/items/' . $filename;
            }
            throw new RuntimeException('Failed to upload image.');
        }

        return $fallbackUrl;
    }

    public function assetUrl(?string $path): ?string
    {
        if ($path === null || $path === '') return null;
        if (preg_match('#^https?://#i', $path)) return $path;
        return $path[0] === '/' ? $path : '/' . $path;
    }
}