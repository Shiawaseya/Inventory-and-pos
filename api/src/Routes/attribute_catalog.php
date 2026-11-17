<?php

use App\Controllers\AttributeCatalogController;
use App\Middleware\AuthMiddleware;
use App\Middleware\RoleMiddleware;
use App\Router;

require_once __DIR__ . '/../../vendor/autoload.php';
//only sales oic can access the attribute catalog routes
//ASIDE FROM GET REQUESTS, ALL OTHER REQUESTS REQUIRE THE sales-oic ROLE
$router = Router::get();
$router->register('GET', '/item-attributes', [AuthMiddleware::class, RoleMiddleware::class . ':sales-oic'], fn($request) => AttributeCatalogController::attributes($request));
$router->register('POST', '/item-attributes', [AuthMiddleware::class, RoleMiddleware::class . ':sales-oic'], fn($request) => AttributeCatalogController::attributes($request));
$router->register('GET', '/attribute-units', [AuthMiddleware::class], fn($request) => AttributeCatalogController::units($request));
$router->register('POST', '/attribute-units', [AuthMiddleware::class, RoleMiddleware::class . ':sales-oic'], fn($request) => AttributeCatalogController::units($request));
$router->register('GET', '/attribute-options', [AuthMiddleware::class], fn($request) => AttributeCatalogController::options($request));
$router->register('POST', '/attribute-options', [AuthMiddleware::class, RoleMiddleware::class . ':sales-oic'], fn($request) => AttributeCatalogController::options($request));
$router->register('GET', '#^variants/([^/]+)/specifications$#', [AuthMiddleware::class], fn($request) => AttributeCatalogController::specifications($request));
$router->register('POST', '#^variants/([^/]+)/specifications$#', [AuthMiddleware::class, RoleMiddleware::class . ':sales-oic' ], fn($request) => AttributeCatalogController::specifications($request));
$router->register('PUT', '#^variants/([^/]+)/specifications/([^/]+)$#', [AuthMiddleware::class, RoleMiddleware::class . ':sales-oic'], fn($request) => AttributeCatalogController::updateSpecification($request));
$router->register('DELETE', '#^variants/([^/]+)/specifications/([^/]+)$#', [AuthMiddleware::class], fn($request) => AttributeCatalogController::deleteSpecification($request));

// Edit / delete catalog entries
$router->register('PUT', '#^item-attributes/([^/]+)$#', [AuthMiddleware::class], fn($request) => AttributeCatalogController::updateAttribute($request));
$router->register('DELETE', '#^item-attributes/([^/]+)$#', [AuthMiddleware::class], fn($request) => AttributeCatalogController::deleteAttribute($request));
$router->register('PUT', '#^attribute-units/([^/]+)$#', [AuthMiddleware::class], fn($request) => AttributeCatalogController::updateUnit($request));
$router->register('DELETE', '#^attribute-units/([^/]+)$#', [AuthMiddleware::class], fn($request) => AttributeCatalogController::deleteUnit($request));
$router->register('PUT', '#^attribute-options/([^/]+)$#', [AuthMiddleware::class], fn($request) => AttributeCatalogController::updateOption($request));
$router->register('DELETE', '#^attribute-options/([^/]+)$#', [AuthMiddleware::class], fn($request) => AttributeCatalogController::deleteOption($request));