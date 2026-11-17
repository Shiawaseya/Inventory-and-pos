<?php

namespace App\Controllers;

use App\Services\AccountValidator;
use App\Services\EmployeeOtpService;

class EmployeeAccountController
{
    private EmployeeOtpService $otpService;

    public function __construct()
    {
        $this->otpService = new EmployeeOtpService();
    }

    /**
     * POST /employee/account/request-otp
     *
     * pin_reset (change password) body:
     *   { action_type, current_password, new_value, confirm_password }
     */
    public function requestOtp($request)
    {
        $employeeId = $this->employeeId($request);
        if ($employeeId <= 0) {
            return ['status' => 401, 'body' => ['success' => false, 'message' => 'Unauthorized']];
        }

        $input = $this->input($request);
        $actionType = $input['action_type'] ?? null;
        $newValue = $input['new_value'] ?? null;

        if (!is_string($actionType) || !in_array($actionType, EmployeeOtpService::ACTION_TYPES, true)) {
            return ['status' => 422, 'body' => ['success' => false, 'message' => 'A valid action_type is required.']];
        }

        $validation = $this->validateNewValue($actionType, $newValue);
        if ($validation !== null) {
            return ['status' => 422, 'body' => ['success' => false, 'message' => $validation]];
        }

        $currentPassword = null;
        if ($actionType === 'pin_reset') {
            $currentPassword = $input['current_password'] ?? null;
            $confirmPassword = $input['confirm_password'] ?? null;

            if (!is_string($currentPassword) || $currentPassword === '') {
                return ['status' => 422, 'body' => ['success' => false, 'message' => 'Current password is required.']];
            }
            if (!is_string($confirmPassword) || $confirmPassword === '') {
                return ['status' => 422, 'body' => ['success' => false, 'message' => 'Please confirm your new password.']];
            }
            if (!hash_equals($newValue, $confirmPassword)) {
                return ['status' => 422, 'body' => ['success' => false, 'message' => 'New password and confirm password do not match.']];
            }
        }

        if ($actionType === 'email_update') {
            $newValue = AccountValidator::normalizeEmail($newValue);
        } elseif ($actionType === 'phone_update') {
            $newValue = AccountValidator::normalizePhone($newValue);
        }

        $response = $this->otpService->requestOtp($employeeId, $actionType, $newValue, $currentPassword);
        return ['status' => $response['success'] ? 200 : ($response['status'] ?? 400), 'body' => $response];
    }

    /**
     * POST /employee/account/verify-otp
     */
    public function verifyOtp($request)
    {
        $employeeId = $this->employeeId($request);
        if ($employeeId <= 0) {
            return ['status' => 401, 'body' => ['success' => false, 'message' => 'Unauthorized']];
        }

        $input = $this->input($request);
        $actionType = $input['action_type'] ?? null;
        $otp = $input['otp'] ?? null;

        $auditContext = $request['_audit'] ?? [
            'ip_address' => $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1',
            'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? null,
        ];

        if (!is_string($actionType) || !in_array($actionType, EmployeeOtpService::ACTION_TYPES, true)) {
            return ['status' => 422, 'body' => ['success' => false, 'message' => 'A valid action_type is required.']];
        }
        if (!is_string($otp) || !preg_match('/^\d{6}$/', $otp)) {
            return ['status' => 422, 'body' => ['success' => false, 'message' => 'otp must be a 6-digit code.']];
        }

        $response = $this->otpService->verifyAndApply($employeeId, $actionType, $otp, $auditContext);
        return ['status' => $response['success'] ? 200 : ($response['status'] ?? 400), 'body' => $response];
    }

    private function employeeId(array $request): int
    {
        $user = $request['user'] ?? [];
        return (int) ($user['employeeId'] ?? $user['employee_id'] ?? 0);
    }

    private function input(array $request): array
    {
        $input = $request['body'] ?? [];
        return is_array($input) ? $input : [];
    }

    private function validateNewValue(string $actionType, $newValue): ?string
    {
        if ($actionType === 'address_update') {
            if (!is_array($newValue)) {
                return 'new_value must be an address object for address_update.';
            }
            $allowed = ['street_address', 'barangay', 'city_municipality', 'province', 'region', 'postal_code', 'psgc_code'];
            if (array_diff(array_keys($newValue), $allowed)) {
                return 'new_value contains unsupported address fields.';
            }
            return null;
        }

        if (!is_string($newValue) || trim($newValue) === '') {
            return 'new_value is required.';
        }
        if ($actionType === 'email_update') {
            return AccountValidator::emailError($newValue);
        }
        if ($actionType === 'phone_update') {
            return AccountValidator::phoneError($newValue);
        }
        if ($actionType === 'pin_reset') {
            // Username-containment check happens in the service (it has the employee row).
            return AccountValidator::passwordError($newValue);
        }
        return null;
    }
}