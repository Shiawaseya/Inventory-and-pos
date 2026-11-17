<?php

use App\Router;
use App\Controllers\DashboardController;
use App\Middleware\AuthMiddleware;
use App\Middleware\RoleMiddleware;

require_once __DIR__ . '/../../vendor/autoload.php';

$router = Router::get();

// Dashboard KPI metrics (sales-oic or inventory_clerk)
$router->register('GET', '/dashboard/kpi', [AuthMiddleware::class, RoleMiddleware::class . ':sales-oic,inventory_clerk'], function ($request) {
    $controller = new DashboardController();
    return $controller->get($request);
});

// Stock alerts: low stock, out of stock, top selling, slow moving
$router->register('GET', '/dashboard/stock-alerts', [AuthMiddleware::class, RoleMiddleware::class . ':sales-oic,inventory_clerk'], function ($request) {
    $controller = new DashboardController();
    return $controller->stockAlerts($request);
});

// Sales analytics: trend, category distribution, peak hours
$router->register('GET', '/dashboard/sales-analytics', [AuthMiddleware::class, RoleMiddleware::class . ':sales-oic,inventory_clerk'], function ($request) {
    $controller = new DashboardController();
    return $controller->salesAnalytics($request);
});
