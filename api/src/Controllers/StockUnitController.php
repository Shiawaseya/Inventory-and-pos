<?php

namespace App\Controllers;

use App\Services\StockUnitService;
use App\Pagination\PaginationMetaDataFactory;
use PDOException;

class StockUnitController
{
    public static function create(array $request)
    {
        $service = new StockUnitService();
        try {
            $input = $request['body'] ?? [];
            $employeeId = (int) ($request['user']['employeeId'] ?? $request['user']['employee_id'] ?? 0);
            if ($employeeId <= 0) {
                return ['status' => 401, 'body' => ['success' => false, 'message' => 'Authenticated employee is required']];
            }
            $input['employee_id'] = $employeeId;
            $input['branch_id'] = $input['branch_id'] ?? ($request['user']['branchId'] ?? $request['user']['branch_id'] ?? null);
            $input['_audit'] = [
                'employee_id' => $employeeId,
                'ip_address' => $_SERVER['REMOTE_ADDR'] ?? null,
                'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? null,
            ];
            $unit = $service->create($input);
            return ['status' => 200, 'body' => ['success' => true, 'data' => $unit]];
        } catch (PDOException $e) {
            return ['status' => 500, 'body' => ['success' => false, 'message' => 'Database error', 'error' => APP_DEBUG ? $e->getMessage() : 'DATABASE_ERROR']];
        }
    }

    public static function show(array $request)
    {
        $service = new StockUnitService();
        try {
            $params = $request['params'] ?? [];
            $id = isset($params[0]) ? (int)$params[0] : null;
            if ($id === null) {
                return ['status' => 400, 'body' => ['success' => false, 'message' => 'Invalid id']];
            }

            $row = $service->findById($id);
            if ($row === null) {
                return ['status' => 404, 'body' => ['success' => false, 'message' => 'Not found']];
            }

            return ['status' => 200, 'body' => ['success' => true, 'data' => $row]];
        } catch (PDOException $e) {
            return ['status' => 500, 'body' => ['success' => false, 'message' => 'Database error', 'error' => APP_DEBUG ? $e->getMessage() : 'DATABASE_ERROR']];
        }
    }

    public static function findBySerial(array $request)
    {
        $service = new StockUnitService();
        try {
            $params = $request['params'] ?? [];
            $serial = $params[0] ?? null;
            if ($serial === null) {
                return ['status' => 400, 'body' => ['success' => false, 'message' => 'Invalid serial']];
            }

            $row = $service->findBySerial($serial);
            if ($row === null) {
                return ['status' => 404, 'body' => ['success' => false, 'message' => 'Not found']];
            }

            return ['status' => 200, 'body' => ['success' => true, 'data' => $row]];
        } catch (PDOException $e) {
            return ['status' => 500, 'body' => ['success' => false, 'message' => 'Database error', 'error' => APP_DEBUG ? $e->getMessage() : 'DATABASE_ERROR']];
        }
    }

    public static function findVariantBySerial(array $request)
    {
        $service = new StockUnitService();
        try {
            $serial = rawurldecode(trim((string) (($request['params'] ?? [])[0] ?? '')));
            if ($serial === '') {
                return ['status' => 400, 'body' => ['success' => false, 'message' => 'Valid serial is required']];
            }

            $row = $service->findVariantBySerial($serial);
            if ($row === null) {
                return ['status' => 404, 'body' => ['success' => false, 'message' => 'Variant not found for serial']];
            }

            return ['status' => 200, 'body' => ['success' => true, 'data' => $row]];
        } catch (PDOException $e) {
            return ['status' => 500, 'body' => ['success' => false, 'message' => 'Database error', 'error' => APP_DEBUG ? $e->getMessage() : 'DATABASE_ERROR']];
        }
    }

    public static function listByItemAndBranch(array $request)
    {
        $service = new StockUnitService();
        try {
            $params = $request['params'] ?? [];
            $branchId = isset($params[0]) ? (int)$params[0] : null;
            $variantId = isset($params[1]) ? (int)$params[1] : null;
            if ($branchId === null || $variantId === null) {
                return ['status' => 400, 'body' => ['success' => false, 'message' => 'branch_id and variant_id required']];
            }

            $query = $request['body'] ?? [];
            $limit = isset($query['limit']) ? (int)$query['limit'] : 100;
            $offset = isset($query['offset']) ? (int)$query['offset'] : 0;

            $rows = $service->listByItemAndBranch($variantId, $branchId, $limit, $offset);
            return ['status' => 200, 'body' => ['success' => true, 'data' => $rows]];
        } catch (PDOException $e) {
            return ['status' => 500, 'body' => ['success' => false, 'message' => 'Database error', 'error' => APP_DEBUG ? $e->getMessage() : 'DATABASE_ERROR']];
        }
    }

    public static function listByVariantAndBranch(array $request)
    {
        $service = new StockUnitService();
        try {
            $params = $request['params'] ?? [];
            $variantId = isset($params[0]) ? (int) $params[0] : 0;
            $user = $request['user'] ?? [];
            $branchId = (int) ($user['branchId'] ?? $user['branch_id'] ?? 0);

            if ($variantId <= 0) {
                return ['status' => 400, 'body' => ['success' => false, 'message' => 'Valid variant_id is required']];
            }
            if ($branchId <= 0) {
                return ['status' => 400, 'body' => ['success' => false, 'message' => 'Authenticated branch is required']];
            }

            $query = $request['query'] ?? [];
            $page = max(1, (int) ($query['page'] ?? 1));
            $perPage = min(100, max(1, (int) ($query['per_page'] ?? 10)));
            $filters = array_filter([
                'status' => $query['status'] ?? null,
                'search' => $query['search'] ?? null,
                'sort' => $query['sort'] ?? null,
            ], fn($value) => $value !== null && $value !== '');

            $totalStockUnits = $service->countByVariantAndBranch($variantId, $branchId, $filters);
            $stockUnits = $service->getByVariantAndBranch($variantId, $branchId, $page, $perPage, $filters);
            $pagination = PaginationMetaDataFactory::create($request, $totalStockUnits);

            return [
                'status' => 200,
                'body' => [
                    'success' => true,
                    'data' => array_map(fn($stockUnit) => [
                        'stock_unit_id' => $stockUnit->getId(),
                        'serial_number' => $stockUnit->getSerialNumber(),
                        'status' => $stockUnit->getStatus()->value,
                        'variant_id' => $stockUnit->getVariant()?->getId(),
                        'branch_id' => $stockUnit->getBranch()?->getId(),
                    ], $stockUnits),
                    'links' => $pagination->links,
                    'pagination' => $pagination->metadata,
                ],
            ];
        } catch (\Throwable $e) {
            return ['status' => 500, 'body' => ['success' => false, 'message' => 'Database error', 'error' => defined('APP_DEBUG') && APP_DEBUG ? $e->getMessage() : 'DATABASE_ERROR']];
        }
    }

    public static function listByVariantSkuAndBranch(array $request)
    {
        $service = new StockUnitService();
        $sku = trim((string) (($request['params'] ?? [])[0] ?? ''));

        if ($sku === '') {
            return ['status' => 400, 'body' => ['success' => false, 'message' => 'Valid variant_sku is required']];
        }

        $variantId = $service->findVariantIdBySku($sku);
        if ($variantId === null) {
            return ['status' => 404, 'body' => ['success' => false, 'message' => 'Variant not found']];
        }

        $request['params'] = [$variantId];
        return self::listByVariantAndBranch($request);
    }

    public static function listByStatusAndBranch(array $request)
    {
        $service = new StockUnitService();
        try {
            $status = rawurldecode(trim((string) (($request['params'] ?? [])[0] ?? '')));
            $user = $request['user'] ?? [];
            $branchId = (int) ($user['branchId'] ?? $user['branch_id'] ?? 0);
            $validStatus = \App\Enums\StockUnitStatus::tryFrom($status);

            if ($validStatus === null) {
                return ['status' => 400, 'body' => ['success' => false, 'message' => 'Invalid stock unit status']];
            }
            if ($branchId <= 0) {
                return ['status' => 400, 'body' => ['success' => false, 'message' => 'Authenticated branch is required']];
            }

            $query = $request['query'] ?? [];
            $page = max(1, (int) ($query['page'] ?? 1));
            $perPage = min(100, max(1, (int) ($query['per_page'] ?? 100)));
            $total = $service->countByStatusAndBranch($validStatus->value, $branchId);
            $stockUnits = $service->getByStatusAndBranch($validStatus->value, $branchId, $page, $perPage);
            $pagination = PaginationMetaDataFactory::create($request, $total);

            return [
                'status' => 200,
                'body' => [
                    'success' => true,
                    'data' => array_map(fn($stockUnit) => [
                        'stock_unit_id' => $stockUnit->getId(),
                        'serial_number' => $stockUnit->getSerialNumber(),
                        'status' => $stockUnit->getStatus()->value,
                        'variant_id' => $stockUnit->getVariant()?->getId(),
                        'branch_id' => $stockUnit->getBranch()?->getId(),
                        'product_name' => $stockUnit->getVariant()?->getItem()?->getName(),
                    ], $stockUnits),
                    'links' => $pagination->links,
                    'pagination' => $pagination->metadata,
                ],
            ];
        } catch (\Throwable $e) {
            return ['status' => 500, 'body' => [
                'success' => false,
                'message' => 'Database error',
                'error' => defined('APP_DEBUG') && APP_DEBUG ? $e->getMessage() : 'DATABASE_ERROR',
            ]];
        }
    }

    public static function bulkCreate(array $request)
    {
        $service = new StockUnitService();
        try {
            $params = $request['params'] ?? [];
            $branchId = isset($params[0]) ? (int)$params[0] : null;

            $payload = $request['body'] ?? [];
            if ($branchId !== null) {
                $payload['branch_id'] = $branchId;
            }

            $user = $request['user'] ?? null;
            $employeeId = (int) ($user['employeeId'] ?? $user['employee_id'] ?? 0);
            if ($employeeId <= 0) {
                return ['status' => 401, 'body' => ['success' => false, 'message' => 'Authenticated employee is required']];
            }
            $payload['_audit'] = [
                'employee_id' => $employeeId,
                'ip_address' => $_SERVER['REMOTE_ADDR'] ?? null,
                'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? null,
            ];

            $result = $service->bulkCreateFromPayload($payload, $user);
            return ['status' => 200, 'body' => ['success' => true, 'data' => $result]];
        } catch (\InvalidArgumentException $e) {
            return ['status' => 400, 'body' => ['success' => false, 'message' => $e->getMessage()]];
        } catch (PDOException $e) {
            return ['status' => 500, 'body' => ['success' => false, 'message' => 'Database error', 'error' => APP_DEBUG ? $e->getMessage() : 'DATABASE_ERROR']];
        } catch (\Throwable $e) {
            return ['status' => 500, 'body' => ['success' => false, 'message' => 'Server error', 'error' => APP_DEBUG ? $e->getMessage() : 'SERVER_ERROR']];
        }
    }
}
