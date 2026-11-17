<?php

namespace App\Services;

use App\Models\TeamOnboarding;
use App\Models\TeamOnboardingQrCode;
use App\Models\Role;
use App\Services\AuditLogService;
use PDO;
use PDOException;

class TeamRegistrationService
{
    private TeamOnboarding $teamOnboarding;
    private TeamOnboardingQrCode $teamOnboardingQrCode;
    private PDO $pdo;

    public function __construct(?TeamOnboarding $teamOnboarding = null, ?TeamOnboardingQrCode $teamOnboardingQrCode = null)
    {
        $this->pdo = TeamOnboarding::createConnection();
        $this->teamOnboarding = $teamOnboarding instanceof TeamOnboarding
            ? $teamOnboarding
            : new TeamOnboarding($this->pdo);
        $this->teamOnboardingQrCode = $teamOnboardingQrCode instanceof TeamOnboardingQrCode
            ? $teamOnboardingQrCode
            : new TeamOnboardingQrCode($this->pdo);
    }

    /**
     * Register a team member from QR and return enriched result.
     */
    public function registerFromQr(array $data): array
    {
        $qrCode = $this->teamOnboardingQrCode->findById($data['qr_code_id']);
        if (!$qrCode) {
            throw new \InvalidArgumentException('Invalid QR code');
        }

        if ($qrCode['status'] !== 'active') {
            throw new \RuntimeException('QR code is not active');
        }

        if ($qrCode['expires_at'] !== null && strtotime($qrCode['expires_at']) < time()) {
            $this->teamOnboardingQrCode->markExpired($qrCode['qrcode_id']);
            throw new \RuntimeException('QR code has expired');
        }

        $data = $this->validateAndNormalize($data);

        try {
            $this->pdo->beginTransaction();

            $registration = $this->teamOnboarding->create([
                'first_name' => $data['first_name'],
                'middle_name' => $data['middle_name'],
                'last_name' => $data['last_name'],
                'email' => $data['email'],
                'contact_number' => $data['contact_number'],
                'address' => $data['address'] ?? null,
                'username' => $data['username'],
                'pin' => $data['pin'],
                'branch_id' => $qrCode['branch_id'],
                'role_id' => $qrCode['role_id']
            ]);

            $this->teamOnboardingQrCode->markUsed($qrCode['qrcode_id'], $registration['team_onboarding_id']);

            $this->pdo->commit();
        } catch (PDOException $e) {
            if ($this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }

            throw $e;
        }

        $registration = $this->teamOnboarding->findById($registration['team_onboarding_id']);

        (new AuditLogService())->record([
            'action' => 'CREATE',
            'module' => 'team_onboarding',
            'branch_id' => $registration['branch_id'],
            'record_id' => (string) $registration['team_onboarding_id'],
            'new_values' => [
                'team_onboarding_id' => $registration['team_onboarding_id'],
                'username' => $registration['username'],
                'role_id' => $registration['role_id'],
                'branch_id' => $registration['branch_id'],
                'source' => 'qr',
            ],
        ]);
        (new AuditLogService())->record([
            'action' => 'UPDATE',
            'module' => 'team_onboarding_qr_codes',
            'branch_id' => $registration['branch_id'],
            'record_id' => (string) $registration['qrcode_id'],
            'new_values' => [
                'status' => 'used',
                'team_onboarding_id' => $registration['team_onboarding_id'],
            ],
        ]);

        return [
            'teamOnboardingId' => (string)$registration['team_onboarding_id'],
            'username' => $registration['username'],
            'firstName' => $registration['first_name'],
            'middleName' => $registration['middle_name'],
            'lastName' => $registration['last_name'],
            'name' => $registration['full_name'],
            'role' => $registration['role'],
            'branchId' => (string)$registration['branch_id'],
            'email' => $registration['email'],
            'contactNumber' => $registration['contact_number'],
            'qrCodeId' => (string)$registration['qrcode_id'],
            'referredBy' => $registration['referred_by'],
            'status' => 'pending_approval'
        ];
    }

    public function register(array $data): array
    {
        $role = $this->resolveRole($data);

        $data = $this->validateAndNormalize($data);

        $registration = $this->teamOnboarding->create([
            'first_name' => $data['first_name'],
            'middle_name' => $data['middle_name'],
            'last_name' => $data['last_name'],
            'email' => $data['email'],
            'contact_number' => $data['contact_number'],
            'address' => $data['address'] ?? null,
            'username' => $data['username'],
            'pin' => $data['pin'],
            'branch_id' => $data['branch_id'],
            'role_id' => $role['role_id']
        ]);

        (new AuditLogService())->record([
            'action' => 'CREATE',
            'module' => 'team_onboarding',
            'branch_id' => $registration['branch_id'],
            'record_id' => (string) $registration['team_onboarding_id'],
            'new_values' => [
                'team_onboarding_id' => $registration['team_onboarding_id'],
                'username' => $registration['username'],
                'role_id' => $registration['role_id'],
                'branch_id' => $registration['branch_id'],
                'source' => 'direct',
            ],
        ]);

        return $this->formatRegistration($registration);
    }

    /**
     * Required-field, password-strength and duplicate checks shared by both signup flows.
     * Returns the data with normalized email/contact_number.
     */
    private function validateAndNormalize(array $data): array
    {
        $emailError = AccountValidator::emailError($data['email'] ?? null);
        if ($emailError) {
            throw new \RuntimeException($emailError);
        }
        $phoneError = AccountValidator::phoneError($data['contact_number'] ?? null);
        if ($phoneError) {
            throw new \RuntimeException($phoneError);
        }
        $passwordError = AccountValidator::passwordError(
            (string) ($data['pin'] ?? ''),
            ['username' => $data['username'] ?? '']
        );
        if ($passwordError) {
            throw new \RuntimeException($passwordError);
        }

        $data['email'] = AccountValidator::normalizeEmail($data['email']);
        $data['contact_number'] = AccountValidator::normalizePhone($data['contact_number']);

        if ($this->teamOnboarding->usernameExistsInOnboarding($data['username'])) {
            throw new \RuntimeException('Username already exists in onboarding');
        }
        if ($this->teamOnboarding->usernameExistsInEmployees($data['username'])) {
            throw new \RuntimeException('Username already exists');
        }
        if ($this->teamOnboarding->emailExistsInOnboarding($data['email'])) {
            throw new \RuntimeException('Email already exists in onboarding');
        }
        if ($this->teamOnboarding->emailExistsInEmployees($data['email'])) {
            throw new \RuntimeException('Email already exists');
        }
        if ($this->teamOnboarding->phoneExistsInOnboarding($data['contact_number'])) {
            throw new \RuntimeException('Contact number already exists in onboarding');
        }
        if ($this->teamOnboarding->phoneExistsInEmployees($data['contact_number'])) {
            throw new \RuntimeException('Contact number already exists');
        }

        return $data;
    }

    private function resolveRole(array $data): array
    {
        $roleModel = new Role($this->pdo);
        $role = !empty($data['role_id'])
            ? $roleModel->findById((int)$data['role_id'])
            : $roleModel->findByKey((string)$data['role']);

        if (!$role) {
            throw new \InvalidArgumentException('Invalid role');
        }

        return $role;
    }

    private function formatRegistration(array $registration): array
    {
        return [
            'teamOnboardingId' => (string)$registration['team_onboarding_id'],
            'username' => $registration['username'],
            'firstName' => $registration['first_name'],
            'middleName' => $registration['middle_name'],
            'lastName' => $registration['last_name'],
            'name' => $registration['full_name'],
            'role' => $registration['role'],
            'branchId' => (string)$registration['branch_id'],
            'email' => $registration['email'],
            'contactNumber' => $registration['contact_number'],
            'qrCodeId' => $registration['qrcode_id'],
            'referredBy' => $registration['referred_by'],
            'status' => 'pending_approval'
        ];
    }
}