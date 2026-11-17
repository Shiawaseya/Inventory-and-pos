<?php

use App\Router;
use App\Controllers\StockUnitController;
use App\Middleware\AuthMiddleware;

require_once __DIR__ . '/../../vendor/autoload.php';

$router = Router::get();

// Create a stock unit
$router->register('POST', '/stock-units', [AuthMiddleware::class], function ($request) {
    $controller = new StockUnitController();
    return $controller->create($request);
});

// Get stock unit by id
$router->register('GET', '#^stock-units/([^/]+)$#', [AuthMiddleware::class], function ($request) {
    $controller = new StockUnitController();
    return $controller->show($request);
});

// Find stock unit by serial
$router->register('GET', '#^stock-units/serial/([^/]+)$#', [AuthMiddleware::class], function ($request) {
    $controller = new StockUnitController();
    return $controller->findBySerial($request);
});

// List stock units by status for the authenticated user's branch
$router->register('GET', '#^stock-units/status/([^/]+)$#', [AuthMiddleware::class], function ($request) {
    $controller = new StockUnitController();
    return $controller->listByStatusAndBranch($request);
});

// Get the complete variant/item data for a serial number
$router->register('GET', '#^api/inventory/serials/(.+)/variant$#', [AuthMiddleware::class], function ($request) {
    $controller = new StockUnitController();
    return $controller->findVariantBySerial($request);
});

// List stock units for a variant SKU using the authenticated user's branch
$router->register('GET', '#^stock-units/variant/sku/([^/]+)$#', [AuthMiddleware::class], function ($request) {
    $controller = new StockUnitController();
    return $controller->listByVariantSkuAndBranch($request);
});

// List stock units for a variant using the authenticated user's branch
$router->register('GET', '#^stock-units/variant/([^/]+)$#', [AuthMiddleware::class], function ($request) {
    $controller = new StockUnitController();
    return $controller->listByVariantAndBranch($request);
});

// List stock units for a variant in a branch (variant_id as URL param)
$router->register('GET', '#^branches/([^/]+)/stock-units/([^/]+)$#', [], function ($request) {
    $controller = new StockUnitController();
    return $controller->listByItemAndBranch($request);
});

// Bulk create stock units for a branch: accepts payload { branch_id, items: [...] }
$router->register('POST', '#^branches/([^/]+)/stock-units/bulk$#', [AuthMiddleware::class], function ($request) {
    $controller = new StockUnitController();
    return $controller->bulkCreate($request);
});
