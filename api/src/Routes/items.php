<?php

use App\Router;
use App\Controllers\ItemController;
use App\Services\ItemService;
use App\Entities\Item;
use App\Entities\ItemVariant;
use App\Entities\StockUnit;
use App\Database\DatabaseManager;
use App\Middleware\AuthMiddleware;
use App\Middleware\RoleMiddleware;

require_once __DIR__ . '/../../vendor/autoload.php';

$router = Router::get();

// Resolve Doctrine EntityManager using DatabaseManager
$em = DatabaseManager::getEntityManager();
$itemRepo = $em->getRepository(Item::class);
$variantRepo = $em->getRepository(ItemVariant::class);
$stockRepo = $em->getRepository(StockUnit::class);

$itemService = new ItemService($em, $itemRepo, $variantRepo, $stockRepo);
$itemController = new ItemController($itemService);

// Allow Sales OIC and inventory clerks to create items
$router->register('POST', '/items', [AuthMiddleware::class, RoleMiddleware::class . ':sales-oic'], function ($request) use ($itemController) {
    return $itemController->create($request);
});

$router->register('GET', '/items', [AuthMiddleware::class], function ($request) use ($itemController) {
    return $itemController->list($request);
});

// Update item
$router->register('PUT', '#^items/([^/]+)$#', [AuthMiddleware::class, RoleMiddleware::class . ':sales-oic'], function ($request) use ($itemController) {
    return $itemController->update($request);
});

// Get item by stock serial number
$router->register('GET', '#^items/by-serial/([^/]+)$#', [AuthMiddleware::class], function ($request) use ($itemController) {
    return $itemController->getBySerial($request);
});

// Query param route: /items/by-serial?serial=ABC123
$router->register('GET', '/items/by-serial', [AuthMiddleware::class], function ($request) use ($itemController) {
    return $itemController->getBySerial($request);
});