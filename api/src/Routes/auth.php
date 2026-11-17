<?php

use App\Router;
use App\Controllers\AuthController;
use App\Middleware\TeamLoginMiddleware;
use App\Middleware\AuthMiddleware;

require_once __DIR__ . '/../../vendor/autoload.php';

$router = Router::get();

$router->register('POST', '/login', [], function ($request) {
    $input = json_decode(file_get_contents('php://input'), true) ?: [];
    $username = isset($input['username']) ? trim((string)$input['username']) : '';
    $credential = null;
    if (isset($input['password'])) {
        $credential = (string)$input['password'];
    } elseif (isset($input['pin'])) {
        $credential = (string)$input['pin'];
    }

    if ($username === '' || $credential === null || trim($credential) === '') {
        return [
            'status' => 400,
            'body' => [
                'success' => false,
                'message' => 'username and password/pin are required'
            ]
        ];
    }

    $response = AuthController::login([
        'username' => $username,
        'credential' => trim($credential),
        '_audit' => [
            'ip_address' => $_SERVER['REMOTE_ADDR'] ?? null,
            'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? null,
        ]
    ]);
    return ['status' => ($response['success'] ?? false) ? 200 : 401, 'body' => $response];
});

$router->register('POST', '/logout', [AuthMiddleware::class], function ($request) {
    return ['status' => 200, 'body' => AuthController::logout($request)];
});

$router->register('GET', '/auth/profile', [AuthMiddleware::class], function ($request) {
    return ['status' => null, 'body' => AuthController::profile()];
});

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

    $data = $validation['data'] ?? [];
    $data['_audit'] = [
        'ip_address' => $_SERVER['REMOTE_ADDR'] ?? null,
        'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? null,
    ];

    $response = AuthController::teamLogin($data);
    return ['status' => ($response['success'] ?? false) ? 200 : 401, 'body' => $response];
});

$router->register('POST', '/team/logout', [AuthMiddleware::class], function ($request) {
    return ['status' => 200, 'body' => AuthController::teamLogout($request)];
});

$router->register('GET', '/team/profile', [AuthMiddleware::class], function ($request) {
    return ['status' => null, 'body' => AuthController::teamProfile()];
});