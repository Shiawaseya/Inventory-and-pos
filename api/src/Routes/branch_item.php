<?php

use App\Controllers\BranchItemController;
use App\Middleware\AuthMiddleware;
use App\Middleware\RoleMiddleware;
use App\Router;

require_once __DIR__ . '/../../vendor/autoload.php';

$router = Router::get();

// Helper to attach audit headers
$attachAudit = function (&$request) {$request['_audit'] = [
        'ip_address' => $_SERVER['REMOTE_ADDR'] ?? null,
        'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? null,
    ];
};

// Create branch-specific item pricing (sales OIC)
$router->register('POST', '/branch-items', [AuthMiddleware::class, RoleMiddleware::class . ':sales-oic'], function ($request) use ($attachAudit) {
    $controller = new BranchItemController();$request['body'] = json_decode(file_get_contents('php://input'), true) ?? [];
    $attachAudit($request);
    return $controller->create($request);
});

// Bulk update branch item prices
$router->register('POST', '/branch-items/bulk-price-update', [AuthMiddleware::class, RoleMiddleware::class . ':sales-oic'], function ($request) use ($attachAudit) {
    $controller = new BranchItemController();$request['body'] = json_decode(file_get_contents('php://input'), true) ?? [];
    $attachAudit($request);
    return $controller->bulkUpdatePrices($request);
});

// Update single branch item
$router->register('PUT', '#^branch-items/([^/]+)$#', [AuthMiddleware::class, RoleMiddleware::class . ':sales-oic'], function ($request) use ($attachAudit) {
    $controller = new BranchItemController();$request['body'] = json_decode(file_get_contents('php://input'), true) ?? [];
    $attachAudit($request);
    return $controller->update($request);
});

// Delete/remove branch item
$router->register('DELETE', '#^branch-items/([^/]+)$#', [AuthMiddleware::class, RoleMiddleware::class . ':sales-oic'], function ($request) use ($attachAudit) {$controller = new BranchItemController();
    $attachAudit($request);
    return $controller->delete($request);
});

// List items for a branch
$router->register('GET', '#^branches/([^/]+)/items$#', [AuthMiddleware::class], function ($request) {$controller = new BranchItemController();
    return $controller->listByBranch($request);
});

// List serialized inventory for a branch
$router->register('GET', '#^branches/([^/]+)/inventory/serialized$#', [AuthMiddleware::class], function ($request) {$controller = new BranchItemController();
    return $controller->listSerialized($request);
});

// Show branch_item by id
$router->register('GET', '#^branch-items/([^/]+)$#', [AuthMiddleware::class], function ($request) {$controller = new BranchItemController();
    return $controller->show($request);
});