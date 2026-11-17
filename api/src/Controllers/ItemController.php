<?php

namespace App\Controllers;

use App\Services\ItemService;
use Doctrine\DBAL\Exception as DBALException;
use InvalidArgumentException;
use Throwable;

class ItemController
{
    private ItemService $service;

    public function __construct(ItemService $service)
    {
        $this->service = $service;
    }

    private function auditContext(array $request): array
    {
        $user = $request['user'] ?? [];
        $branchId = (int) ($user['branchId'] ?? $user['branch_id'] ?? $request['branchId'] ?? 0);

        return [
            'branch_id'  => $branchId > 0 ? $branchId : null,
            'ip_address' => $_SERVER['REMOTE_ADDR'] ?? null,
            'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? null,
        ];
    }

    private function employeeId(array $request): ?int
    {
        $user = $request['user'] ?? [];
        $id = (int) ($user['employeeId'] ?? $user['employee_id'] ?? $user['id'] ?? 0);
        return $id > 0 ? $id : null;
    }

    public function create(array $request): array
    {
        try {
            $input = $request['body'] ?? [];
            if (!empty($request['files']['image'])) {
                $input['image'] = $request['files']['image'];
            }

            $userId = $this->employeeId($request);
            $auditContext = $this->auditContext($request);
            $item = $this->service->create($input, $userId, $auditContext);

            return [
                'status' => 201,
                'body' => [
                    'success' => true,
                    'message' => 'Item created successfully',
                    'data'    => $item
                ]
            ];
        } catch (InvalidArgumentException $e) {
            return ['status' => 400, 'body' => ['success' => false, 'message' => $e->getMessage()]];
        } catch (DBALException|Throwable $e) {
            return [
                'status' => 500,
                'body' => [
                    'success' => false,
                    'message' => 'Database error',
                    'error'   => defined('APP_DEBUG') && APP_DEBUG ? $e->getMessage() : 'DATABASE_ERROR'
                ]
            ];
        }
    }

    public function list(array $request = []): array
    {
        try {
            $query = $request['query'] ?? [];
            $page = max(1, (int)($query['page'] ?? 1));
            $perPage = min(100, max(1, (int)($query['per_page'] ?? 12)));
            $user = $request['user'] ?? [];
            $branchId = (int) ($user['branchId'] ?? $user['branch_id'] ?? 0);

            $result = $this->service->list($page, $perPage, $query, $branchId > 0 ? $branchId : null);

            return [
                'status' => 200,
                'body' => [
                    'success'    => true,
                    'data'       => $result['data'],
                    'pagination' => $result['pagination'],
                    'filters'    => $result['filters'],
                ]
            ];
        } catch (DBALException|Throwable $e) {
            return [
                'status' => 500,
                'body' => [
                    'success' => false,
                    'message' => 'Database error',
                    'error'   => defined('APP_DEBUG') && APP_DEBUG ? $e->getMessage() : 'DATABASE_ERROR'
                ]
            ];
        }
    }

    public function getBySerial(array $request): array
    {
        try {
            $params = $request['params'] ?? [];
            $serial = $params[0] ?? ($request['query']['serial'] ?? null);

            if ($serial === null || trim((string)$serial) === '') {
                return ['status' => 400, 'body' => ['success' => false, 'message' => 'Serial number is required']];
            }

            $row = $this->service->getItemBySerial((string)$serial);
            if ($row === null) {
                return ['status' => 404, 'body' => ['success' => false, 'message' => 'Item with given serial not found']];
            }

            return ['status' => 200, 'body' => ['success' => true, 'data' => $row]];
        } catch (DBALException|Throwable $e) {
            return [
                'status' => 500,
                'body' => [
                    'success' => false,
                    'message' => 'Database error',
                    'error'   => defined('APP_DEBUG') && APP_DEBUG ? $e->getMessage() : 'DATABASE_ERROR'
                ]
            ];
        }
    }

    public function update(array $request): array
    {
        try {
            $params = $request['params'] ?? [];
            $id = isset($params[0]) ? (int)$params[0] : null;

            if ($id === null || $id <= 0) {
                return ['status' => 400, 'body' => ['success' => false, 'message' => 'Valid ID is required']];
            }

            $input = $request['body'] ?? [];
            if (!empty($request['files']['image'])) {
                $input['image'] = $request['files']['image'];
            }

            $userId = $this->employeeId($request);
            $auditContext = $this->auditContext($request);
            $updated = $this->service->update($id, $input, $userId, $auditContext);

            if ($updated === null) {
                return ['status' => 404, 'body' => ['success' => false, 'message' => 'Item not found']];
            }

            return [
                'status' => 200,
                'body' => [
                    'success' => true,
                    'message' => 'Item updated successfully',
                    'data'    => $updated
                ]
            ];
        } catch (DBALException|Throwable $e) {
            return [
                'status' => 500,
                'body' => [
                    'success' => false,
                    'message' => 'Database error',
                    'error'   => defined('APP_DEBUG') && APP_DEBUG ? $e->getMessage() : 'DATABASE_ERROR'
                ]
            ];
        }
    }
}