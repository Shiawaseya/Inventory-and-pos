<?php

namespace App\Middleware;

/**
 * Authentication Middleware
 * 
 * Verifies valid authorization tokens
 */
class AuthMiddleware
{
    /**
     * Check if request has valid token
     */
    public static function verify()
    {
        $token = self::getBearerToken();
        
        if (!$token) {
            http_response_code(401);
            return false;
        }
        
        return self::validateToken($token);
    }
    
    /**
     * Get token from Authorization header
     */
    private static function getBearerToken()
    {
        $headers = getallheaders();

        // Normalize header keys to lowercase for case-insensitive lookup
        $lower = is_array($headers) ? array_change_key_case($headers, CASE_LOWER) : [];

        // Lightweight debug: log headers once per request to help diagnose missing Authorization
        try {
            $logDir = __DIR__ . '/../../storage';
            if (!is_dir($logDir)) {
                @mkdir($logDir, 0755, true);
            }
            $logFile = $logDir . '/auth_headers.log';
            $entry = [
                'time' => date('c'),
                'remote_addr' => $_SERVER['REMOTE_ADDR'] ?? null,
                'request_uri' => $_SERVER['REQUEST_URI'] ?? null,
                'headers' => $headers,
            ];
            // Mask Authorization value for safety when present (case-insensitive)
            if (isset($lower['authorization'])) {
                $val = $lower['authorization'];
                $entry['headers']['Authorization'] = strlen($val) > 10 ? substr($val,0,10) . '...' : 'masked';
            }
            @file_put_contents($logFile, json_encode($entry) . PHP_EOL, FILE_APPEND | LOCK_EX);
        } catch (\Throwable $e) {
            // ignore logging errors
        }

        // Check common server-provided header keys as fallback
        $authHeader = null;
        if (isset($lower['authorization'])) {
            $authHeader = $lower['authorization'];
        } elseif (!empty($_SERVER['HTTP_AUTHORIZATION'])) {
            $authHeader = $_SERVER['HTTP_AUTHORIZATION'];
        }

        if ($authHeader !== null) {
            $matches = [];
            if (preg_match('/Bearer\s(\S+)/', $authHeader, $matches)) {
                return $matches[1];
            }
        }

        return null;
    }
    
    /**
     * Validate token
     */
    private static function validateToken($token)
    {
        // Decode token
        $decoded = self::decodeToken($token);
        
        if (!$decoded) {
            return false;
        }
        
        // Check expiration
        if (isset($decoded['exp']) && time() > $decoded['exp']) {
            http_response_code(401);
            return false;
        }

        if (array_key_exists('status', $decoded) && (int) $decoded['status'] === 0) {
            http_response_code(401);
            return false;
        }
        
        return $decoded;
    }
    
    /**
     * Decode token (simple base64 approach)
     */
    public static function decodeToken($token)
    {
        try {
            $decoded = json_decode(base64_decode($token), true);
            return $decoded;
        } catch (\Exception $e) {
            return false;
        }
    }

    /**
     * Middleware-compatible handler
     */
    public function handle($request, $next, ...$params)
    {
        $user = self::verify();
        if (!$user) {
            return [
                'status' => 401,
                'body' => ['error' => 'Unauthorized']
            ];
        }

        // attach decoded token to request
        $request['user'] = $user;

        return $next($request);
    }
}
