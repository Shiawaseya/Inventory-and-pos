<?php

use App\Controllers\AuditLogController;
use App\Middleware\AuthMiddleware;
use App\Router;

require_once __DIR__ . '/../../vendor/autoload.php';

$router = Router::get();
$router->register('GET', '/audit-logs', [AuthMiddleware::class], function ($request) {
    return (new AuditLogController())->list($request);
});