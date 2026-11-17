<?php

namespace App\Controllers;

use App\Services\QRCodeService;
use App\Services\AuditLogService;
use PDO;
use PDOException;

/**
 * QR Code Controller
 *
 * MySQL-backed QR code lifecycle for team onboarding.
 */
class QRCodeController
{
    /**
     * Generate and store a QR code.
    *
    * POST /qrcode/generate
    * Admin token only.
    * Body: {"role": "supervisor|inventory_clerk|cashier", "branch_id": 1 (optional, defaults to admin's branch), "expires_at": "2026-12-31", "referred_by": "optional"}
     */
    public static function generate(array $authUser, array $payload)
    {
        $service = new QRCodeService();

        try {
            $record = $service->generate($authUser, $payload);
            self::recordAudit('CREATE', $record['id'] ?? null, $authUser, null, $record);
        } catch (PDOException $e) {
            if ((int)$e->getCode() === 23000) {
                return [
                    'success' => false,
                    'message' => 'QR code already exists or invalid branch',
                    'error' => 'DUPLICATE_CODE_OR_INVALID_FK'
                ];
            }

            return self::databaseErrorResponse($e);
        }

        return [
            'success' => true,
            'message' => 'QR code generated successfully',
            'data' => $record
        ];
    }

    /**
     * Verify a QR code by code.
     *
     * POST /qrcode/verify
     * Public endpoint for React Native scanner.
     */
    public static function verify(string $code)
    {
        $service = new QRCodeService();

        try {
            $data = $service->verifyByCode($code);
        } catch (\InvalidArgumentException $e) {
            return [
                'success' => false,
                'message' => $e->getMessage()
            ];
        } catch (\RuntimeException $e) {
            return [
                'success' => false,
                'message' => $e->getMessage()
            ];
        } catch (PDOException $e) {
            return self::databaseErrorResponse($e);
        }

        return [
            'success' => true,
            'message' => 'QR code verified successfully',
            'data' => $data
        ];
    }

    /**
     * Get all QR codes.
     *
     * GET /qrcode
     */
    public static function index(array $authUser)
    {
        $service = new QRCodeService();

        try {
            $rows = $service->listAll();
        } catch (PDOException $e) {
            return self::databaseErrorResponse($e);
        }

        return [
            'success' => true,
            'data' => $rows
        ];
    }

    /**
     * Get one QR code by ID.
     *
     * GET /qrcode/{id}
     */
    public static function show(array $authUser, string $id)
    {
        $service = new QRCodeService();

        try {
            $row = $service->findById($id);
        } catch (\InvalidArgumentException $e) {
            return [
                'success' => false,
                'message' => $e->getMessage()
            ];
        } catch (PDOException $e) {
            return self::databaseErrorResponse($e);
        }

        return [
            'success' => true,
            'data' => $row
        ];
    }

    /**
     * Delete one QR code by ID.
     *
     * DELETE /qrcode/{id}
     */
    public static function destroy(array $authUser, string $id)
    {
        $service = new QRCodeService();

        try {
            $existing = $service->findById($id);
            $deleted = $service->deleteById($id);
        } catch (PDOException $e) {
            return self::databaseErrorResponse($e);
        }

        if (!$deleted) {
            return [
                'success' => false,
                'message' => 'QR code not found'
            ];
        }
        self::recordAudit('DELETE', $id, $authUser, $existing, null);

        return [
            'success' => true,
            'message' => 'QR code deleted successfully'
        ];
    }

    private static function recordAudit(string $action, $recordId, array $authUser, ?array $oldValues, ?array $newValues): void
    {
        (new AuditLogService())->record([
            'action' => $action,
            'module' => 'team_onboarding_qr_codes',
            'employee_id' => $authUser['employeeId'] ?? $authUser['employee_id'] ?? null,
            'branch_id' => $authUser['branchId'] ?? $authUser['branch_id'] ?? null,
            'record_id' => $recordId === null ? null : (string) $recordId,
            'old_values' => $oldValues,
            'new_values' => $newValues,
            'ip_address' => $_SERVER['REMOTE_ADDR'] ?? null,
            'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? null,
        ]);
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
