<?php

namespace App\Controllers;

use App\Database\DatabaseManager;
use App\Repositories\StockCheckerRepository;

class StockCheckerController
{
    private static function repo(): StockCheckerRepository
    {
        return new StockCheckerRepository(DatabaseManager::getEntityManager()->getConnection());
    }

    private static function branchId(array $request): int
    {
        $query = $request['query'] ?? [];
        // Adjust the fallback to however AuthMiddleware exposes the user's branch.
        return (int) ($query['branch_id'] ?? $request['user']['branch_id'] ?? $request['user']['branchId'] ?? 0);
    }

    public static function variants(array $request): array
    {
        try {
            $branchId = self::branchId($request);
            if ($branchId <= 0) {
                return ['status' => 400, 'body' => ['success' => false, 'message' => 'branch_id is required']];
            }

            $q = $request['query'] ?? [];
            $page = max(1, (int) ($q['page'] ?? 1));
            $perPage = min(100, max(1, (int) ($q['per_page'] ?? 24)));

            $filters = [
                'branch_id'   => $branchId,
                'search'      => $q['search'] ?? null,
                'category_id' => $q['category_id'] ?? null,
                'brand_id'    => $q['brand_id'] ?? null,
                'price_min'   => $q['price_min'] ?? null,
                'price_max'   => $q['price_max'] ?? null,
                'in_stock'    => filter_var($q['in_stock'] ?? false, FILTER_VALIDATE_BOOLEAN),
                'sort'        => $q['sort'] ?? 'name',
                // specs[12][min]=5&specs[12][max]=10 | specs[3][option_ids]=4,5 | specs[7][text]=oled
                'specs'       => is_array($q['specs'] ?? null) ? $q['specs'] : [],
            ];

            $result = self::repo()->search($filters, $page, $perPage);

            return ['status' => 200, 'body' => ['success' => true] + $result];
        } catch (\Throwable $e) {
            return self::serverError($e);
        }
    }

    public static function facets(array $request): array
    {
        try {
            $branchId = self::branchId($request);
            if ($branchId <= 0) {
                return ['status' => 400, 'body' => ['success' => false, 'message' => 'branch_id is required']];
            }
            $categoryId = (int) (($request['query'] ?? [])['category_id'] ?? 0) ?: null;

            return ['status' => 200, 'body' => ['success' => true, 'data' => self::repo()->facets($branchId, $categoryId)]];
        } catch (\Throwable $e) {
            return self::serverError($e);
        }
    }

    private static function serverError(\Throwable $e): array
    {
        return ['status' => 500, 'body' => [
            'success' => false,
            'message' => 'Database error',
            'error'   => defined('APP_DEBUG') && APP_DEBUG ? $e->getMessage() : 'DATABASE_ERROR',
        ]];
    }
}