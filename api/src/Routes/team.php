<?php

use App\Router;
use App\Controllers\AuthController;
use App\Controllers\TeamOnboardingController;
use App\Controllers\TeamRegistrationController;
use App\Middleware\TeamLoginMiddleware;
use App\Middleware\TeamOnboardingActionMiddleware;
use App\Middleware\TeamRegistrationMiddleware;

require_once __DIR__ . '/../../vendor/autoload.php';

$router = Router::get();

$router->register('POST', '/team/login', [], function ($request) {
    $validation = TeamLoginMiddleware::validateLogin();
    if (!($validation['ok'] ?? false)) {
        return [
            'status' => $validation['status'] ?? 400,
            'body' => $validation['body'] ?? [
                'success' => false,
                'message' => 'Invalid request'
            ]
        ];
    }

    $response = AuthController::teamLogin($validation['data']);
    return ['status' => ($response['success'] ?? false) ? 200 : 401, 'body' => $response];
});

$router->register('POST', '/team/logout', [], function ($request) {
    return ['status' => 200, 'body' => AuthController::teamLogout()];
});

$router->register('GET', '/team/profile', [], function ($request) {
    return ['status' => null, 'body' => AuthController::teamProfile()];
});

$router->register('POST', '/team/register-from-qr', [], function ($request) {
    $validation = TeamRegistrationMiddleware::validateRegisterFromQr();
    if (!($validation['ok'] ?? false)) {
        return [
            'status' => $validation['status'] ?? 400,
            'body' => $validation['body'] ?? [
                'success' => false,
                'message' => 'Invalid request'
            ]
        ];
    }

    return ['status' => null, 'body' => TeamRegistrationController::registerFromQr($validation['data'])];
});

$router->register('POST', '/team/register', [], function ($request) {
    $validation = TeamRegistrationMiddleware::validateRegister();
    if (!($validation['ok'] ?? false)) {
        return [
            'status' => $validation['status'] ?? 400,
            'body' => $validation['body'] ?? [
                'success' => false,
                'message' => 'Invalid request'
            ]
        ];
    }

    return ['status' => null, 'body' => TeamRegistrationController::register($validation['data'])];
});

$router->register('GET', '#^team/onboarding/(\d+)$#', [], function ($request) {
    $params = $request['params'] ?? [];
    $id = $params[0] ?? null;
    $auth = TeamOnboardingActionMiddleware::authenticateAdmin();
    if (!($auth['ok'] ?? false)) {
        return [
            'status' => $auth['status'] ?? 401,
            'body' => $auth['body'] ?? [
                'success' => false,
                'message' => 'Unauthorized'
            ]
        ];
    }

    $idValidation = TeamOnboardingActionMiddleware::validateOnboardingId($id);
    if (!($idValidation['ok'] ?? false)) {
        return [
            'status' => $idValidation['status'] ?? 400,
            'body' => $idValidation['body'] ?? [
                'success' => false,
                'message' => 'Invalid request'
            ]
        ];
    }

    $response = TeamOnboardingController::show($auth['data']['auth'], $idValidation['data']['id']);
    return ['status' => ($response['success'] ?? false) ? 200 : 404, 'body' => $response];
});

// List pending team onboardings
$router->register('GET', '/team/onboarding/pending', [], function ($request) {
    $auth = TeamOnboardingActionMiddleware::authenticateAdmin();
    if (!($auth['ok'] ?? false)) {
        return [
            'status' => $auth['status'] ?? 401,
            'body' => $auth['body'] ?? [
                'success' => false,
                'message' => 'Unauthorized'
            ]
        ];
    }

    $response = TeamOnboardingController::pending($auth['data']['auth']);
    return ['status' => ($response['success'] ?? false) ? 200 : 400, 'body' => $response];
});

$router->register('POST', '#^team/onboarding/(\d+)/approve$#', [], function ($request) {
    $params = $request['params'] ?? [];
    $id = $params[0] ?? null;
    $auth = TeamOnboardingActionMiddleware::authenticateAdmin();
    if (!($auth['ok'] ?? false)) {
        return [
            'status' => $auth['status'] ?? 401,
            'body' => $auth['body'] ?? [
                'success' => false,
                'message' => 'Unauthorized'
            ]
        ];
    }

    $idValidation = TeamOnboardingActionMiddleware::validateOnboardingId($id);
    if (!($idValidation['ok'] ?? false)) {
        return [
            'status' => $idValidation['status'] ?? 400,
            'body' => $idValidation['body'] ?? [
                'success' => false,
                'message' => 'Invalid request'
            ]
        ];
    }

    $response = TeamOnboardingController::approve($auth['data']['auth'], $idValidation['data']['id']);
    return ['status' => ($response['success'] ?? false) ? 200 : 400, 'body' => $response];
});
