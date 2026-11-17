<?php

namespace App\Controllers;

use App\Middleware\AuthMiddleware;
use App\Middleware\TeamAuthMiddleware;
use App\Services\AuditLogService;
use PDOException;

/**
 * Authentication Controller
 * 
 * Handles admin and team login/logout with audit logging
 */
class AuthController
{
    /**
     * Admin login
     * 
     * POST /login
     */
    public static function login(array $input)
    {
        try {
            $username = $input['username'] ?? '';
            $credential = $input['credential'] ?? '';
            if ($username === '' || $credential === '') {
                return ['success' => false, 'message' => 'username and credential are required'];
            }

            $authService = new \App\Services\AuthService();
            $result = $authService->loginAdmin($username, $credential);

            if (!empty($result['success']) && !empty($result['employee'])) {
                self::recordAudit('LOGIN', $result['employee'], $input['_audit'] ?? []);
            }

            return $result;
        } catch (\RuntimeException $e) {
            return ['success' => false, 'message' => $e->getMessage()];
        } catch (PDOException $e) {
            return self::databaseErrorResponse($e);
        }
    }
    
    /**
     * Logout
     * 
     * POST /logout
     */
    public static function logout(?array $request = null)
    {
        $user = $request['user'] ?? AuthMiddleware::verify();
        if ($user) {
            self::recordAudit('LOGOUT', $user, [
                'ip_address' => $_SERVER['REMOTE_ADDR'] ?? null,
                'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? null,
            ]);
        }

        return [
            'success' => true,
            'message' => 'Logout successful. Please delete the token on client side.'
        ];
    }
    
    private static function databaseErrorResponse(PDOException $e)
    {
        http_response_code(500);
        return [
            'success' => false,
            'message' => 'Database error',
            'error' => defined('APP_DEBUG') && APP_DEBUG ? $e->getMessage() : 'DATABASE_ERROR'
        ];
    }
    
    /**
     * Get current authenticated user
     * 
     * GET /auth/profile
     */
    public static function profile()
    {
        $userData = AuthMiddleware::verify();
        
        if (!$userData) {
            http_response_code(401);
            return [
                'success' => false,
                'message' => 'Unauthorized'
            ];
        }
        
        return [
            'success' => true,
            'user' => $userData
        ];
    }

    /**
     * Team member login
     */
    public static function teamLogin(array $input)
    {
        try {
            $username = $input['username'] ?? null;
            $employeeId = $input['employeeId'] ?? null;
            $credential = $input['password'] ?? $input['pin'] ?? '';
            if ((!$username && !$employeeId) || $credential === '') {
                return ['success' => false, 'message' => 'username and password are required'];
            }

            $authService = new \App\Services\AuthService();
            $result = $username
                ? $authService->loginTeamByUsername((string) $username, (string) $credential)
                : $authService->loginTeam((string) $employeeId, (string) $credential);

            if (!empty($result['success']) && !empty($result['employee'])) {
                self::recordAudit('LOGIN', $result['employee'], $input['_audit'] ?? []);
            }

            return $result;
        } catch (\RuntimeException $e) {
            return ['success' => false, 'message' => $e->getMessage()];
        } catch (PDOException $e) {
            return self::databaseErrorResponse($e);
        }
    }

    public static function teamLogout(?array $request = null)
    {
        $user = $request['user'] ?? TeamAuthMiddleware::verify() ?? AuthMiddleware::verify();
        if ($user) {
            self::recordAudit('LOGOUT', $user, [
                'ip_address' => $_SERVER['REMOTE_ADDR'] ?? null,
                'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? null,
            ]);
        }

        return [
            'success' => true,
            'message' => 'Logout successful. Please delete the token on client side.'
        ];
    }

    public static function teamProfile()
    {
        $teamData = TeamAuthMiddleware::verify();

        if (!$teamData) {
            http_response_code(401);
            return [
                'success' => false,
                'message' => 'Unauthorized'
            ];
        }

        return [
            'success' => true,
            'team' => $teamData
        ];
    }

    private static function recordAudit(string $action, array $user, array $auditContext = []): void
    {
        try {
            $employeeId = (int) ($user['employeeId'] ?? $user['employee_id'] ?? 0);
            $branchId = (int) ($user['branchId'] ?? $user['branch_id'] ?? 0);

            $name = trim(preg_replace('/\s+/', ' ', sprintf(
                '%s %s %s',
                $user['firstName'] ?? $user['first_name'] ?? '',
                $user['middleName'] ?? $user['middle_name'] ?? '',
                $user['lastName'] ?? $user['last_name'] ?? ''
            )));

            if ($name === '') {
                $name = $user['name'] ?? $user['username'] ?? "Employee #{$employeeId}";
            }

            $service = new AuditLogService();
            $service->record([
                'action' => $action,
                'module' => 'employees',
                'employee_id' => $employeeId > 0 ? $employeeId : null,
                'employee_name' => $name,
                'branch_id' => $branchId > 0 ? $branchId : null,
                'record_id' => $employeeId > 0 ? (string)$employeeId : null,
                'old_values' => null,
                'new_values' => [
                    'username' => $user['username'] ?? null,
                    'role' => $user['position'] ?? $user['role'] ?? null,
                    'action_time' => date('c'),
                ],
                'ip_address' => $auditContext['ip_address'] ?? ($_SERVER['REMOTE_ADDR'] ?? null),
                'user_agent' => $auditContext['user_agent'] ?? ($_SERVER['HTTP_USER_AGENT'] ?? null),
            ]);
        } catch (\Throwable $e) {
            // Avoid failing login/logout responses if audit logging fails
            error_log("Failed to write audit log for {$action}: " . $e->getMessage());
        }
    }
}