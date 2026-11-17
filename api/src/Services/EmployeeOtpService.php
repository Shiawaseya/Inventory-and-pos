<?php

namespace App\Services;

use App\Database\DatabaseManager;
use PDO;
use PDOException;
use Exception;

class EmployeeOtpService
{
    public const ACTION_TYPES = ['pin_reset', 'username_change', 'email_update', 'phone_update', 'address_update'];
    private PDO $db;
    private EmailService $emailService;

    public function __construct()
    {
        $this->db = DatabaseManager::getPdo();
        $this->emailService = new EmailService();
    }

    /**
     * Request an OTP for account update.
     *
     * For pin_reset, $currentPassword is required and verified here before any OTP is sent.
     */
    public function requestOtp(int $employeeId, string $actionType, mixed $newValue, ?string $currentPassword = null): array
    {
        if (!in_array($actionType, self::ACTION_TYPES, true)) {
            return ['success' => false, 'message' => 'Unsupported account update action.'];
        }
        if ($actionType === 'username_change') {
            return ['success' => false, 'message' => 'Username changes are not supported by this endpoint.'];
        }

        // 1. Fetch current employee to deliver OTP and run checks
        $empStmt = $this->db->prepare("
            SELECT employee_id, first_name, last_name, username, email, contact_number, pin_hash
            FROM employees
            WHERE employee_id = :id AND is_active = 1
        ");
        $empStmt->execute([':id' => $employeeId]);
        $employee = $empStmt->fetch(PDO::FETCH_ASSOC);

        if (!$employee) {
            return ['success' => false, 'message' => 'Active employee record not found.'];
        }

        if (empty($employee['email'])) {
            return ['success' => false, 'message' => 'No active email registered on this employee account to receive an OTP.'];
        }

        // 2. Action-specific checks
        if ($actionType === 'pin_reset') {
            $storedHash = (string) ($employee['pin_hash'] ?? '');
            if ($currentPassword === null || $currentPassword === '' || $storedHash === '' || !password_verify($currentPassword, $storedHash)) {
                return ['success' => false, 'status' => 400, 'message' => 'Current password is incorrect.'];
            }
            if (password_verify((string) $newValue, $storedHash)) {
                return ['success' => false, 'status' => 422, 'message' => 'New password must be different from your current password.'];
            }
            $policyError = AccountValidator::passwordError((string) $newValue, ['username' => $employee['username'] ?? '']);
            if ($policyError !== null) {
                return ['success' => false, 'status' => 422, 'message' => $policyError];
            }
            $newValue = password_hash((string) $newValue, PASSWORD_BCRYPT);
        }

        if ($actionType === 'email_update') {
            if (AccountValidator::normalizeEmail((string) $employee['email']) === $newValue) {
                return ['success' => false, 'status' => 422, 'message' => 'This is already your current email address.'];
            }
            if ($this->isContactInUse('email_update', (string) $newValue, $employeeId)) {
                return ['success' => false, 'status' => 409, 'message' => 'This email address is already in use.'];
            }
        }

        if ($actionType === 'phone_update') {
            $current = AccountValidator::normalizePhone((string) ($employee['contact_number'] ?? ''));
            if ($current !== '' && $current === $newValue) {
                return ['success' => false, 'status' => 422, 'message' => 'This is already your current contact number.'];
            }
            if ($this->isContactInUse('phone_update', (string) $newValue, $employeeId)) {
                return ['success' => false, 'status' => 409, 'message' => 'This contact number is already in use.'];
            }
        }

        // 3. Serialize complex structures (like addresses) into JSON
        $serializedValue = is_array($newValue) ? json_encode($newValue) : (string) $newValue;

        // 4. Generate random 6-digit OTP and compute SHA-256
        $otp = (string) random_int(100000, 999999);
        $otpHash = hash('sha256', $otp);

        // 5. Invalidate old active requests for this action
        $delStmt = $this->db->prepare("
            DELETE FROM employee_account_verifications
            WHERE employee_id = :employee_id AND action_type = :action_type
        ");
        $delStmt->execute([
            ':employee_id' => $employeeId,
            ':action_type' => $actionType,
        ]);

        // 6. Insert OTP record with 10-minute expiry
        $insStmt = $this->db->prepare("
            INSERT INTO employee_account_verifications (
                employee_id, action_type, new_value, otp_hash, attempts_left, expires_at
            ) VALUES (
                :employee_id, :action_type, :new_value, :otp_hash, 3, DATE_ADD(NOW(), INTERVAL 10 MINUTE)
            )
        ");
        $insStmt->execute([
            ':employee_id' => $employeeId,
            ':action_type' => $actionType,
            ':new_value'   => $serializedValue,
            ':otp_hash'    => $otpHash,
        ]);

        // 7. Dispatch email
        $fullName = trim(($employee['first_name'] ?? '') . ' ' . ($employee['last_name'] ?? ''));
        if (!$this->emailService->sendOtpEmail($employee['email'], $fullName, $otp, $actionType)) {
            $this->db->prepare('DELETE FROM employee_account_verifications WHERE employee_id = :employee_id AND action_type = :action_type')
                ->execute([':employee_id' => $employeeId, ':action_type' => $actionType]);
            return ['success' => false, 'message' => 'Unable to send the verification code. Please try again later.'];
        }

        return [
            'success' => true,
            'message' => 'Verification code sent to your registered email address.',
            'expires_in' => '10 minutes'
        ];
    }

    /**
     * True if another employee, or a pending team-onboarding record, already uses this email/phone.
     * $value must already be normalized (AccountValidator::normalizeEmail / normalizePhone).
     */
    private function isContactInUse(string $actionType, string $value, int $excludeEmployeeId): bool
    {
        if ($actionType === 'email_update') {
            // Column collation is case-insensitive, so a plain "=" is enough.
            $stmt = $this->db->prepare("SELECT 1 FROM employees WHERE TRIM(email) = :v AND employee_id <> :id LIMIT 1");
            $stmt->execute([':v' => $value, ':id' => $excludeEmployeeId]);
            if ($stmt->fetchColumn()) {
                return true;
            }
            $stmt = $this->db->prepare("SELECT 1 FROM team_onboarding WHERE TRIM(email) = :v AND approved_by_employee_id IS NULL LIMIT 1");
            $stmt->execute([':v' => $value]);
            return (bool) $stmt->fetchColumn();
        }

        if ($actionType === 'phone_update') {
            $variants = AccountValidator::phoneVariants($value);
            $in = implode(',', array_fill(0, count($variants), '?'));

            $stmt = $this->db->prepare(
                "SELECT 1 FROM employees
                 WHERE REGEXP_REPLACE(contact_number, '[^0-9+]', '') IN ($in) AND employee_id <> ? LIMIT 1"
            );
            $stmt->execute(array_merge($variants, [$excludeEmployeeId]));
            if ($stmt->fetchColumn()) {
                return true;
            }
            $stmt = $this->db->prepare(
                "SELECT 1 FROM team_onboarding
                 WHERE REGEXP_REPLACE(contact_number, '[^0-9+]', '') IN ($in) AND approved_by_employee_id IS NULL LIMIT 1"
            );
            $stmt->execute($variants);
            return (bool) $stmt->fetchColumn();
        }

        return false;
    }

    /**
     * Validate OTP and apply update within a single transaction
     */
    public function verifyAndApply(int $employeeId, string $actionType, string $otp, mixed $auditContext = []): array
    {
        if (!in_array($actionType, self::ACTION_TYPES, true) || $actionType === 'username_change') {
            return ['success' => false, 'message' => 'Unsupported account update action.'];
        }

        $ipAddress = is_array($auditContext) ? ($auditContext['ip_address'] ?? '127.0.0.1') : (string)$auditContext;
        $userAgent = is_array($auditContext) ? ($auditContext['user_agent'] ?? null) : ($_SERVER['HTTP_USER_AGENT'] ?? null);

        $this->db->beginTransaction();

        try {
            // 1. Lock and retrieve current verification record
            $stmt = $this->db->prepare("
                SELECT verification_id, otp_hash, attempts_left, new_value
                FROM employee_account_verifications
                WHERE employee_id = :employee_id
                  AND action_type = :action_type
                  AND expires_at > NOW()
                FOR UPDATE
            ");
            $stmt->execute([
                ':employee_id' => $employeeId,
                ':action_type' => $actionType,
            ]);
            $verification = $stmt->fetch();

            if (!$verification) {
                $this->db->rollBack();
                return ['success' => false, 'message' => 'OTP has expired or no pending request exists.'];
            }

            // 2. Validate OTP Hash
            $submittedHash = hash('sha256', $otp);
            if (!hash_equals($verification['otp_hash'], $submittedHash)) {
                $attemptsLeft = $verification['attempts_left'] - 1;

                if ($attemptsLeft <= 0) {
                    $delStmt = $this->db->prepare("
                        DELETE FROM employee_account_verifications WHERE verification_id = :id
                    ");
                    $delStmt->execute([':id' => $verification['verification_id']]);
                    $this->db->commit();
                    return ['success' => false, 'message' => 'Too many invalid attempts. Request a new OTP.'];
                }

                $decStmt = $this->db->prepare("
                    UPDATE employee_account_verifications
                    SET attempts_left = attempts_left - 1
                    WHERE verification_id = :id
                ");
                $decStmt->execute([':id' => $verification['verification_id']]);
                $this->db->commit();
                return ['success' => false, 'message' => "Invalid OTP. You have {$attemptsLeft} attempt(s) remaining."];
            }

            // 3. Fetch employee row and current address for audit logging
            $empStmt = $this->db->prepare("
                SELECT e.*, a.street_address, a.barangay, a.city_municipality, a.province, a.region, a.postal_code, a.psgc_code
                FROM employees e
                LEFT JOIN addresses a ON e.address_id = a.address_id
                WHERE e.employee_id = :id
            ");
            $empStmt->execute([':id' => $employeeId]);
            $currentEmp = $empStmt->fetch();

            $employeeName = trim(($currentEmp['first_name'] ?? '') . ' ' . ($currentEmp['last_name'] ?? ''));
            $branchId = $currentEmp['branch_id'];

            $oldValues = [];
            $newValues = [];

            // 4. Handle State Mutation
            switch ($actionType) {
                case 'address_update':
                    $addrData = json_decode($verification['new_value'], true);
                    if (!$addrData || !is_array($addrData)) {
                        throw new Exception("Corrupted address payload.");
                    }

                    $oldValues = [
                        'address_id'        => $currentEmp['address_id'],
                        'street_address'    => $currentEmp['street_address'],
                        'barangay'          => $currentEmp['barangay'],
                        'city_municipality' => $currentEmp['city_municipality'],
                        'province'          => $currentEmp['province'],
                        'region'            => $currentEmp['region'],
                        'postal_code'       => $currentEmp['postal_code'],
                        'psgc_code'         => $currentEmp['psgc_code']
                    ];

                    if (!empty($currentEmp['address_id'])) {
                        $addrStmt = $this->db->prepare("
                            UPDATE addresses
                            SET street_address = :street_address,
                                barangay = :barangay,
                                city_municipality = :city_municipality,
                                province = :province,
                                region = :region,
                                postal_code = :postal_code,
                                psgc_code = :psgc_code
                            WHERE address_id = :address_id
                        ");
                        $addrStmt->execute([
                            ':street_address'    => $addrData['street_address'] ?? null,
                            ':barangay'          => $addrData['barangay'] ?? null,
                            ':city_municipality' => $addrData['city_municipality'] ?? null,
                            ':province'          => $addrData['province'] ?? null,
                            ':region'            => $addrData['region'] ?? null,
                            ':postal_code'       => $addrData['postal_code'] ?? null,
                            ':psgc_code'         => $addrData['psgc_code'] ?? null,
                            ':address_id'        => $currentEmp['address_id'],
                        ]);
                        $assignedAddressId = $currentEmp['address_id'];
                    } else {
                        $addrStmt = $this->db->prepare("
                            INSERT INTO addresses (
                                street_address, barangay, city_municipality, province, region, postal_code, psgc_code
                            ) VALUES (
                                :street_address, :barangay, :city_municipality, :province, :region, :postal_code, :psgc_code
                            )
                        ");
                        $addrStmt->execute([
                            ':street_address'    => $addrData['street_address'] ?? null,
                            ':barangay'          => $addrData['barangay'] ?? null,
                            ':city_municipality' => $addrData['city_municipality'] ?? null,
                            ':province'          => $addrData['province'] ?? null,
                            ':region'            => $addrData['region'] ?? null,
                            ':postal_code'       => $addrData['postal_code'] ?? null,
                            ':psgc_code'         => $addrData['psgc_code'] ?? null,
                        ]);
                        $assignedAddressId = (int) $this->db->lastInsertId();

                        $linkStmt = $this->db->prepare("UPDATE employees SET address_id = :aid WHERE employee_id = :eid");
                        $linkStmt->execute([':aid' => $assignedAddressId, ':eid' => $employeeId]);
                    }

                    $newValues = array_merge(['address_id' => $assignedAddressId], $addrData);
                    break;

                case 'email_update':
                    // Re-check: someone may have taken it between request and verify.
                    if ($this->isContactInUse('email_update', $verification['new_value'], $employeeId)) {
                        $this->db->rollBack();
                        return ['success' => false, 'status' => 409, 'message' => 'This email address is already in use.'];
                    }

                    $oldValues = ['email' => $currentEmp['email']];
                    $newValues = ['email' => $verification['new_value']];

                    $uStmt = $this->db->prepare("UPDATE employees SET email = :val WHERE employee_id = :id");
                    $uStmt->execute([':val' => $verification['new_value'], ':id' => $employeeId]);
                    break;

                case 'phone_update':
                    if ($this->isContactInUse('phone_update', $verification['new_value'], $employeeId)) {
                        $this->db->rollBack();
                        return ['success' => false, 'status' => 409, 'message' => 'This contact number is already in use.'];
                    }

                    $oldValues = ['contact_number' => $currentEmp['contact_number']];
                    $newValues = ['contact_number' => $verification['new_value']];

                    $uStmt = $this->db->prepare("UPDATE employees SET contact_number = :val WHERE employee_id = :id");
                    $uStmt->execute([':val' => $verification['new_value'], ':id' => $employeeId]);
                    break;

                case 'pin_reset':
                    $oldValues = ['pin_hash' => '[PROTECTED]'];
                    $newValues = ['pin_hash' => '[UPDATED]'];

                    $uStmt = $this->db->prepare("UPDATE employees SET pin_hash = :val WHERE employee_id = :id");
                    $uStmt->execute([':val' => $verification['new_value'], ':id' => $employeeId]);
                    break;

                default:
                    throw new Exception("Unsupported action type: {$actionType}");
            }

            // 5. Invalidate used OTP
            $delStmt = $this->db->prepare("DELETE FROM employee_account_verifications WHERE verification_id = :id");
            $delStmt->execute([':id' => $verification['verification_id']]);

            // 6. Record to audit_logs (matches enum: UPDATE, module: employees)
            $auditStmt = $this->db->prepare("
                INSERT INTO audit_logs (
                    employee_id, employee_name, branch_id, action, module, record_id, old_values, new_values, ip_address, user_agent
                ) VALUES (
                    :employee_id, :employee_name, :branch_id, 'UPDATE', 'employees', :record_id, :old_values, :new_values, :ip_address, :user_agent
                )
            ");
            $auditStmt->execute([
                ':employee_id'   => $employeeId,
                ':employee_name' => $employeeName,
                ':branch_id'     => $branchId,
                ':record_id'     => (string) $employeeId,
                ':old_values'    => json_encode($oldValues),
                ':new_values'    => json_encode($newValues),
                ':ip_address'    => $ipAddress,
                ':user_agent'    => $userAgent,
            ]);

            $this->db->commit();
            return ['success' => true, 'message' => 'Account update verified and saved successfully.'];

        } catch (PDOException $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            // 23000 = integrity constraint violation (e.g. uq_employees_email)
            if ($e->getCode() === '23000') {
                return ['success' => false, 'status' => 409, 'message' => 'That value is already in use.'];
            }
            return ['success' => false, 'message' => 'Failed to apply update.'];
        } catch (Exception $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            return ['success' => false, 'message' => 'Failed to apply update: ' . $e->getMessage()];
        }
    }
}