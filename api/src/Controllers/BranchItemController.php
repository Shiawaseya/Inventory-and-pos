<?php

namespace App\Controllers;

use App\Pagination\PaginationMetaDataFactory;
use App\Services\BranchItemMovementService;
use App\Services\BranchItemService;

class BranchItemController
{
    public function create(array $request): array
    {
        try {
            $input = $request['body'] ?? [];
            $user = $request['user'] ?? null;
            $input['branch_id'] = $input['branch_id'] ?? ($user['branchId'] ?? $user['branch_id'] ?? null);
            $input['_audit'] = $request['_audit'] ?? [
                'ip_address' => $_SERVER['REMOTE_ADDR'] ?? null,
                'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? null,
            ];
            
            $service = new BranchItemService();
            $branchItem = $service->create($input, $user);

            return [
                'status' => 201,
                'body' => [
                    'success' => true,
                    'data' => $this->transformItem($branchItem, $service),
                ],
            ];
        } catch (\InvalidArgumentException $e) {
            return ['status' => 400, 'body' => ['success' => false, 'message' => $e->getMessage()]];
        } catch (\Throwable $e) {
            return [
                'status' => 500,
                'body' => [
                    'success' => false,
                    'message' => 'Database error',
                    'error' => defined('APP_DEBUG') && APP_DEBUG ? $e->getMessage() : 'DATABASE_ERROR',
                ],
            ];
        }
    }

    public function update(array $request): array
    {
        try {
            $id = (int) ($request['params'][0] ?? 0);
            if ($id <= 0) {
                return ['status' => 400, 'body' => ['success' => false, 'message' => 'Invalid ID']];
            }

            $input = $request['body'] ?? [];
            $user = $request['user'] ?? null;
            $input['_audit'] = $request['_audit'] ?? [
                'ip_address' => $_SERVER['REMOTE_ADDR'] ?? null,
                'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? null,
            ];

            $service = new BranchItemService();
            $updated = $service->update($id, $input, $user);

            if (!$updated) {
                return ['status' => 404, 'body' => ['success' => false, 'message' => 'Branch item not found']];
            }

            return [
                'status' => 200,
                'body' => [
                    'success' => true,
                    'data' => $this->transformItem($updated, $service),
                ],
            ];
        } catch (\InvalidArgumentException $e) {
            return ['status' => 400, 'body' => ['success' => false, 'message' => $e->getMessage()]];
        } catch (\Throwable $e) {
            return [
                'status' => 500,
                'body' => [
                    'success' => false,
                    'message' => 'Database error',
                    'error' => defined('APP_DEBUG') && APP_DEBUG ? $e->getMessage() : 'DATABASE_ERROR',
                ],
            ];
        }
    }

    public function bulkUpdatePrices(array $request): array
    {
        try {
            $input = $request['body'] ?? [];
            $user = $request['user'] ?? null;
            $items = $input['items'] ?? [];
            $audit = $request['_audit'] ?? [
                'ip_address' => $_SERVER['REMOTE_ADDR'] ?? null,
                'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? null,
            ];

            if (!is_array($items) || empty($items)) {
                return ['status' => 400, 'body' => ['success' => false, 'message' => 'items array is required']];
            }

            $service = new BranchItemService();
            $results = $service->bulkUpdatePrices($items, $user, $audit);

            return [
                'status' => 200,
                'body' => [
                    'success' => true,
                    'message' => 'Prices updated successfully',
                    'updated_count' => count($results),
                    'data' => array_map(fn($item) => $this->transformItem($item, $service), $results),
                ],
            ];
        } catch (\InvalidArgumentException $e) {
            return ['status' => 400, 'body' => ['success' => false, 'message' => $e->getMessage()]];
        } catch (\Throwable $e) {
            return [
                'status' => 500,
                'body' => [
                    'success' => false,
                    'message' => 'Database error',
                    'error' => defined('APP_DEBUG') && APP_DEBUG ? $e->getMessage() : 'DATABASE_ERROR',
                ],
            ];
        }
    }

    public function delete(array $request): array
    {
        try {
            $id = (int) ($request['params'][0] ?? 0);
            if ($id <= 0) {
                return ['status' => 400, 'body' => ['success' => false, 'message' => 'Invalid ID']];
            }

            $user = $request['user'] ?? null;
            $audit = $request['_audit'] ?? [
                'ip_address' => $_SERVER['REMOTE_ADDR'] ?? null,
                'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? null,
            ];

            $service = new BranchItemService();
            $deleted = $service->delete($id, $user, $audit);

            if (!$deleted) {
                return ['status' => 404, 'body' => ['success' => false, 'message' => 'Branch item not found']];
            }

            return ['status' => 200, 'body' => ['success' => true, 'message' => 'Branch item removed successfully']];
        } catch (\InvalidArgumentException $e) {
            return ['status' => 400, 'body' => ['success' => false, 'message' => $e->getMessage()]];
        } catch (\Throwable $e) {
            return [
                'status' => 500,
                'body' => [
                    'success' => false,
                    'message' => 'Database error',
                    'error' => defined('APP_DEBUG') && APP_DEBUG ? $e->getMessage() : 'DATABASE_ERROR',
                ],
            ];
        }
    }

    public function listByBranch(array $request): array
    {
        
        $branchId = (int) ($request['params'][0] ?? 0);
        if ($branchId <= 0) {
            return ['status' => 400, 'body' => ['success' => false, 'message' => 'Invalid branch ID']];
        }

        $page = (int) ($request['query']['page'] ?? 1);
        $perPage = (int) ($request['query']['per_page'] ?? 10);

        $filters = array_filter([
            'search'        => $request['query']['search'] ?? null,
            'is_serialized' => $request['query']['is_serialized'] ?? null,
            'category_id'   => $request['query']['category_id'] ?? null,
            'brand_id'      => $request['query']['brand_id'] ?? null,
            'sort'          => $request['query']['sort'] ?? null,
        ], fn($value) => $value !== null && $value !== '');

        try {
            $service = new BranchItemService();
            $total = $service->countByBranch($branchId, $filters);
            $items = $service->getByBranch($branchId, $page, $perPage, $filters);

            $paginationMetaData = PaginationMetaDataFactory::create($request, $total);

            // Optional stock-movement report: only computed when ?range= is supplied
            $movement = null;
            $rangeMeta = null;
            if (($request['query']['range'] ?? '') !== '') {
                $range = BranchItemMovementService::resolveRange($request['query']);
                $rangeMeta = BranchItemMovementService::describeRange($range);

                $variants = [];
                foreach ($items as $bi) {
                    $v = $bi->getVariant();
                    if ($v) {
                        $variants[$v->getId()] = $v->getItem() ? (bool) $v->getItem()->isSerialized() : true;
                    }
                }
                $movement = (new BranchItemMovementService())->getReport($branchId, $variants, $range);
            }

            $body = [
                'success' => true,
                'data' => array_map(
                    fn($item) => $this->transformItem(
                        $item,
                        $service,
                        $movement !== null ? ($movement[$item->getVariant()?->getId()] ?? null) : null
                    ),
                    $items
                ),
                'links' => $paginationMetaData->links,
                'pagination' => $paginationMetaData->metadata,
            ];
            if ($rangeMeta !== null) {
                $body['range'] = $rangeMeta;
            }

            return ['status' => 200, 'body' => $body];
        } catch (\InvalidArgumentException $e) {
            return ['status' => 400, 'body' => ['success' => false, 'message' => $e->getMessage()]];
        } catch (\Throwable $e) {
            return [
                'status' => 500,
                'body' => [
                    'success' => false,
                    'message' => 'Database error',
                    'error' => defined('APP_DEBUG') && APP_DEBUG ? $e->getMessage() : 'DATABASE_ERROR',
                ],
            ];
        }
    }

    public function listSerialized(array $request): array
    {
        // Enforce is_serialized = true filter
        $request['query']['is_serialized'] = true;
        return $this->listByBranch($request);
    }

    public function show(array $request): array
    {
        $id = (int) ($request['params'][0] ?? 0);
        if ($id <= 0) {
            return ['status' => 400, 'body' => ['success' => false, 'message' => 'Invalid ID']];
        }

        try {
            $service = new BranchItemService();
            $item = $service->findById($id);

            if (!$item) {
                return ['status' => 404, 'body' => ['success' => false, 'message' => 'Branch item not found']];
            }

            return [
                'status' => 200,
                'body' => [
                    'success' => true,
                    'data' => $this->transformItem($item, $service),
                ],
            ];
        } catch (\Throwable $e) {
            return [
                'status' => 500,
                'body' => [
                    'success' => false,
                    'message' => 'Database error',
                    'error' => defined('APP_DEBUG') && APP_DEBUG ? $e->getMessage() : 'DATABASE_ERROR',
                ],
            ];
        }
    }

    private function transformItem($branchItem, BranchItemService $service, ?array $movement = null): array
    {
        $variant = $branchItem->getVariant();
        $item = $variant ? $variant->getItem() : null;
        $isSerialized = $item ? (bool) $item->isSerialized() : true;
        $branch = $branchItem->getBranch();
        $updatedBy = $branchItem->getUpdatedBy();

        $stats = $service->getStockStats($variant->getId(), $branch->getId(), $isSerialized);

        $result = [
            'branch_item_id' => $branchItem->getId(),
            'variant_id'     => $variant?->getId(),
            'model'          => $variant?->getModel(),
            'sku'            => $variant?->getSku(),
            'initial_serial_number' => $variant?->getInitialSerialNumber(),
            'image_url'      => $variant?->getImageUrl(),
            'item_id'        => $item?->getId(),
            'branch_id'      => $branch?->getId(),
            'price'          => $branchItem->getPrice(),
            'reorder_level'  => $branchItem->getReorderLevel(),
            'updated_at'     => $branchItem->getUpdatedAt()?->format('c'),
            'updated_by'     => $updatedBy ? [
                'id'   => $updatedBy->getId(),
                'name' => trim(preg_replace('/\s+/', ' ', sprintf(
                    '%s %s %s',
                    $updatedBy->getFirstName() ?? '',
                    $updatedBy->getMiddleName() ?? '',
                    $updatedBy->getLastName() ?? ''
                ))),
            ] : null,
            'is_serialized'   => $isSerialized,
            'stock_quantity'  => $stats['stock_quantity'],
            'available_count' => $stats['available_count'],
            'reserved_count'  => $stats['reserved_count'],
            'damaged_count'   => $stats['damaged_count'],
            'item' => $item ? [
                'name'      => $item->getName(),
                'image_url' => $item->getImageUrl(),
            ] : null,
        ];

        if ($movement !== null) {
            $result['movement'] = $movement;
        }

        return $result;
    }
}