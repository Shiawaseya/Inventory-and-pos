<?php

use App\Router;
use App\Controllers\SalesController;
use App\Middleware\AuthMiddleware;
use App\Middleware\RoleMiddleware;

require_once __DIR__ . '/../../vendor/autoload.php';

$router = Router::get();

$attachAudit = function (array &$request) {$request['_audit'] = [
        'ip_address' => $_SERVER['REMOTE_ADDR'] ?? null,
        'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? null,
    ];
};

// Create a sales invoice with serialized units
$router->register('POST', '/sales/create-with-serial', [], function ($request) use ($attachAudit) {$attachAudit($request);$controller = new SalesController();
    return $controller->createWithSerial($request);
});

$router->register('POST', '/sales/create-without-authorization', [], function ($request) use ($attachAudit) {$attachAudit($request);$controller = new SalesController();
    return $controller->createWithoutAuthorization($request);
});

$router->register('POST', '/sales/create-voided', [], function ($request) use ($attachAudit) {$attachAudit($request);$controller = new SalesController();
    return $controller->createVoided($request);
});

$router->register('POST', '/sales/park', [AuthMiddleware::class], function ($request) use ($attachAudit) {$attachAudit($request);$controller = new SalesController();
    return $controller->park($request);
});

$router->register('POST', '#^sales/([^/]+)/resume-without-authorization$#', [AuthMiddleware::class], function ($request) use ($attachAudit) {$attachAudit($request);$controller = new SalesController();
    return $controller->resumeWithoutAuthorization($request);
});

$router->register('POST', '#^sales/([^/]+)/authorize$#', [AuthMiddleware::class], function ($request) use ($attachAudit) {$attachAudit($request);$controller = new SalesController();
    return $controller->authorizeParked($request);
});

$router->register('POST', '#^sales/([^/]+)/void$#', [AuthMiddleware::class], function ($request) use ($attachAudit) {$attachAudit($request);$controller = new SalesController();
    return $controller->void($request);
});

// Settle an authorized invoice (COD remittance, pick-up, or Home Credit payment)
$router->register('POST', '#^sales/([^/]+)/settle$#', [AuthMiddleware::class], function ($request) use ($attachAudit) {$attachAudit($request);$controller = new SalesController();
    return $controller->settle($request);
});

// Dedicated reprint route
$router->register('POST', '#^sales/([^/]+)/reprint$#', [AuthMiddleware::class], function ($request) use ($attachAudit) {$attachAudit($request);$controller = new SalesController();
    return $controller->reprint($request);
});