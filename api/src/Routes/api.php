<?php
date_default_timezone_set('Asia/Manila');

/**
 * API Routes
 *
 * Compose all route modules and register them with the Router.
 */

require_once __DIR__ . '/../../vendor/autoload.php';

$phpFiles = [
	__DIR__ . '/items.php',
	__DIR__ . '/variants.php',
	__DIR__ . '/auth.php',
	__DIR__ . '/uploads.php',
	__DIR__ . '/report.php',
	__DIR__ . '/team.php',
	__DIR__ . '/qrcode.php',
	__DIR__ . '/category.php',
	__DIR__ . '/brands.php',
	__DIR__ . '/branch_item.php',
	__DIR__ . '/stock_unit.php',
    __DIR__ . '/sales.php',
	__DIR__ . '/sales_invoice.php',
	__DIR__ . '/dashboard.php',
    __DIR__ . '/roles.php',
	__DIR__ . '/employees.php',
    __DIR__ . '/customers.php',
	__DIR__ . '/stock_adjustment.php',
	__DIR__ . '/service_report.php',
	__DIR__ . '/audit_logs.php',
	__DIR__ . '/attribute_catalog.php',
	__DIR__ . '/stock-checker.php'
];

foreach ($phpFiles as $f) {
	if (file_exists($f)) {
		require_once $f;
	}
}

use App\Router;

function dispatch($method, $path, $request)
{
	$router = Router::get();
	return $router->dispatch($method, $path, $request);
}

