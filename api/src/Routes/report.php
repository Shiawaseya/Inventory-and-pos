<?php

use App\Router;
use App\Controllers\ReportController;
use App\Middleware\AuthMiddleware;
use App\Middleware\RoleMiddleware;

require_once __DIR__ . '/../../vendor/autoload.php';

$router = Router::get();

$router->register('GET', '/reports/sales/daily', [AuthMiddleware::class, RoleMiddleware::class . ':sales-oic,sales-representative'], function ($request) {
    $response = ReportController::dailySales($request['user'] ?? [], $_GET['date'] ?? null);
    return ['status' => ($response['success'] ?? false) ? 200 : 400, 'body' => $response];
});

// 1. Warranty & Service Desk Analytics
$router->register('GET', '#^reports/warranty/(\d+)$#', [], function ($request) {
    $params = $request['params'] ?? [];
    $branchId = isset($params[0]) ? (int)$params[0] : 0;

    $response = ReportController::warrantyByBranch($branchId);
    return ['status' => ($response['success'] ?? false) ? 200 : 400, 'body' => $response];
});

// 2. Cashier & Payment Distribution
$router->register('GET', '#^reports/cashier-payments/(\d+)$#', [], function ($request) {
    $params = $request['params'] ?? [];
    $branchId = isset($params[0]) ? (int)$params[0] : 0;
    $startDate = $_GET['start_date'] ?? null;
    $endDate = $_GET['end_date'] ?? null;

    $response = ReportController::cashierAndPayments($branchId, $startDate, $endDate);
    return ['status' => ($response['success'] ?? false) ? 200 : 400, 'body' => $response];
});

// 3. Sales approvals & voids (branch comes from the login token, not the URL)
$router->register('GET', '/reports/sales-integrity', [AuthMiddleware::class], function ($request) {
    $user = $request['user'] ?? [];
    $branchId = (int) ($user['branchId'] ?? $user['branch_id'] ?? 0);
    $response = ReportController::salesIntegrity($branchId, $_GET['start_date'] ?? null, $_GET['end_date'] ?? null);
    return ['status' => ($response['success'] ?? false) ? 200 : 400, 'body' => $response];
});

// 4. Stock shrinkage & adjustments
$router->register('GET', '/reports/stock-shrinkage', [AuthMiddleware::class], function ($request) {
    $user = $request['user'] ?? [];
    $branchId = (int) ($user['branchId'] ?? $user['branch_id'] ?? 0);
    $response = ReportController::stockShrinkage($branchId, $_GET['start_date'] ?? null, $_GET['end_date'] ?? null);
    return ['status' => ($response['success'] ?? false) ? 200 : 400, 'body' => $response];
});

// 5. Customer insights
$router->register('GET', '/reports/customer-insights', [AuthMiddleware::class], function ($request) {
    $user = $request['user'] ?? [];
    $branchId = (int) ($user['branchId'] ?? $user['branch_id'] ?? 0);
    $response = ReportController::customerInsights($branchId, $_GET['start_date'] ?? null, $_GET['end_date'] ?? null);
    return ['status' => ($response['success'] ?? false) ? 200 : 400, 'body' => $response];
});

// 6. Service desk depth
$router->register('GET', '/reports/service-desk', [AuthMiddleware::class], function ($request) {
    $user = $request['user'] ?? [];
    $branchId = (int) ($user['branchId'] ?? $user['branch_id'] ?? 0);
    $response = ReportController::serviceDesk($branchId, $_GET['start_date'] ?? null, $_GET['end_date'] ?? null);
    return ['status' => ($response['success'] ?? false) ? 200 : 400, 'body' => $response];
});