<?php

use App\Controllers\StockCheckerController;
use App\Middleware\AuthMiddleware;
use App\Router;

require_once __DIR__ . '/../../vendor/autoload.php';

$router = Router::get();

// Variant-level cards with specification filtering
$router->register('GET', '/stock-checker/variants', [AuthMiddleware::class], function ($request) {
    return StockCheckerController::variants($request);
});

// Filter options: categories, price range, and per-attribute ranges / options
$router->register('GET', '/stock-checker/facets', [AuthMiddleware::class], function ($request) {
    return StockCheckerController::facets($request);
});