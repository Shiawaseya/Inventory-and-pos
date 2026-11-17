<?php

use App\Router;
use App\Controllers\StockAdjustmentController;
use App\Controllers\StockUnitController;
use App\Middleware\AuthMiddleware;
use App\Middleware\RoleMiddleware;

require_once __DIR__ . '/../../vendor/autoload.php';

$router = Router::get();

// List stock adjustments for the authenticated employee's branch (or specified branch)
$router->register(
    'GET', 
    '#^stock-adjustments(?:/branch/([^/]+))?$#', 
    [AuthMiddleware::class, RoleMiddleware::class . ':sales-oic,inventory_clerk'], 
    function ($request) {$controller = new StockAdjustmentController();
        return $controller->listByBranch($request);
    }
);

// Get single stock adjustment with line items and serial details
$router->register(
    'GET', 
    '#^stock-adjustments/([0-9]+)$#', 
    [AuthMiddleware::class, RoleMiddleware::class . ':sales-oic,inventory_clerk'], 
    function ($request) {$controller = new StockAdjustmentController();
        return $controller->getById($request);
    }
);

// Create a new stock adjustment
$router->register(
    'POST', 
    'stock-adjustments', 
    [AuthMiddleware::class, RoleMiddleware::class . ':sales-oic,inventory_clerk'], 
    function ($request) {$controller = new StockAdjustmentController();
        return $controller->create($request);
    }
);

// Search stock unit by serial number within the employee's branch
$router->register(
    'GET',
    '#^stock-units/serial/([^/]+)$#',
    [AuthMiddleware::class, RoleMiddleware::class . ':sales-oic,inventory_clerk'],
    function ($request) {$controller = new StockAdjustmentController();
        return $controller->findStockUnitBySerial($request);
    }
);