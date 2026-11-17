<?php

namespace App\Middleware;

class TeamOnboardingActionMiddleware
{
    public static function authenticateAdmin(): array
    {
        $headers = getallheaders();
        if (!isset($headers['Authorization'])) {
            return [
                'ok' => false,
                'status' => 401,
                'body' => [
                    'success' => false,
                    'message' => 'Unauthorized'
                ]
            ];
        }

        if (!preg_match('/Bearer\s(\S+)/', $headers['Authorization'], $matches)) {
            return [
                'ok' => false,
                'status' => 401,
                'body' => [
                    'success' => false,
                    'message' => 'Unauthorized'
                ]
            ];
        }

        $decoded = json_decode(base64_decode($matches[1]), true);
        if (!is_array($decoded)) {
            return [
                'ok' => false,
                'status' => 401,
                'body' => [
                    'success' => false,
                    'message' => 'Unauthorized'
                ]
            ];
        }

        if (isset($decoded['exp']) && time() > (int)$decoded['exp']) {
            return [
                'ok' => false,
                'status' => 401,
                'body' => [
                    'success' => false,
                    'message' => 'Unauthorized'
                ]
            ];
        }

        // Only sales-oic may perform team onboarding actions
        if (($decoded['role'] ?? null) !== 'sales-oic') {
            return [
                'ok' => false,
                'status' => 403,
                'body' => [
                    'success' => false,
                    'message' => 'Forbidden'
                ]
            ];
        }

        return [
            'ok' => true,
            'data' => [
                'auth' => $decoded
            ]
        ];
    }

    public static function validateOnboardingId($id): array
    {
        if ($id === null || trim((string)$id) === '' || !ctype_digit((string)$id)) {
            return [
                'ok' => false,
                'status' => 400,
                'body' => [
                    'success' => false,
                    'message' => 'Invalid team onboarding id'
                ]
            ];
        }

        return [
            'ok' => true,
            'data' => [
                'id' => (int)$id
            ]
        ];
    }
}