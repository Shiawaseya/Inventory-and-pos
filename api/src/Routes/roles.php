<?php

use App\Router;
use App\Controllers\RoleController;
use App\Middleware\AuthMiddleware;

require_once __DIR__ . '/../../vendor/autoload.php';

$router = Router::get();

// List roles
$router->register('GET', '/roles', [], function ($request) {
    $controller = new RoleController();
    return $controller->list($request);
});

// Create role
$router->register('POST', '/roles', [AuthMiddleware::class], function ($request) {
    $request['_audit'] = [
        'ip_address' => $_SERVER['REMOTE_ADDR'] ?? null,
        'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? null,
    ];
    $controller = new RoleController();
    return $controller->create($request);
});

// Get role by id
$router->register('GET', '#^roles/([^/]+)$#', [AuthMiddleware::class], function ($request) {
    $controller = new RoleController();
    return $controller->show($request);
});

// Get role by key
$router->register('GET', '#^roles/key/([^/]+)$#', [AuthMiddleware::class], function ($request) {
    $controller = new RoleController();
    return $controller->findByKey($request);
});
