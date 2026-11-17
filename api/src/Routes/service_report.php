<?php

use App\Controllers\ServiceReportController;
use App\Middleware\AuthMiddleware;
use App\Middleware\RoleMiddleware;
use App\Router;

require_once __DIR__ . '/../../vendor/autoload.php';

$router = Router::get();$viewRoles = [AuthMiddleware::class, RoleMiddleware::class . ':sales-oic,inventory_clerk,supervisor'];
$writeRoles = [AuthMiddleware::class, RoleMiddleware::class . ':sales-oic,inventory_clerk'];$certifyRoles = [AuthMiddleware::class, RoleMiddleware::class . ':sales-oic,supervisor'];

$attachAudit = function (array &$request) {$request['_audit'] = [
        'ip_address' => $_SERVER['REMOTE_ADDR'] ?? null,
        'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? null,
    ];
};

$router->register('GET', '/service-reports/lookup', $writeRoles, function ($request) {
    return ServiceReportController::lookup($request);
});

$router->register('GET', '#^service-reports/branch/(\d+)$#', $viewRoles, function ($request) {
    return ServiceReportController::listByBranch($request);
});

$router->register('GET', '#^service-reports/control/([^/]+)$#', $viewRoles, function ($request) {
    return ServiceReportController::showByControlNumber($request);
});

$router->register('GET', '#^service-reports/(\d+)$#', $viewRoles, function ($request) {
    return ServiceReportController::show($request);
});

$router->register('POST', '/service-reports',$writeRoles, function ($request) use ($attachAudit) {
    $attachAudit($request);
    return ServiceReportController::create($request);
});

$router->register('POST', '#^service-reports/(\d+)/actions$#', $writeRoles, function ($request) use ($attachAudit) {
    $attachAudit($request);
    return ServiceReportController::addAction($request);
});

$router->register('POST', '#^service-reports/(\d+)/certify$#', $certifyRoles, function ($request) use ($attachAudit) {
    $attachAudit($request);
    return ServiceReportController::certify($request);
});