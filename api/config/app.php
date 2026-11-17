<?php
/**
 * Application Configuration
 */

// Load .env file if it exists
$envFile = __DIR__ . '/../.env';
if (file_exists($envFile)) {
    $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos($line, '=') !== false && strpos($line, '#') !== 0) {
            [$key, $value] = explode('=', $line, 2);
            putenv(trim($key) . '=' . trim($value));
            $_ENV[trim($key)] = trim($value);
        }
    }
}

// Default configuration
define('APP_NAME', getenv('APP_NAME') ?: 'Inventory Management API');
define('APP_ENV', getenv('APP_ENV') ?: 'production');
define('APP_DEBUG', getenv('APP_DEBUG') === 'true');

// Database configuration
define('DB_HOST', getenv('DB_HOST') ?: 'localhost');
define('DB_PORT', getenv('DB_PORT') ?: 3306);
define('DB_NAME', getenv('DB_NAME') ?: 'inventory_management');
define('DB_USER', getenv('DB_USER') ?: 'jj');
define('DB_PASSWORD', getenv('DB_PASSWORD') ?: '1234');

// API configuration
define('API_VERSION', getenv('API_VERSION') ?: 'v1');
define('API_URL', getenv('API_URL') ?: 'http://localhost/inventory_management_api');

// Email configuration
define('MAIL_HOST', getenv('MAIL_HOST') ?: 'smtp.gmail.com');
define('MAIL_PORT', getenv('MAIL_PORT') ?: 587);
define('MAIL_USERNAME', getenv('MAIL_USERNAME') ?: '');
define('MAIL_PASSWORD', getenv('MAIL_PASSWORD') ?: '');
define('MAIL_FROM_ADDRESS', getenv('MAIL_FROM_ADDRESS') ?: 'noreply@inventory-management.com');
define('MAIL_FROM_NAME', getenv('MAIL_FROM_NAME') ?: 'Inventory Management');
