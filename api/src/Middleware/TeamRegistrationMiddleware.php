<?php

namespace App\Middleware;

use App\Services\AccountValidator;

class TeamRegistrationMiddleware
{
    public static function validateRegister(): array
    {
        $input = json_decode(file_get_contents('php://input'), true);

        if (!is_array($input)) {
            return ['ok' => false, 'status' => 400, 'body' => ['success' => false, 'message' => 'Invalid JSON body']];
        }
        if ((!isset($input['contact_number']) || trim((string) $input['contact_number']) === '') && isset($input['phone'])) {
            $input['contact_number'] = $input['phone'];
        }

        foreach (['first_name', 'last_name', 'username', 'email', 'contact_number'] as $field) {
            if (!isset($input[$field]) || trim((string)$input[$field]) === '') {
                return ['ok' => false, 'status' => 400, 'body' => ['success' => false, 'message' => $field . ' is required']];
            }
        }

        if (filter_var($input['email'], FILTER_VALIDATE_EMAIL) === false) {
            return ['ok' => false, 'status' => 400, 'body' => ['success' => false, 'message' => 'email must be a valid email address']];
        }

        if ($error = self::contactAndPasswordError($input)) {
            return ['ok' => false, 'status' => 400, 'body' => ['success' => false, 'message' => $error]];
        }

        if (!isset($input['branch_id']) || !filter_var($input['branch_id'], FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]])) {
            return ['ok' => false, 'status' => 400, 'body' => ['success' => false, 'message' => 'branch_id is required and must be a positive integer']];
        }

        if ((!isset($input['role']) || trim((string)$input['role']) === '') && (!isset($input['role_id']) || !filter_var($input['role_id'], FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]))) {
            return ['ok' => false, 'status' => 400, 'body' => ['success' => false, 'message' => 'role or role_id is required']];
        }

        return [
            'ok' => true,
            'data' => [
                'first_name' => trim((string)$input['first_name']),
                'middle_name' => isset($input['middle_name']) && trim((string)$input['middle_name']) !== '' ? trim((string)$input['middle_name']) : null,
                'last_name' => trim((string)$input['last_name']),
                'email' => trim((string)$input['email']),
                'contact_number' => trim((string)$input['contact_number']),
                'username' => trim((string)$input['username']),
                'pin' => trim((string)$input['pin']),
                'branch_id' => (int)$input['branch_id'],
                'role' => isset($input['role']) ? trim((string)$input['role']) : null,
                'role_id' => isset($input['role_id']) ? (int)$input['role_id'] : null,
                'address' => self::normalizeAddress($input)
            ]
        ];
    }

    /**
     * Validate and normalize request payload for /team/register-from-qr.
     */
    public static function validateRegisterFromQr(): array
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
        if ((!isset($input['contact_number']) || trim((string) $input['contact_number']) === '') && isset($input['phone'])) {
            $input['contact_number'] = $input['phone'];
        }

        if (!isset($input['qr_code_id']) || trim((string)$input['qr_code_id']) === '') {
            return [
                'ok' => false,
                'status' => 400,
                'body' => [
                    'success' => false,
                    'message' => 'qr_code_id is required'
                ]
            ];
        }

        if (!isset($input['first_name']) || trim((string)$input['first_name']) === '') {
            return [
                'ok' => false,
                'status' => 400,
                'body' => [
                    'success' => false,
                    'message' => 'first_name is required'
                ]
            ];
        }

        if (!isset($input['last_name']) || trim((string)$input['last_name']) === '') {
            return [
                'ok' => false,
                'status' => 400,
                'body' => [
                    'success' => false,
                    'message' => 'last_name is required'
                ]
            ];
        }

        foreach (['email', 'contact_number'] as $field) {
            if (!isset($input[$field]) || trim((string) $input[$field]) === '') {
                return ['ok' => false, 'status' => 400, 'body' => ['success' => false, 'message' => $field . ' is required']];
            }
        }
        if (filter_var($input['email'], FILTER_VALIDATE_EMAIL) === false) {
            return ['ok' => false, 'status' => 400, 'body' => ['success' => false, 'message' => 'email must be a valid email address']];
        }

        if (!isset($input['username']) || trim((string)$input['username']) === '') {
            return [
                'ok' => false,
                'status' => 400,
                'body' => [
                    'success' => false,
                    'message' => 'username is required'
                ]
            ];
        }

        if ($error = self::contactAndPasswordError($input)) {
            return ['ok' => false, 'status' => 400, 'body' => ['success' => false, 'message' => $error]];
        }

        $normalized = [
            'qr_code_id' => trim((string)$input['qr_code_id']),
            'first_name' => trim((string)$input['first_name']),
            'middle_name' => isset($input['middle_name']) ? trim((string)$input['middle_name']) : null,
            'last_name' => trim((string)$input['last_name']),
            'email' => trim((string)$input['email']),
            'contact_number' => trim((string)$input['contact_number']),
            'username' => trim((string)$input['username']),
            'pin' => trim((string)$input['pin']),
            'address' => self::normalizeAddress($input)
        ];

        if ($normalized['middle_name'] === '') {
            $normalized['middle_name'] = null;
        }

        return [
            'ok' => true,
            'data' => $normalized
        ];
    }

    /**
     * Phone format + password strength (email presence/format is checked by the callers).
     */
    private static function contactAndPasswordError(array $input): ?string
    {
        if ($error = AccountValidator::phoneError((string) ($input['contact_number'] ?? ''))) {
            return $error;
        }
        if (!isset($input['pin']) || !is_string($input['pin'])) {
            return 'password is required';
        }
        return AccountValidator::passwordError(trim($input['pin']), ['username' => $input['username'] ?? '']);
    }

    private static function normalizeAddress(array $input): ?array
    {
        $address = is_array($input['address'] ?? null) ? $input['address'] : $input;
        $fields = ['street_address', 'barangay', 'city_municipality', 'province', 'region', 'postal_code', 'psgc_code'];
        $normalized = [];
        foreach ($fields as $field) {
            if (isset($address[$field]) && trim((string) $address[$field]) !== '') {
                $normalized[$field] = trim((string) $address[$field]);
            }
        }
        return $normalized !== [] ? $normalized : null;
    }
}