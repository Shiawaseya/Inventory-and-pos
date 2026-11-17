<?php

use App\Controllers\CategoryController;
use App\Middleware\AuthMiddleware;
use App\Router;

require_once __DIR__ . '/../../vendor/autoload.php';

$router = Router::get();

$router->register('POST', '/categories', [AuthMiddleware::class], function ($request) {
    $controller = new CategoryController();
    $request['body'] = json_decode(file_get_contents('php://input'), true) ?? [];
    return $controller->create($request);
});

$router->register('GET', '/categories', [], function ($request) {
    $controller = new CategoryController();
    return $controller->list($request);
});

$router->register('PUT', '#^categories/([^/]+)$#', [AuthMiddleware::class], function ($request) {
    $controller = new CategoryController();
    $request['body'] = json_decode(file_get_contents('php://input'), true) ?? [];
    return $controller->update($request);
});