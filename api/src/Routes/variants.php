<?php

use App\Controllers\ItemVariantController;
use App\Middleware\AuthMiddleware;
use App\Router;

require_once __DIR__ . '/../../vendor/autoload.php';

$router = Router::get();

$router->register('POST', '/variants', [AuthMiddleware::class], function ($request) {
    return ItemVariantController::create($request);
});

$router->register('GET', '/variants', [AuthMiddleware::class], function ($request) {
    $itemId = (int) (($request['query']['item_id'] ?? 0));
    if ($itemId <= 0) {
        return ['status' => 400, 'body' => ['success' => false, 'message' => 'item_id is required']];
    }
    $request['params'] = [$itemId];
    return ItemVariantController::listByItem($request);
});

$router->register('GET', '#^items/([^/]+)/variants$#', [AuthMiddleware::class], function ($request) {
    return ItemVariantController::listByItem($request);
});

$router->register('GET', '#^variants/([^/]+)$#', [AuthMiddleware::class], function ($request) {
    return ItemVariantController::show($request);
});

$router->register('PUT', '#^variants/([^/]+)$#', [AuthMiddleware::class], function ($request) {
    return ItemVariantController::update($request);
});

$router->register('DELETE', '#^variants/([^/]+)$#', [AuthMiddleware::class], function ($request) {
    return ItemVariantController::delete($request);
});