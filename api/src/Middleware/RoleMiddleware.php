<?php

namespace App\Middleware;

/**
 * RoleMiddleware enforces that the authenticated user has one of the allowed roles.
 * Constructor accepts an array or comma-separated string of allowed roles.
 */
class RoleMiddleware
{
    public function handle($request, $next, ...$roles)
    {
        $user = $request['user'] ?? null;
        if (!$user || !isset($user['role'])) {
            return [
                'status' => 401,
                'body' => ['error' => 'Unauthorized']
            ];
        }

        if (!empty($roles)) {
            $allowedRoles = array_map(
                fn($role) => str_replace('_', '-', strtolower(trim((string) $role))),
                $roles
            );
            $userRoles = array_filter([
                $user['role'] ?? null,
                $user['position'] ?? null,
            ], fn($role) => $role !== null && $role !== '');
            $userRoles = array_map(
                fn($role) => str_replace('_', '-', strtolower(trim((string) $role))),
                $userRoles
            );

            if (!array_intersect($allowedRoles, $userRoles)) {
                return [
                    'status' => 403,
                    'body' => ['error' => 'Forbidden']
                ];
            }
        }

        return $next($request);
    }
}
