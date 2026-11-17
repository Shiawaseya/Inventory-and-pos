<?php

use App\Router;
use App\Controllers\SalesInvoiceController;
use App\Middleware\AuthMiddleware;
use App\Middleware\RoleMiddleware;

require_once __DIR__ . '/../../vendor/autoload.php';

$router = Router::get();

$router->register('GET', '/sales-invoices/parked', [AuthMiddleware::class], function ($request) {
    $controller = new SalesInvoiceController();
    return $controller->listParked($request);
});

$router->register('GET', '#^sales-invoices/branch/([^/]+)$#', [AuthMiddleware::class, RoleMiddleware::class . ':sales-oic'], function ($request) {
    $controller = new SalesInvoiceController();
    return $controller->listByBranch($request);
});
$router->register(
    'GET', 
    '#^sales-invoices/branch/([^/]+)/employee$#', 
    [AuthMiddleware::class, RoleMiddleware::class . ':sales-oic,sales-representative'], 
    function ($request) {
        $controller = new SalesInvoiceController();
        return $controller->listMineOrBranch($request);
    }
);