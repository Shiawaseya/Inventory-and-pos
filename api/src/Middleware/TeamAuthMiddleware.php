<?php

namespace App\Middleware;

/**
 * Team Authentication Middleware
 * 
 * Verifies team member tokens from Authorization header
 */
class TeamAuthMiddleware
{
    /**
     * Verify team authentication token
     * 
     * Checks for Authorization header with Bearer token
     * Returns decoded staff data or false
     */
    public static function verify()
    {
        $headers = getallheaders();
        $lower = is_array($headers) ? array_change_key_case($headers, CASE_LOWER) : [];

        // Check for Authorization header case-insensitively or server fallback
        $authHeader = $lower['authorization'] ?? ($_SERVER['HTTP_AUTHORIZATION'] ?? null);
        if (!$authHeader) {
            return false;
        }

        // Extract token from "Bearer <token>"
        if (strpos($authHeader, 'Bearer ') !== 0) {
            return false;
        }

        $token = substr($authHeader, 7);
        
        // Decode and validate token
        try {
            $decoded = json_decode(base64_decode($token), true);
            
            if (!$decoded) {
                return false;
            }
            
            // Check token expiration
            if (isset($decoded['exp']) && $decoded['exp'] < time()) {
                return false;
            }

            if (array_key_exists('status', $decoded) && (int) $decoded['status'] === 0) {
                return false;
            }
            
            // Verify it's a team token
            if (!isset($decoded['role']) || $decoded['role'] !== 'team') {
                return false;
            }
            
            return $decoded;
        } catch (\Exception $e) {
            return false;
        }
    }
}
