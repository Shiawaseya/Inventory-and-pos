<?php

use App\Controllers\BrandController;
use App\Middleware\AuthMiddleware;
use App\Router;

require_once __DIR__ . '/../../vendor/autoload.php';

$router = Router::get();

$router->register('POST', '/brands', [AuthMiddleware::class], function ($request) {
    $controller = new BrandController();
    $request['body'] = json_decode(file_get_contents('php://input'), true) ?? [];
    return $controller->create($request);
});

$router->register('GET', '/brands', [], function ($request) {
    $controller = new BrandController();
    return $controller->list($request);
});

$router->register('PUT', '#^brands/([^/]+)$#', [AuthMiddleware::class], function ($request) {
    $controller = new BrandController();
    $request['body'] = json_decode(file_get_contents('php://input'), true) ?? [];
    return $controller->update($request);
});