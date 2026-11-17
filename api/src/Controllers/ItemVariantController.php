<?php

namespace App\Controllers;

use App\Entities\ItemVariant;
use App\Pagination\PaginationMetaDataFactory;
use App\Services\ItemVariantService;
use Doctrine\DBAL\Exception\UniqueConstraintViolationException;

class ItemVariantController
{
    private static function attachAuditContext(array $request, array &$data): void
    {
        $employeeId = (int) (
            $request['user']['employeeId']
            ?? $request['user']['employee_id']
            ?? $request['employeeId']
            ?? 0
        );

        $branchId = (int) (
            $request['user']['branchId']
            ?? $request['user']['branch_id']
            ?? $request['branchId']
            ?? 0
        );

        $data['employee_id'] = $employeeId > 0 ? $employeeId : null;
        $data['branch_id'] = $branchId > 0 ? $branchId : null;
        $data['_audit'] = [
            'ip_address' => $_SERVER['REMOTE_ADDR'] ?? null,
            'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? null,
        ];
    }

    public static function create(array $request): array
    {
        try {
            $input = $request['body'] ?? [];
            if (!empty($request['files']['image'])) {
                $input['image'] = $request['files']['image'];
            }
            self::attachAuditContext($request, $input);

            $variant = (new ItemVariantService())->create($input);
            return ['status' => 201, 'body' => [
                'success' => true,
                'message' => 'Variant created',
                'data' => self::serialize($variant),
            ]];
        } catch (\InvalidArgumentException $exception) {
            return self::fail(400, $exception->getMessage());
        } catch (UniqueConstraintViolationException $exception) {
            return self::duplicateModel();
        } catch (\Throwable $exception) {
            return self::serverError($exception);
        }
    }

    public static function show(array $request): array
    {
        try {
            $id = (int) (($request['params'] ?? [])[0] ?? 0);
            $variant = $id > 0 ? (new ItemVariantService())->findById($id) : null;
            if (!$variant) {
                return self::fail(404, 'Variant not found');
            }

            return ['status' => 200, 'body' => ['success' => true, 'data' => self::serialize($variant)]];
        } catch (\Throwable $exception) {
            return self::serverError($exception);
        }
    }

    public static function listByItem(array $request): array
    {
        try {
            $itemId = (int) (($request['params'] ?? [])[0] ?? 0);
            if ($itemId <= 0) {
                return self::fail(400, 'Valid item_id is required');
            }

            $query = $request['query'] ?? [];
            $page = max(1, (int) ($query['page'] ?? 1));
            $perPage = min(100, max(1, (int) ($query['per_page'] ?? 10)));
            $filters = array_filter([
                'search' => $query['search'] ?? null,
                'model' => $query['model'] ?? null,
                'sku' => $query['sku'] ?? null,
                'is_active' => $query['is_active'] ?? null,
                'sort' => $query['sort'] ?? null,
                'direction' => $query['direction'] ?? null,
            ], fn($value) => $value !== null && $value !== '');

            $service = new ItemVariantService();
            $total = $service->countByItem($itemId, $filters);
            $variants = $service->findByItem($itemId, $page, $perPage, $filters);
            $pagination = PaginationMetaDataFactory::create($request, $total);

            return ['status' => 200, 'body' => [
                'success' => true,
                'data' => array_map([self::class, 'serialize'], $variants),
                'links' => $pagination->links,
                'pagination' => $pagination->metadata,
            ]];
        } catch (\Throwable $exception) {
            return self::serverError($exception);
        }
    }

    public static function update(array $request): array
    {
        try {
            $id = (int) (($request['params'] ?? [])[0] ?? 0);
            $input = $request['body'] ?? [];
            if (!empty($request['files']['image'])) {
                $input['image'] = $request['files']['image'];
            }
            self::attachAuditContext($request, $input);

            $variant = $id > 0 ? (new ItemVariantService())->update($id, $input) : null;
            if (!$variant) {
                return self::fail(404, 'Variant not found');
            }

            return ['status' => 200, 'body' => [
                'success' => true,
                'message' => 'Variant updated',
                'data' => self::serialize($variant),
            ]];
        } catch (\InvalidArgumentException $exception) {
            return self::fail(400, $exception->getMessage());
        } catch (UniqueConstraintViolationException $exception) {
            return self::duplicateModel();
        } catch (\Throwable $exception) {
            return self::serverError($exception);
        }
    }

    public static function delete(array $request): array
    {
        try {
            $id = (int) (($request['params'] ?? [])[0] ?? 0);
            $auditContext = [];
            self::attachAuditContext($request, $auditContext);

            if ($id <= 0 || !(new ItemVariantService())->delete($id, $auditContext)) {
                return self::fail(404, 'Variant not found');
            }

            return ['status' => 200, 'body' => ['success' => true, 'message' => 'Variant deleted']];
        } catch (\Throwable $exception) {
            return self::serverError($exception);
        }
    }

    private static function serialize(ItemVariant $variant): array
    {
        return [
            'variant_id' => $variant->getId(),
            'item_id' => $variant->getItem()->getId(),
            'model' => $variant->getModel(),
            'sku' => $variant->getSku(),
            'initial_serial_number' => $variant->getInitialSerialNumber(),
            'image_url' => self::assetUrl($variant->getImageUrl()),
            'is_active' => $variant->isActive(),
            'created_at' => $variant->getCreatedAt()?->format(DATE_ATOM),
        ];
    }

    private static function assetUrl(?string $path): ?string
    {
        if ($path === null || $path === '') {
            return null;
        }
        if (preg_match('#^https?://#i', $path)) {
            return $path;
        }
        $basePath = rtrim(dirname($_SERVER['SCRIPT_NAME'] ?? '/inventory_management_api/index.php'), '/\\');
        if (str_ends_with($basePath, '/public')) {
            $basePath = substr($basePath, 0, -7);
        }
        return $basePath . '/' . ltrim($path, '/');
    }

    private static function fail(int $status, string $message): array
    {
        return ['status' => $status, 'body' => ['success' => false, 'message' => $message]];
    }

    private static function duplicateModel(): array
    {
        return self::fail(409, 'This item already has a variant with that model name');
    }

    private static function serverError(\Throwable $exception): array
    {
        error_log('ItemVariantController error: ' . $exception->getMessage());

        return ['status' => 500, 'body' => [
            'success' => false,
            'message' => 'Server error',
            'error' => defined('APP_DEBUG') && APP_DEBUG ? $exception->getMessage() : 'SERVER_ERROR',
        ]];
    }
}