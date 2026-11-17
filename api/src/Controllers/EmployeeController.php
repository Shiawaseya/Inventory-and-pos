<?php

namespace App\Controllers;

use App\Pagination\PaginationMetaDataFactory;
use App\Services\EmployeeService;
use PDOException;

class EmployeeController
{
    public static function getSalesOicByBranch(array $request)
    {
        $service = new EmployeeService();
        try {
            $params = $request['params'] ?? [];
            $branchId = isset($params[0]) ? (int)$params[0] : ($request['query']['branchId'] ?? null);
            if ($branchId === null || $branchId === '') {
                return ['status' => 400, 'body' => ['success' => false, 'message' => 'branchId is required']];
            }

            $rows = $service->getSalesOicWithBranch((int)$branchId);
            return ['status' => 200, 'body' => ['success' => true, 'data' => $rows]];
        } catch (PDOException $e) {
            return ['status' => 500, 'body' => ['success' => false, 'message' => 'Database error', 'error' => APP_DEBUG ? $e->getMessage() : 'DATABASE_ERROR']];
        }
    }

    public static function getSalesRepresentativeById(array $request)
    {
        $service = new EmployeeService();
        try {
            $params = $request['params'] ?? [];
            $id = isset($params[0]) ? (int)$params[0] : (int)($request['query']['id'] ?? 0);
            if ($id <= 0) {
                return ['status' => 400, 'body' => ['success' => false, 'message' => 'id is required']];
            }

            $row = $service->getSalesRepresentativeById($id);
            if ($row === null) {
                return ['status' => 404, 'body' => ['success' => false, 'message' => 'Sales representative not found']];
            }

            return ['status' => 200, 'body' => ['success' => true, 'data' => $row]];
        } catch (\PDOException $e) {
            return ['status' => 500, 'body' => ['success' => false, 'message' => 'Database error', 'error' => APP_DEBUG ? $e->getMessage() : 'DATABASE_ERROR']];
        }
    }

    public static function getSalesRepesentativesByBranch(array $request)
    {
        $service = new EmployeeService();
        try {
            $params = $request['params'] ?? [];
            $branchId = isset($params[0]) ? (int)$params[0] : ($request['query']['branchId'] ?? null);
            if ($branchId === null || $branchId === '') {
                return ['status' => 400, 'body' => ['success' => false, 'message' => 'branchId is required']];
            }

            $rows = $service->getSalesRepresentativesByBranch((int)$branchId);
            return ['status' => 200, 'body' => ['success' => true, 'data' => $rows]];
        } catch (\PDOException $e) {
            return ['status' => 500, 'body' => ['success' => false, 'message' => 'Database error', 'error' => APP_DEBUG ? $e->getMessage() : 'DATABASE_ERROR']];
        }
    }

    public static function getByBranch(array $request)
    {
        $service = new EmployeeService();
        try {
            $params = $request['params'] ?? [];
            $requestedBranchId = $params[0] ?? ($request['query']['branchId'] ?? null);
            $user = $request['user'] ?? [];
            $userBranchId = $user['branchId'] ?? $user['branch_id'] ?? null;

            if (
                $requestedBranchId === null ||
                !ctype_digit((string) $requestedBranchId) ||
                (int) $requestedBranchId <= 0 ||
                $userBranchId === null ||
                (int) $requestedBranchId !== (int) $userBranchId
            ) {
                return ['status' => 403, 'body' => ['success' => false, 'message' => 'You can only access staff from your assigned branch']];
            }

            $query = $request['query'] ?? [];
            $page = self::positiveInt($query['page'] ?? 1, 'page');
            $perPage = self::positiveInt($query['per_page'] ?? 10, 'per_page');
            if ($perPage > 100) {
                return ['status' => 400, 'body' => ['success' => false, 'message' => 'per_page cannot exceed 100']];
            }

            $filters = [
                'search' => trim((string) ($query['search'] ?? '')),
                'sort' => (string) ($query['sort'] ?? 'last_name'),
                'direction' => (string) ($query['direction'] ?? 'asc'),
            ];
            $totalEmployees = $service->countEmployeesByBranch((int) $userBranchId, $filters);
            $employees = $service->getEmployeesByBranchPaginated(
                (int) $userBranchId,
                $page,
                $perPage,
                $filters,
            );
            $pagination = PaginationMetaDataFactory::create($request, $totalEmployees);

            return [
                'status' => 200,
                'body' => [
                    'success' => true,
                    'data' => $employees,
                    'links' => $pagination->links,
                    'pagination' => $pagination->metadata,
                ],
            ];
        } catch (\InvalidArgumentException $e) {
            return ['status' => 400, 'body' => ['success' => false, 'message' => $e->getMessage()]];
        } catch (PDOException $e) {
            return ['status' => 500, 'body' => ['success' => false, 'message' => 'Database error', 'error' => APP_DEBUG ? $e->getMessage() : 'DATABASE_ERROR']];
        }
    }

    public static function deactivate(array $request)
    {
        $service = new EmployeeService();
        try {
            $params = $request['params'] ?? [];
            $employeeId = isset($params[0]) ? (int) $params[0] : 0;
            $user = $request['user'] ?? [];
            $branchId = (int) ($user['branchId'] ?? $user['branch_id'] ?? 0);

            if ($employeeId <= 0) {
                return ['status' => 400, 'body' => ['success' => false, 'message' => 'employee id is required']];
            }

            if ($branchId <= 0) {
                return ['status' => 403, 'body' => ['success' => false, 'message' => 'Your token has no assigned branch']];
            }

            $employee = $service->deactivateEmployee($employeeId, $branchId);
            if ($employee === null) {
                return ['status' => 404, 'body' => ['success' => false, 'message' => 'Employee not found in your branch']];
            }
            $service->auditStatusChange($employee, $user, 'DEACTIVATE', [
                'ip_address' => $_SERVER['REMOTE_ADDR'] ?? null,
                'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? null,
            ]);

            return [
                'status' => 200,
                'body' => [
                    'success' => true,
                    'message' => 'Employee deactivated successfully',
                    'data' => $employee,
                ],
            ];
        } catch (PDOException $e) {
            return ['status' => 500, 'body' => ['success' => false, 'message' => 'Database error', 'error' => APP_DEBUG ? $e->getMessage() : 'DATABASE_ERROR']];
        }
    }

    public static function activate(array $request)
    {
        $service = new EmployeeService();
        try {
            $params = $request['params'] ?? [];
            $employeeId = isset($params[0]) ? (int) $params[0] : 0;
            $user = $request['user'] ?? [];
            $branchId = (int) ($user['branchId'] ?? $user['branch_id'] ?? 0);

            if ($employeeId <= 0) {
                return ['status' => 400, 'body' => ['success' => false, 'message' => 'employee id is required']];
            }

            if ($branchId <= 0) {
                return ['status' => 403, 'body' => ['success' => false, 'message' => 'Your token has no assigned branch']];
            }

            $employee = $service->activateEmployee($employeeId, $branchId);
            if ($employee === null) {
                return ['status' => 404, 'body' => ['success' => false, 'message' => 'Employee not found in your branch']];
            }
            $service->auditStatusChange($employee, $user, 'ACTIVATE', [
                'ip_address' => $_SERVER['REMOTE_ADDR'] ?? null,
                'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? null,
            ]);

            return [
                'status' => 200,
                'body' => [
                    'success' => true,
                    'message' => 'Employee activated successfully',
                    'data' => $employee,
                ],
            ];
        } catch (PDOException $e) {
            return ['status' => 500, 'body' => ['success' => false, 'message' => 'Database error', 'error' => APP_DEBUG ? $e->getMessage() : 'DATABASE_ERROR']];
        }
    }

    /**
     * PATCH /employees/{id}/role  { "role_key": "inventory-clerk" | "sales-representative" }
     * Sales-OIC only. Rotates a staff member between the two floor roles.
     */
    public static function rotateRole(array $request)
    {
        $service = new EmployeeService();
        try {
            $params = $request['params'] ?? [];
            $employeeId = isset($params[0]) ? (int) $params[0] : 0;
            $user = $request['user'] ?? [];
            $branchId = (int) ($user['branchId'] ?? $user['branch_id'] ?? 0);

            if ($employeeId <= 0) {
                return ['status' => 400, 'body' => ['success' => false, 'message' => 'employee id is required']];
            }

            if ($branchId <= 0) {
                return ['status' => 403, 'body' => ['success' => false, 'message' => 'Your token has no assigned branch']];
            }

            $body = $request['body'] ?? [];
            if (is_string($body)) {
                $body = json_decode($body, true) ?: [];
            }
            $roleKey = trim((string) ($body['role_key'] ?? ''));
            if ($roleKey === '') {
                return ['status' => 400, 'body' => ['success' => false, 'message' => 'role_key is required']];
            }

            $employee = $service->rotateRole($employeeId, $branchId, $roleKey, $user, [
                'ip_address' => $_SERVER['REMOTE_ADDR'] ?? null,
                'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? null,
            ]);
            if ($employee === null) {
                return ['status' => 404, 'body' => ['success' => false, 'message' => 'Employee not found in your branch']];
            }

            return [
                'status' => 200,
                'body' => [
                    'success' => true,
                    'message' => 'Employee role updated successfully',
                    'data' => $employee,
                ],
            ];
        } catch (\InvalidArgumentException $e) {
            return ['status' => 400, 'body' => ['success' => false, 'message' => $e->getMessage()]];
        } catch (\DomainException $e) {
            return ['status' => 409, 'body' => ['success' => false, 'message' => $e->getMessage()]];
        } catch (PDOException $e) {
            return ['status' => 500, 'body' => ['success' => false, 'message' => 'Database error', 'error' => APP_DEBUG ? $e->getMessage() : 'DATABASE_ERROR']];
        }
    }

    private static function positiveInt($value, string $name): int
    {
        if (filter_var($value, FILTER_VALIDATE_INT) === false || (int) $value < 1) {
            throw new \InvalidArgumentException($name . ' must be a positive integer');
        }

        return (int) $value;
    }
}