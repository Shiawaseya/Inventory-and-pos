<?php

namespace App;

use Throwable;

class Router
{
    private static ?Router $instance = null;

    /** @var array[] */
    private array $routes = [];

    public static function get(): Router
    {
        if (self::$instance === null) {
            self::$instance = new Router();
        }
        return self::$instance;
    }

    public function register(string $method, string $path, array $middlewares, callable $controller): void
    {
        // Normalize path unless it's a regex (starts with #)
        $storePath = $path;
        if (is_string($path) && strlen($path) > 0 && $path[0] !== '#') {
            $storePath = trim($path, '/');
        }

        $this->routes[] = [
            'method' => strtoupper($method),
            'path' => $storePath,
            'middlewares' => $middlewares,
            'controller' => $controller
        ];
    }

    public function dispatch(string $method, string $path, array $request): ?array
    {
        foreach ($this->routes as $r) {
            if ($r['method'] !== strtoupper($method)) {
                continue;
            }

            $routePath = $r['path'];

            // regex path (starts and ends with #)
            if (is_string($routePath) && strlen($routePath) > 0 && $routePath[0] === '#') {
                if (preg_match($routePath, $path, $m)) {
                    // attach captures (excluding full match)
                    $request['params'] = array_slice($m, 1);
                    try {
                        $res = $this->runPipeline($r['middlewares'], $r['controller'], $request);
                    } catch (Throwable $e) {
                        return ['status' => 500, 'body' => ['error' => $e->getMessage()]];
                    }

                    return $this->normalizeResponse($res);
                }
                continue;
            }

            if ($routePath === $path) {
                try {
                    $res = $this->runPipeline($r['middlewares'], $r['controller'], $request);
                } catch (Throwable $e) {
                    return ['status' => 500, 'body' => ['error' => $e->getMessage()]];
                }

                // normalize
                return $this->normalizeResponse($res);
            }
        }

        return null;
    }

    private function parseMiddleware(string $middleware): array
    {
        $params = [];
        $class = $middleware;
        if (strpos($middleware, ':') !== false) {
            [$class, $paramStr] = explode(':', $middleware, 2);
            $params = array_filter(array_map('trim', explode(',', $paramStr)));
        }
        return [$class, $params];
    }

    private function runPipeline(array $middlewares, callable $controller, array $request)
    {
        $next = $controller;

        foreach (array_reverse($middlewares) as $middleware) {
            $next = (function ($m, $n) {
                return function ($req) use ($m, $n) {
                    if (!is_string($m)) {
                        throw new \RuntimeException('Middleware must be provided as class name string');
                    }

                    [$class, $params] = $this->parseMiddleware($m);

                    if (!class_exists($class)) {
                        throw new \RuntimeException(sprintf('Middleware class %s not found', $class));
                    }

                    $inst = new $class();
                    return $inst->handle($req, $n, ...$params);
                };
            })($middleware, $next);
        }

        return $next($request);
    }

    private function normalizeResponse($res): array
    {
        if (is_array($res) && array_key_exists('status', $res) && array_key_exists('body', $res)) {
            $res['status'] = isset($res['status']) && $res['status'] !== null ? (int)$res['status'] : 200;
            return $res;
        }

        return ['status' => 200, 'body' => $res];
    }
}
