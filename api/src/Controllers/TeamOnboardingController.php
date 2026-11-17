<?php

namespace App\Controllers;

use App\Services\TeamOnboardingService;
use PDOException;

class TeamOnboardingController
{
    public static function pending(array $authUser)
    {
        $service = new TeamOnboardingService();

        try {
            $rows = $service->listPending();
        } catch (PDOException $e) {
            return self::databaseErrorResponse($e);
        }

        return [
            'success' => true,
            'data' => $rows
        ];
    }

    public static function show(array $authUser, int $teamOnboardingId)
    {
        $service = new TeamOnboardingService();

        try {
            $row = $service->getById($teamOnboardingId);
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

    public static function approve(array $authUser, int $teamOnboardingId)
    {
        $service = new TeamOnboardingService();

        try {
            $result = $service->approve($teamOnboardingId, $authUser);
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
            'message' => 'Team onboarding approved successfully',
            'data' => $result
        ];
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