<?php

namespace App\Services;

use App\Database\DatabaseManager;
use PDO;
use PDOException;
use Exception;

/**
 * Forgot-password flow (public, no login):
 *   1. requestOtp()    - email must belong to an active employee, OTP is emailed
 *   2. verifyOtp()     - OTP checked, a short-lived one-time reset token is returned
 *   3. resetPassword() - token + new password -> pin_hash updated
 */
class PasswordResetService
{
    public const OTP_TTL_MINUTES = 10;
    public const RESEND_COOLDOWN_SECONDS = 60;
    public const MAX_ATTEMPTS = 3;

    /**
     * true  = tell the user when no account uses that email (what you asked for).
     * false = always answer "code sent" (prevents email enumeration).
     */
    private const REVEAL_EMAIL_EXISTS = true;

    private PDO $db;
    private EmailService $emailService;

    public function __construct()
    {
        $this->db = DatabaseManager::getPdo();
        $this->emailService = new EmailService();
    }

    private function findActiveEmployeeByEmail(string $email): ?array
    {
        $stmt = $this->db->prepare("
            SELECT employee_id, first_name, last_name, username, email, pin_hash, branch_id
            FROM employees
            WHERE LOWER(TRIM(REPLACE(REPLACE(REPLACE(email, '\r', ''), '\n', ''), '\t', ''))) = LOWER(:email)
              AND is_active = 1
            LIMIT 1
        ");
        $stmt->execute([':email' => $email]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ?: null;
    }

    public function requestOtp(string $email, ?string $ip = null): array
    {
        $email = AccountValidator::normalizeEmail($email);
        if (($err = AccountValidator::emailError($email)) !== null) {
            return ['success' => false, 'status' => 422, 'message' => $err];
        }

        $employee = $this->findActiveEmployeeByEmail($email);
        if (!$employee) {
            if (self::REVEAL_EMAIL_EXISTS) {
                $check = $this->db->prepare("
                    SELECT employee_id, email, is_active
                    FROM employees
                    WHERE LOWER(TRIM(REPLACE(REPLACE(REPLACE(email, '\r', ''), '\n', ''), '\t', ''))) = LOWER(:email)
                    LIMIT 1
                ");
                $check->execute([':email' => $email]);
                $found = $check->fetch(PDO::FETCH_ASSOC);

                return [
                    'success' => false,
                    'status' => 404,
                    'message' => 'No active account is registered with this email address.',
                    'debug' => [
                        'normalized_email' => $email,
                        'db_name' => $this->db->query('SELECT DATABASE()')->fetchColumn(),
                        'row_exists_inactive' => $found ?: null,
                    ],
                ];
            }
            return $this->sentResponse();
        }

        $employeeId = (int) $employee['employee_id'];

        // Resend cooldown
        $cd = $this->db->prepare("
            SELECT TIMESTAMPDIFF(SECOND, created_at, NOW())
            FROM password_reset_requests
            WHERE employee_id = :id
            ORDER BY created_at DESC LIMIT 1
        ");
        $cd->execute([':id' => $employeeId]);
        $elapsed = $cd->fetchColumn();
        if ($elapsed !== false && (int) $elapsed < self::RESEND_COOLDOWN_SECONDS) {
            $wait = self::RESEND_COOLDOWN_SECONDS - (int) $elapsed;
            return [
                'success' => false, 'status' => 429, 'retry_after' => $wait,
                'message' => "Please wait {$wait} second(s) before requesting another code.",
            ];
        }

        $otp = (string) random_int(100000, 999999);

        $this->db->prepare("DELETE FROM password_reset_requests WHERE employee_id = :id")
            ->execute([':id' => $employeeId]);

        $this->db->prepare("
            INSERT INTO password_reset_requests (employee_id, otp_hash, attempts_left, ip_address, expires_at)
            VALUES (:id, :hash, :attempts, :ip, DATE_ADD(NOW(), INTERVAL " . (int) self::OTP_TTL_MINUTES . " MINUTE))
        ")->execute([
            ':id' => $employeeId,
            ':hash' => hash('sha256', $otp),
            ':attempts' => self::MAX_ATTEMPTS,
            ':ip' => $ip,
        ]);

        // 'pin_reset' reuses your existing "change password" OTP email template.
        $fullName = trim(($employee['first_name'] ?? '') . ' ' . ($employee['last_name'] ?? ''));
        if (!$this->emailService->sendOtpEmail($employee['email'], $fullName, $otp, 'pin_reset')) {
            $this->db->prepare("DELETE FROM password_reset_requests WHERE employee_id = :id")
                ->execute([':id' => $employeeId]);
            return ['success' => false, 'status' => 500, 'message' => 'Unable to send the verification code. Please try again later.'];
        }

        return $this->sentResponse();
    }

    private function sentResponse(): array
    {
        return [
            'success' => true,
            'message' => 'Verification code sent to your email address.',
            'expires_in' => self::OTP_TTL_MINUTES . ' minutes',
            'resend_in' => self::RESEND_COOLDOWN_SECONDS,
        ];
    }

    public function verifyOtp(string $email, string $otp): array
    {
        $generic = ['success' => false, 'status' => 400, 'message' => 'Invalid or expired verification code.'];

        $employee = $this->findActiveEmployeeByEmail(AccountValidator::normalizeEmail($email));
        if (!$employee) {
            return $generic;
        }

        $this->db->beginTransaction();
        try {
            $stmt = $this->db->prepare("
                SELECT reset_id, otp_hash, attempts_left
                FROM password_reset_requests
                WHERE employee_id = :id AND verified_at IS NULL AND expires_at > NOW()
                FOR UPDATE
            ");
            $stmt->execute([':id' => $employee['employee_id']]);
            $row = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$row) {
                $this->db->rollBack();
                return ['success' => false, 'status' => 400, 'message' => 'Code has expired or no pending request exists. Request a new one.'];
            }

            if (!hash_equals($row['otp_hash'], hash('sha256', $otp))) {
                $left = (int) $row['attempts_left'] - 1;
                if ($left <= 0) {
                    $this->db->prepare("DELETE FROM password_reset_requests WHERE reset_id = :id")
                        ->execute([':id' => $row['reset_id']]);
                    $this->db->commit();
                    return ['success' => false, 'status' => 400, 'message' => 'Too many invalid attempts. Request a new code.'];
                }
                $this->db->prepare("UPDATE password_reset_requests SET attempts_left = :n WHERE reset_id = :id")
                    ->execute([':n' => $left, ':id' => $row['reset_id']]);
                $this->db->commit();
                return ['success' => false, 'status' => 400, 'message' => "Invalid code. You have {$left} attempt(s) remaining."];
            }

            // OTP ok -> issue one-time reset token (valid another OTP_TTL_MINUTES)
            $token = bin2hex(random_bytes(32));
            $this->db->prepare("
                UPDATE password_reset_requests
                SET verified_at = NOW(),
                    reset_token_hash = :t,
                    expires_at = DATE_ADD(NOW(), INTERVAL " . (int) self::OTP_TTL_MINUTES . " MINUTE)
                WHERE reset_id = :id
            ")->execute([':t' => hash('sha256', $token), ':id' => $row['reset_id']]);

            $this->db->commit();
            return ['success' => true, 'message' => 'Code verified.', 'reset_token' => $token];
        } catch (Exception $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            return ['success' => false, 'status' => 500, 'message' => 'Failed to verify code.'];
        }
    }

    public function resetPassword(string $email, string $token, string $newPassword, array $audit = []): array
    {
        $invalid = ['success' => false, 'status' => 400, 'message' => 'Reset session is invalid or has expired. Please start over.'];

        $employee = $this->findActiveEmployeeByEmail(AccountValidator::normalizeEmail($email));
        if (!$employee) {
            return $invalid;
        }

        $policyError = AccountValidator::passwordError($newPassword, ['username' => $employee['username'] ?? '']);
        if ($policyError !== null) {
            return ['success' => false, 'status' => 422, 'message' => $policyError];
        }
        if (!empty($employee['pin_hash']) && password_verify($newPassword, $employee['pin_hash'])) {
            return ['success' => false, 'status' => 422, 'message' => 'New password must be different from your current password.'];
        }

        $this->db->beginTransaction();
        try {
            $stmt = $this->db->prepare("
                SELECT reset_id FROM password_reset_requests
                WHERE employee_id = :id
                  AND reset_token_hash = :t
                  AND verified_at IS NOT NULL
                  AND expires_at > NOW()
                FOR UPDATE
            ");
            $stmt->execute([':id' => $employee['employee_id'], ':t' => hash('sha256', $token)]);
            if (!$stmt->fetch(PDO::FETCH_ASSOC)) {
                $this->db->rollBack();
                return $invalid;
            }

            $this->db->prepare("UPDATE employees SET pin_hash = :h WHERE employee_id = :id")
                ->execute([':h' => password_hash($newPassword, PASSWORD_BCRYPT), ':id' => $employee['employee_id']]);

            // Token is single-use
            $this->db->prepare("DELETE FROM password_reset_requests WHERE employee_id = :id")
                ->execute([':id' => $employee['employee_id']]);

            $this->db->prepare("
                INSERT INTO audit_logs (employee_id, employee_name, branch_id, action, module, record_id, old_values, new_values, ip_address, user_agent)
                VALUES (:eid, :name, :branch, 'UPDATE', 'employees', :rid, :old, :new, :ip, :ua)
            ")->execute([
                ':eid' => $employee['employee_id'],
                ':name' => trim(($employee['first_name'] ?? '') . ' ' . ($employee['last_name'] ?? '')),
                ':branch' => $employee['branch_id'],
                ':rid' => (string) $employee['employee_id'],
                ':old' => json_encode(['pin_hash' => '[PROTECTED]', 'via' => 'forgot_password']),
                ':new' => json_encode(['pin_hash' => '[UPDATED]', 'via' => 'forgot_password']),
                ':ip' => $audit['ip_address'] ?? '127.0.0.1',
                ':ua' => $audit['user_agent'] ?? null,
            ]);

            $this->db->commit();
            return ['success' => true, 'message' => 'Password reset successfully. You can now log in.'];
        } catch (PDOException | Exception $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            return ['success' => false, 'status' => 500, 'message' => 'Failed to reset password.'];
        }
    }
}