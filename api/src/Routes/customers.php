<?php

use App\Router;
use App\Controllers\CustomerController;
use App\Middleware\AuthMiddleware;
use App\Middleware\RoleMiddleware;

require_once __DIR__ . '/../../vendor/autoload.php';

$router = Router::get();

// List customers with pagination, filtering, searching, and sorting.
$router->register('GET', '/customers', [AuthMiddleware::class], function ($request) {
    return CustomerController::list($request);
});

// List customers for a branch
$router->register('GET', '#^branches/([^/]+)/customers$#', [AuthMiddleware::class], function ($request) {
    return CustomerController::listByBranch($request);
});

$router->register('POST', '/customers', [AuthMiddleware::class, RoleMiddleware::class . ':sales-representative,sales-oic,inventory-clerk'], function ($request) {$request['_audit'] = [
        'ip_address' => $_SERVER['REMOTE_ADDR'] ?? null,
        'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? null,
    ];
    return CustomerController::create($request);
});