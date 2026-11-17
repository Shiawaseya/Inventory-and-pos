<?php

namespace App\Middleware;

class TeamLoginMiddleware
{
    /**
     * Validate and normalize team login payload.
     */
    public static function validateLogin(): array
    {
        $input = json_decode(file_get_contents('php://input'), true);

        if (!is_array($input)) {
            return [
                'ok' => false,
                'status' => 400,
                'body' => [
                    'success' => false,
                    'message' => 'Invalid JSON body'
                ]
            ];
        }

        $username = trim((string) ($input['username'] ?? ''));
        $employeeId = trim((string) ($input['employeeId'] ?? ''));
        $credential = $input['password'] ?? $input['pin'] ?? null;

        if ($username === '' && $employeeId === '') {
            return [
                'ok' => false,
                'status' => 400,
                'body' => [
                    'success' => false,
                    'message' => 'username or employeeId is required'
                ]
            ];
        }

        if ($credential === null || trim((string) $credential) === '') {
            return [
                'ok' => false,
                'status' => 400,
                'body' => [
                    'success' => false,
                    'message' => 'password or pin is required'
                ]
            ];
        }

        return [
            'ok' => true,
            'data' => [
                'username' => $username !== '' ? $username : null,
                'employeeId' => $employeeId !== '' ? $employeeId : null,
                'password' => trim((string) $credential),
            ]
        ];
    }
}