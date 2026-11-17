<?php
/**
 * API Entry Point
 * 
 * This is the main entry point for the Inventory Management API.
 * All requests are routed through this file.
 */

// Enable error reporting (disable in production)
error_reporting(E_ALL);
ini_set('display_errors', 1);

// CORS Headers - Allow cross-origin requests
header('Access-Control-Allow-Origin: *'); // Allow all origins (change to specific origin in production)
header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Max-Age: 3600');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Set header to JSON
header('Content-Type: application/json');

// Load composer autoloader
require_once __DIR__ . '/../vendor/autoload.php';

// Load environment configuration
require_once __DIR__ . '/../config/app.php';

// Get request method and path
$method = $_SERVER['REQUEST_METHOD'];
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

// Remove the base path (handle both direct and rewritten URLs)
$basePath = str_replace('\\', '/', dirname($_SERVER['PHP_SELF']));
if (strpos($path, $basePath) === 0) {
    $path = substr($path, strlen($basePath));
}

$path = trim($path, '/');

// If PUT with multipart/form-data, PHP won't populate $_POST/$_FILES.
// Parse raw input to extract fields and files so controllers can use same interface.
$parsedPutPost = [];
$parsedPutFiles = [];
if (strtoupper($method) === 'PUT') {
    $contentType = $_SERVER['CONTENT_TYPE'] ?? ($_SERVER['HTTP_CONTENT_TYPE'] ?? '');
    if (stripos($contentType, 'multipart/form-data') !== false) {
        $raw = file_get_contents('php://input');
        // extract boundary
        if (preg_match('/boundary=(.*)$/', $contentType, $matches)) {
            $boundary = trim($matches[1], '"');
            $blocks = preg_split("/\r\n--" . preg_quote($boundary, '/') . "/", $raw);
            if ($blocks !== false) {
                foreach ($blocks as $b) {
                    $b = ltrim($b, "\r\n");
                    if (empty($b) || $b === "--" || $b === "--\r\n") continue;
                    [$rawHeaders, $body] = preg_split("/\r\n\r\n/", $b, 2) + [1 => ''];
                    $body = preg_replace('/\r\n--$/', '', $body);
                    $headers = [];
                    foreach (preg_split('/\r\n/', $rawHeaders) as $headerLine) {
                        if (strpos($headerLine, ':') !== false) {
                            [$hn, $hv] = explode(':', $headerLine, 2);
                            $headers[strtolower(trim($hn))] = trim($hv);
                        }
                    }

                    if (!isset($headers['content-disposition'])) continue;
                    $cd = $headers['content-disposition'];
                    // parse name and filename
                    $name = null; $filename = null;
                    if (preg_match('/name="([^\"]+)"/', $cd, $m)) $name = $m[1];
                    if (preg_match('/filename="([^\"]*)"/', $cd, $m)) $filename = $m[1];

                    if ($filename === null || $filename === '') {
                        // regular field
                        if ($name !== null) {
                            // strip trailing CRLF
                            $value = preg_replace('/\r\n$/', '', $body);
                            if (isset($parsedPutPost[$name])) {
                                if (is_array($parsedPutPost[$name])) {
                                    $parsedPutPost[$name][] = $value;
                                } else {
                                    $parsedPutPost[$name] = [$parsedPutPost[$name], $value];
                                }
                            } else {
                                $parsedPutPost[$name] = $value;
                            }
                        }
                    } else {
                        // file field - write to temp file and mimic PHP's $_FILES structure
                        $tmpName = tempnam(sys_get_temp_dir(), 'putfile_');
                        file_put_contents($tmpName, $body);
                        $ctype = $headers['content-type'] ?? 'application/octet-stream';
                        $size = filesize($tmpName);
                        $fileArr = [
                            'name' => $filename,
                            'type' => $ctype,
                            'tmp_name' => $tmpName,
                            'error' => 0,
                            'size' => $size,
                        ];
                        // support multiple files with same field name
                        if (isset($parsedPutFiles[$name])) {
                            if (isset($parsedPutFiles[$name]['name'])) {
                                // convert to arrays
                                $parsedPutFiles[$name] = [
                                    'name' => [$parsedPutFiles[$name]['name'], $fileArr['name']],
                                    'type' => [$parsedPutFiles[$name]['type'], $fileArr['type']],
                                    'tmp_name' => [$parsedPutFiles[$name]['tmp_name'], $fileArr['tmp_name']],
                                    'error' => [$parsedPutFiles[$name]['error'], $fileArr['error']],
                                    'size' => [$parsedPutFiles[$name]['size'], $fileArr['size']],
                                ];
                            } else {
                                // already array of files
                                $parsedPutFiles[$name]['name'][] = $fileArr['name'];
                                $parsedPutFiles[$name]['type'][] = $fileArr['type'];
                                $parsedPutFiles[$name]['tmp_name'][] = $fileArr['tmp_name'];
                                $parsedPutFiles[$name]['error'][] = $fileArr['error'];
                                $parsedPutFiles[$name]['size'][] = $fileArr['size'];
                            }
                        } else {
                            $parsedPutFiles[$name] = $fileArr;
                        }
                    }
                }
            }
        }
    }
}

// Build request array passed to controllers/middleware
$request = [
    'method' => $method,
    'path' => $path,
    'query' => $_GET ?: [],
    'body' => [],
    'files' => [],
    'headers' => function_exists('getallheaders') ? getallheaders() : []
];

if (strtoupper($method) === 'PUT' && !empty($parsedPutPost)) {
    $request['body'] = $parsedPutPost;
} else {
    $request['body'] = $_POST ?: (json_decode(file_get_contents('php://input'), true) ?: []);
}

if (strtoupper($method) === 'PUT' && !empty($parsedPutFiles)) {
    $request['files'] = $parsedPutFiles;
} else {
    $request['files'] = $_FILES;
}

// Load routes (this defines dispatch() and registers routes with Router)
require_once __DIR__ . '/../src/Routes/api.php';

// Route dispatch
try {
    $result = dispatch($method, $path, $request);

    if ($result === null) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Not Found']);
        exit;
    }

    // If controller indicated a raw file should be streamed
    if (is_array($result['body'] ?? null) && isset($result['body']['__raw_file'])) {
        $file = $result['body']['__raw_file'];
        $mime = $result['body']['mime'] ?? 'application/octet-stream';
        if (!is_file($file)) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'File not found']);
            exit;
        }

        header('Content-Type: ' . $mime);
        header('Content-Length: ' . filesize($file));
        header('Cache-Control: public, max-age=86400');
        readfile($file);
        exit;
    }

    if (($result['status'] ?? null) !== null) {
        http_response_code((int)$result['status']);
    }

    echo json_encode($result['body']);
} catch (\Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Server error',
        'error' => APP_DEBUG ? $e->getMessage() : 'Internal server error'
    ]);
}
