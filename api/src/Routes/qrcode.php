<?php

use App\Router;
use App\Controllers\QRCodeController;
use App\Middleware\QRCodeGenerateMiddleware;
use App\Middleware\QRCodeRequestMiddleware;

require_once __DIR__ . '/../../vendor/autoload.php';

$router = Router::get();

$router->register('POST', '/qrcode/generate', [], function ($request) {
    $validation = QRCodeGenerateMiddleware::validateGenerate();
    if (!($validation['ok'] ?? false)) {
        return [
            'status' => $validation['status'] ?? 400,
            'body' => $validation['body'] ?? [
                'success' => false,
                'message' => 'Invalid request'
            ]
        ];
    }

    return ['status' => null, 'body' => QRCodeController::generate($validation['data']['auth'], $validation['data']['payload'])];
});

$router->register('POST', '/qrcode/verify', [], function ($request) {
    $validation = QRCodeRequestMiddleware::validateVerify();
    if (!($validation['ok'] ?? false)) {
        return [
            'status' => $validation['status'] ?? 400,
            'body' => $validation['body'] ?? [
                'success' => false,
                'message' => 'Invalid request'
            ]
        ];
    }

    $response = QRCodeController::verify($validation['data']['code']);
    return ['status' => ($response['success'] ?? false) ? 200 : (($response['message'] ?? '') === 'QR code not found' ? 404 : 410), 'body' => $response];
});

$router->register('GET', '/qrcode', [], function ($request) {
    $auth = QRCodeRequestMiddleware::validateAuthenticatedAccess();
    if (!($auth['ok'] ?? false)) {
        return [
            'status' => $auth['status'] ?? 401,
            'body' => $auth['body'] ?? [
                'success' => false,
                'message' => 'Unauthorized'
            ]
        ];
    }

    return ['status' => 200, 'body' => QRCodeController::index($auth['data']['auth'])];
});

$router->register('GET', '#^qrcode/([^/]+)$#', [], function ($request) {
    $params = $request['params'] ?? [];
    $id = $params[0] ?? null;
    $auth = QRCodeRequestMiddleware::validateAuthenticatedAccess();
    if (!($auth['ok'] ?? false)) {
        return [
            'status' => $auth['status'] ?? 401,
            'body' => $auth['body'] ?? [
                'success' => false,
                'message' => 'Unauthorized'
            ]
        ];
    }

    $idValidation = QRCodeRequestMiddleware::validateQrId($id);
    if (!($idValidation['ok'] ?? false)) {
        return [
            'status' => $idValidation['status'] ?? 400,
            'body' => $idValidation['body'] ?? [
                'success' => false,
                'message' => 'Invalid request'
            ]
        ];
    }

    $response = QRCodeController::show($auth['data']['auth'], $idValidation['data']['id']);
    return ['status' => ($response['success'] ?? false) ? 200 : 404, 'body' => $response];
});

$router->register('DELETE', '#^qrcode/([^/]+)$#', [], function ($request) {
    $params = $request['params'] ?? [];
    $id = $params[0] ?? null;
    $auth = QRCodeRequestMiddleware::validateAuthenticatedAccess();
    if (!($auth['ok'] ?? false)) {
        return [
            'status' => $auth['status'] ?? 401,
            'body' => $auth['body'] ?? [
                'success' => false,
                'message' => 'Unauthorized'
            ]
        ];
    }

    $idValidation = QRCodeRequestMiddleware::validateQrId($id);
    if (!($idValidation['ok'] ?? false)) {
        return [
            'status' => $idValidation['status'] ?? 400,
            'body' => $idValidation['body'] ?? [
                'success' => false,
                'message' => 'Invalid request'
            ]
        ];
    }

    $response = QRCodeController::destroy($auth['data']['auth'], $idValidation['data']['id']);
    return ['status' => ($response['success'] ?? false) ? 200 : 404, 'body' => $response];
});
