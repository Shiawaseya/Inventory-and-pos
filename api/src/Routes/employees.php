<?php

use App\Router;
use App\Controllers\EmployeeController;
use App\Controllers\EmployeeAccountController;
use App\Controllers\PasswordResetController;
use App\Middleware\AuthMiddleware;
use App\Middleware\RoleMiddleware;

require_once __DIR__ . '/../../vendor/autoload.php';

$router = Router::get();

$attachAudit = function (&$request) {$request['_audit'] = [
        'ip_address' => $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1',
        'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? null,
    ];
};

$router->register('POST', '/employee/account/request-otp', [AuthMiddleware::class], function ($request) use ($attachAudit) {
    $attachAudit($request);
    return (new EmployeeAccountController())->requestOtp($request);
});

$router->register('POST', '/employee/account/verify-otp', [AuthMiddleware::class], function ($request) use ($attachAudit) {
    $attachAudit($request);
    return (new EmployeeAccountController())->verifyOtp($request);
});

// Get Sales OICs for a branch
$router->register('GET', '#^employees/sales-oic/branch/([^/]+)$#', [AuthMiddleware::class], function ($request) {$controller = new EmployeeController();
    return $controller->getSalesOicByBranch($request);
});

// Also allow query param form: /employees/sales-oic?branchId=1
$router->register('GET', '/employees/sales-oic', [AuthMiddleware::class], function ($request) {$controller = new EmployeeController();
    return $controller->getSalesOicByBranch($request);
});

// Get a single Sales Representative by employee id
$router->register('GET', '#^employees/sales-representatives/([^/]+)$#', [AuthMiddleware::class], function ($request) {$controller = new EmployeeController();
    return $controller->getSalesRepresentativeById($request);
});

// Also allow query param form: /employees/sales-representatives?id=123
$router->register('GET', '/employees/sales-representatives', [AuthMiddleware::class], function ($request) {$controller = new EmployeeController();
    return $controller->getSalesRepresentativeById($request);
});

// Get all Sales Representatives for a branch
$router->register('GET', '#^employees/sales-representatives/branch/([^/]+)$#', [AuthMiddleware::class], function ($request) {$controller = new EmployeeController();
    return $controller->getSalesRepesentativesByBranch($request);
});

$router->register('POST', '/auth/forgot-password/request-otp', [], function ($request) use ($attachAudit) {
    $attachAudit($request);
    return (new PasswordResetController())->requestOtp($request);
});
 
$router->register('POST', '/auth/forgot-password/verify-otp', [], function ($request) use ($attachAudit) {
    $attachAudit($request);
    return (new PasswordResetController())->verifyOtp($request);
});
 
$router->register('POST', '/auth/forgot-password/reset', [], function ($request) use ($attachAudit) {
    $attachAudit($request);
    return (new PasswordResetController())->reset($request);
});

// Get all employees for a branch
$router->register('GET', '#^employees/branch/([^/]+)$#', [AuthMiddleware::class, RoleMiddleware::class . ':sales-oic'], function ($request) {
    return EmployeeController::getByBranch($request);
});

// Also allow query param form: /employees/branch?branchId=1
$router->register('GET', '/employees/branch', [AuthMiddleware::class, RoleMiddleware::class . ':sales-oic'], function ($request) {
    return EmployeeController::getByBranch($request);
});

// Deactivate an employee in the Sales OIC's branch
$router->register('PATCH', '#^employees/([^/]+)/deactivate$#', [AuthMiddleware::class, RoleMiddleware::class . ':sales-oic'], function ($request) {
    return EmployeeController::deactivate($request);
});

// Activate an employee in the Sales OIC's branch
$router->register('PATCH', '#^employees/([^/]+)/activate$#', [AuthMiddleware::class, RoleMiddleware::class . ':sales-oic'], function ($request) {
    return EmployeeController::activate($request);
});

// Rotate an employee between Sales Representative and Inventory Clerk
$router->register('PATCH', '#^employees/([^/]+)/role$#', [AuthMiddleware::class, RoleMiddleware::class . ':sales-oic'], function ($request) {
    return EmployeeController::rotateRole($request);
});