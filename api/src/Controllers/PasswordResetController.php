<?php

namespace App\Controllers;

use App\Services\PasswordResetService;

class PasswordResetController
{
    private PasswordResetService $service;

    public function __construct()
    {
        $this->service = new PasswordResetService();
    }

    /** POST /auth/forgot-password/request-otp   { email } */
    public function requestOtp($request)
    {
        $in = $this->input($request);
        $email = $in['email'] ?? null;
        if (!is_string($email) || trim($email) === '') {
            return $this->fail(422, 'Email is required.');
        }
        return $this->respond($this->service->requestOtp($email, $request['_audit']['ip_address'] ?? null));
    }

    /** POST /auth/forgot-password/verify-otp   { email, otp } */
    public function verifyOtp($request)
    {
        $in = $this->input($request);
        $email = $in['email'] ?? null;
        $otp = $in['otp'] ?? null;
        if (!is_string($email) || trim($email) === '') {
            return $this->fail(422, 'Email is required.');
        }
        if (!is_string($otp) || !preg_match('/^\d{6}$/', $otp)) {
            return $this->fail(422, 'otp must be a 6-digit code.');
        }
        return $this->respond($this->service->verifyOtp($email, $otp));
    }

    /** POST /auth/forgot-password/reset   { email, reset_token, new_password, confirm_password } */
    public function reset($request)
    {
        $in = $this->input($request);
        $email = $in['email'] ?? null;
        $token = $in['reset_token'] ?? null;
        $new = $in['new_password'] ?? null;
        $confirm = $in['confirm_password'] ?? null;

        if (!is_string($email) || trim($email) === '') {
            return $this->fail(422, 'Email is required.');
        }
        if (!is_string($token) || !preg_match('/^[a-f0-9]{64}$/', $token)) {
            return $this->fail(400, 'Reset session is invalid or has expired. Please start over.');
        }
        if (!is_string($new) || $new === '') {
            return $this->fail(422, 'New password is required.');
        }
        if (!is_string($confirm) || !hash_equals($new, $confirm)) {
            return $this->fail(422, 'New password and confirm password do not match.');
        }

        $audit = $request['_audit'] ?? [
            'ip_address' => $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1',
            'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? null,
        ];
        return $this->respond($this->service->resetPassword($email, $token, $new, $audit));
    }

    private function input(array $request): array
    {
        $b = $request['body'] ?? [];
        return is_array($b) ? $b : [];
    }

    private function fail(int $status, string $message): array
    {
        return ['status' => $status, 'body' => ['success' => false, 'message' => $message]];
    }

    private function respond(array $r): array
    {
        return ['status' => $r['success'] ? 200 : ($r['status'] ?? 400), 'body' => $r];
    }
}
