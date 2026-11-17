<?php

namespace App\Controllers;

use App\Services\RoleService;
use PDOException;

class RoleController
{
    public static function list(array $request)
    {
        $service = new RoleService();
        try {
            $rows = $service->listAll();
            return ['status' => 200, 'body' => ['success' => true, 'data' => $rows]];
        } catch (PDOException $e) {
            return ['status' => 500, 'body' => ['success' => false, 'message' => 'Database error', 'error' => APP_DEBUG ? $e->getMessage() : 'DATABASE_ERROR']];
        }
    }

    public static function show(array $request)
    {
        $service = new RoleService();
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

    public static function findByKey(array $request)
    {
        $service = new RoleService();
        try {
            $params = $request['params'] ?? [];
            $key = $params[0] ?? null;
            if ($key === null) {
                return ['status' => 400, 'body' => ['success' => false, 'message' => 'Invalid key']];
            }

            $row = $service->findByKey($key);
            if ($row === null) {
                return ['status' => 404, 'body' => ['success' => false, 'message' => 'Not found']];
            }

            return ['status' => 200, 'body' => ['success' => true, 'data' => $row]];
        } catch (PDOException $e) {
            return ['status' => 500, 'body' => ['success' => false, 'message' => 'Database error', 'error' => APP_DEBUG ? $e->getMessage() : 'DATABASE_ERROR']];
        }
    }

    public static function create(array $request)
    {
        $service = new RoleService();
        try {
            $input = $request['body'] ?? [];
            if (!isset($input['role_key']) || trim((string)$input['role_key']) === '') {
                return ['status' => 400, 'body' => ['success' => false, 'message' => 'role_key is required']];
            }

            $row = $service->create($input, $request['user'] ?? null, $request['_audit'] ?? []);
            return ['status' => 201, 'body' => ['success' => true, 'data' => $row]];
        } catch (PDOException $e) {
            return ['status' => 500, 'body' => ['success' => false, 'message' => 'Database error', 'error' => APP_DEBUG ? $e->getMessage() : 'DATABASE_ERROR']];
        }
    }
}
