<?php

namespace App\Controllers;

use App\Services\TeamRegistrationService;
use PDO;
use PDOException;

/**
 * Team Registration Controller
 *
 * Handles team member registration from QR codes
 */
class TeamRegistrationController
{
    public static function register(array $input)
    {
        $service = new TeamRegistrationService();

        try {
            $registration = $service->register($input);
            return self::registrationResponse($registration);
        } catch (\InvalidArgumentException $e) {
            http_response_code(400);
            return ['success' => false, 'message' => $e->getMessage()];
        } catch (\RuntimeException $e) {
            http_response_code(
                strpos($e->getMessage(), 'already exists') !== false ? 409 : 400
            );
            return ['success' => false, 'message' => $e->getMessage()];
        } catch (PDOException $e) {
            return self::databaseErrorResponse($e);
        }
    }

    private static function registrationResponse(array $registration): array
    {
        $tokenConfig = require __DIR__ . '/../../config/team_auth.php';
        $token = self::generateToken([
            'teamOnboardingId' => $registration['teamOnboardingId'],
            'username' => $registration['username'],
            'firstName' => $registration['firstName'],
            'middleName' => $registration['middleName'],
            'lastName' => $registration['lastName'],
            'name' => $registration['name'],
            'role' => $registration['role'],
            'branchId' => $registration['branchId'],
            'email' => $registration['email'],
            'contactNumber' => $registration['contactNumber'],
            'status' => 'pending_approval',
            'iat' => time(),
            'exp' => time() + $tokenConfig['token']['expiration']
        ]);

        return [
            'success' => true,
            'message' => 'Registration submitted successfully. Awaiting approval.',
            'token' => $token,
            'registration' => $registration
        ];
    }

    /**
     * Register team member account from QR code (stores in team_onboarding)
     *
     * POST /team/register-from-qr
     */
    public static function registerFromQr(array $input)
    {
        $service = new TeamRegistrationService();

        try {
            $registration = $service->registerFromQr($input);

            // Generate temporary token
            $tokenConfig = require __DIR__ . '/../../config/team_auth.php';
            $token = self::generateToken([
                'teamOnboardingId' => $registration['teamOnboardingId'],
                'username' => $registration['username'],
                'firstName' => $registration['firstName'],
                'middleName' => $registration['middleName'],
                'lastName' => $registration['lastName'],
                'name' => $registration['name'],
                'role' => $registration['role'],
                'branchId' => $registration['branchId'],
                'status' => 'pending_approval',
                'iat' => time(),
                'exp' => time() + $tokenConfig['token']['expiration']
            ]);

            return [
                'success' => true,
                'message' => 'Registration submitted successfully. Awaiting approval.',
                'token' => $token,
                'registration' => [
                    'teamOnboardingId' => $registration['teamOnboardingId'],
                    'username' => $registration['username'],
                    'firstName' => $registration['firstName'],
                    'middleName' => $registration['middleName'],
                    'lastName' => $registration['lastName'],
                    'name' => $registration['name'],
                    'role' => $registration['role'],
                    'branchId' => $registration['branchId'],
                    'email' => $registration['email'],
                    'contactNumber' => $registration['contactNumber'],
                    'qrCodeId' => $registration['qrCodeId'],
                    'referredBy' => $registration['referredBy'],
                    'status' => 'pending_approval'
                ]
            ];

        } catch (\InvalidArgumentException $e) {
            http_response_code(404);
            return [
                'success' => false,
                'message' => $e->getMessage()
            ];
        } catch (\RuntimeException $e) {
            $statusCode = strpos($e->getMessage(), 'already exists') !== false ? 409 : 400;
            http_response_code($statusCode);
            return [
                'success' => false,
                'message' => $e->getMessage()
            ];
        } catch (PDOException $e) {
            return self::databaseErrorResponse($e);
        }
    }

    /**
     * Generate authentication token
     */
    private static function generateToken($data)
    {
        return base64_encode(json_encode($data));
    }

    private static function databaseErrorResponse(PDOException $e)
    {
        http_response_code(500);
        return [
            'success' => false,
            'message' => 'Database error',
            'error' => APP_DEBUG ? $e->getMessage() : 'DATABASE_ERROR'
        ];
    }

}
