<?php

use App\Router;

require_once __DIR__ . '/../../vendor/autoload.php';

$router = Router::get();

$router->register('GET', '#^uploads/items/(.+)$#', [], function ($request) {
    $params = $request['params'] ?? [];
    $fileName = $params[0] ?? null;
    if (!$fileName) {
        return ['status' => 404, 'body' => ['success' => false, 'message' => 'File not found']];
    }

    $uploadsDir = realpath(__DIR__ . '/../../public/uploads/items');
    if ($uploadsDir === false) {
        return ['status' => 404, 'body' => ['success' => false, 'message' => 'Uploads directory not found']];
    }

    $requested = realpath($uploadsDir . DIRECTORY_SEPARATOR . $fileName);
    if ($requested === false || strpos($requested, $uploadsDir) !== 0 || !is_file($requested)) {
        return ['status' => 404, 'body' => ['success' => false, 'message' => 'File not found']];
    }

    $mime = @mime_content_type($requested) ?: 'application/octet-stream';

    // We return a special structure that the public dispatcher can interpret to stream raw file
    return ['status' => 200, 'body' => ['__raw_file' => $requested, 'mime' => $mime]];
});

$router->register('GET', '#^uploads/item_variant/(.+)$#', [], function ($request) {
    $params = $request['params'] ?? [];
    $fileName = $params[0] ?? null;
    if (!$fileName) {
        return ['status' => 404, 'body' => ['success' => false, 'message' => 'File not found']];
    }

    $uploadsDir = realpath(__DIR__ . '/../../public/uploads/item_variant');
    if ($uploadsDir === false) {
        return ['status' => 404, 'body' => ['success' => false, 'message' => 'Uploads directory not found']];
    }

    $requested = realpath($uploadsDir . DIRECTORY_SEPARATOR . $fileName);
    if ($requested === false || strpos($requested, $uploadsDir) !== 0 || !is_file($requested)) {
        return ['status' => 404, 'body' => ['success' => false, 'message' => 'File not found']];
    }

    $mime = @mime_content_type($requested) ?: 'application/octet-stream';
    return ['status' => 200, 'body' => ['__raw_file' => $requested, 'mime' => $mime]];
});

