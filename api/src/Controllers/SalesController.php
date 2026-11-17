<?php

namespace App\Controllers;

use App\Services\SaleService;
use PDOException;

class SalesController
{
    private const PRINT_AGENT_URL = 'http://127.0.0.1:8080';

    private static function auditContext(array $request): array
    {
        return $request['_audit'] ?? [
            'ip_address' => $_SERVER['REMOTE_ADDR'] ?? null,
            'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? null,
        ];
    }

    public static function createWithSerial(array $request)
    {
        $service = new SaleService();
        try {
            $input = $request['body'] ?? [];
            $user = $request['user'] ?? null;
            $auditContext = self::auditContext($request);
            $input['status'] = 'authorized';
            $result = $service->createSaleWithSerial($input, $user, $auditContext);

            // Check isPrint flag (default true)
            $isPrint = true;
            if (isset($input['isPrint'])) {
                $isPrint = filter_var($input['isPrint'], FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE) ?? true;
            } elseif (isset($input['is_print'])) {
                $isPrint = filter_var($input['is_print'], FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE) ?? true;
            }

            // Attempt print spooling only if sale is completed and isPrint is true
            $printStatus = 'skipped';
            if ($isPrint && ($result['status'] ?? '') === 'completed' && !empty($result['sales_invoice_id'])) {
                $printResult = self::dispatchPrintJob((int) $result['sales_invoice_id'], $service);
                $printStatus = $printResult['status'];
            }

            $responseBody = [
                'success'      => true,
                'data'         => $result,
                'print_status' => $printStatus,
            ];

            return ['status' => 201, 'body' => $responseBody];
        } catch (\InvalidArgumentException $e) {
            return ['status' => 400, 'body' => ['success' => false, 'message' => $e->getMessage()]];
        } catch (PDOException $e) {
            return ['status' => 500, 'body' => ['success' => false, 'message' => 'Database error', 'error' => defined('APP_DEBUG') && APP_DEBUG ? $e->getMessage() : 'DATABASE_ERROR']];
        } catch (\Throwable $e) {
            return ['status' => 500, 'body' => ['success' => false, 'message' => 'Server error', 'error' => defined('APP_DEBUG') && APP_DEBUG ? $e->getMessage() : 'SERVER_ERROR']];
        }
    }

    public static function createWithoutAuthorization(array $request)
    {
        $service = new SaleService();
        try {
            $input = $request['body'] ?? [];
            $user = $request['user'] ?? null;
            $auditContext = self::auditContext($request);

            $isPrint = true;
            if (isset($input['isPrint'])) {
                $isPrint = filter_var($input['isPrint'], FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE) ?? true;
            } elseif (isset($input['is_print'])) {
                $isPrint = filter_var($input['is_print'], FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE) ?? true;
            }

            unset($input['authorized_by_employee_id'], $input['isPrint'], $input['is_print']);
            $input['status'] = 'pending_authorization';

            $result = $service->createSaleWithSerial($input, $user, $auditContext);

            $printStatus = 'skipped';
            if ($isPrint && !empty($result['sales_invoice_id'])) {
                $printResult = self::dispatchPrintJob((int) $result['sales_invoice_id'], $service);
                $printStatus = $printResult['status'];
            }

            return [
                'status' => 201,
                'body'   => [
                    'success'      => true,
                    'data'         => $result,
                    'print_status' => $printStatus,
                ]
            ];
        } catch (\InvalidArgumentException $e) {
            return ['status' => 400, 'body' => ['success' => false, 'message' => $e->getMessage()]];
        } catch (PDOException $e) {
            return ['status' => 500, 'body' => ['success' => false, 'message' => 'Database error', 'error' => defined('APP_DEBUG') && APP_DEBUG ? $e->getMessage() : 'DATABASE_ERROR']];
        } catch (\Throwable $e) {
            return ['status' => 500, 'body' => ['success' => false, 'message' => 'Server error', 'error' => defined('APP_DEBUG') && APP_DEBUG ? $e->getMessage() : 'SERVER_ERROR']];
        }
    }

    public static function createVoided(array $request)
    {
        $service = new SaleService();
        try {
            $input = $request['body'] ?? [];
            $user = $request['user'] ?? null;
            $auditContext = self::auditContext($request);

            unset($input['authorized_by_employee_id']);
            $input['status'] = 'voided';

            $result = $service->createSaleWithSerial($input, $user, $auditContext);

            return [
                'status' => 201,
                'body'   => [
                    'success'      => true,
                    'data'         => $result,
                    'print_status' => 'skipped',
                ]
            ];
        } catch (\InvalidArgumentException $e) {
            return ['status' => 400, 'body' => ['success' => false, 'message' => $e->getMessage()]];
        } catch (PDOException $e) {
            return ['status' => 500, 'body' => ['success' => false, 'message' => 'Database error', 'error' => defined('APP_DEBUG') && APP_DEBUG ? $e->getMessage() : 'DATABASE_ERROR']];
        } catch (\Throwable $e) {
            return ['status' => 500, 'body' => ['success' => false, 'message' => 'Server error', 'error' => defined('APP_DEBUG') && APP_DEBUG ? $e->getMessage() : 'SERVER_ERROR']];
        }
    }

    public static function park(array $request)
    {
        $service = new SaleService();
        try {
            $input = $request['body'] ?? [];
            $user = $request['user'] ?? null;
            $auditContext = self::auditContext($request);
            $result = $service->parkSaleWithSerial($input, $user, $auditContext);
            return ['status' => 201, 'body' => ['success' => true, 'data' => $result]];
        } catch (\InvalidArgumentException $e) {
            return ['status' => 400, 'body' => ['success' => false, 'message' => $e->getMessage()]];
        } catch (PDOException $e) {
            return ['status' => 500, 'body' => ['success' => false, 'message' => 'Database error', 'error' => defined('APP_DEBUG') && APP_DEBUG ? $e->getMessage() : 'DATABASE_ERROR']];
        } catch (\Throwable $e) {
            return ['status' => 500, 'body' => ['success' => false, 'message' => 'Server error', 'error' => defined('APP_DEBUG') && APP_DEBUG ? $e->getMessage() : 'SERVER_ERROR']];
        }
    }

    public static function authorizeParked(array $request)
    {
        $service = new SaleService();
        try {
            $invoiceId = (int) (($request['params'] ?? [])[0] ?? 0);
            $user = $request['user'] ?? [];
            $body = $request['body'] ?? [];
            $auditContext = self::auditContext($request);

            $authorizerId = (int) ($body['authorized_by'] ?? $user['employee_id'] ?? $user['employeeId'] ?? 0);
            $result = $service->authorizeParkedSale($invoiceId, $authorizerId, $auditContext);

            $isPrint = true;
            if (isset($body['isPrint'])) {
                $isPrint = filter_var($body['isPrint'], FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE) ?? true;
            } elseif (isset($body['is_print'])) {
                $isPrint = filter_var($body['is_print'], FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE) ?? true;
            }

            $printStatus = 'skipped';
            if ($isPrint && ($result['status'] ?? '') === 'authorized') {
                $printResult = self::dispatchPrintJob($invoiceId, $service);
                $printStatus = $printResult['status'];
            }

            $responseBody = [
                'success'      => true,
                'data'         => $result,
                'print_status' => $printStatus,
            ];

            return ['status' => 200, 'body' => $responseBody];
        } catch (\InvalidArgumentException $e) {
            return ['status' => 400, 'body' => ['success' => false, 'message' => $e->getMessage()]];
        } catch (PDOException $e) {
            return ['status' => 500, 'body' => ['success' => false, 'message' => 'Database error', 'error' => defined('APP_DEBUG') && APP_DEBUG ? $e->getMessage() : 'DATABASE_ERROR']];
        } catch (\Throwable $e) {
            return ['status' => 500, 'body' => ['success' => false, 'message' => 'Server error', 'error' => defined('APP_DEBUG') && APP_DEBUG ? $e->getMessage() : 'SERVER_ERROR']];
        }
    }

    public static function resumeWithoutAuthorization(array $request)
    {
        $service = new SaleService();
        try {
            $invoiceId = (int) (($request['params'] ?? [])[0] ?? 0);
            $user = $request['user'] ?? [];
            $body = $request['body'] ?? [];
            $auditContext = self::auditContext($request);
            $employeeId = (int) ($user['employee_id'] ?? $user['employeeId'] ?? 0);
            $result = $service->markPendingAuthorization($invoiceId, $employeeId, $auditContext);

            $isPrint = true;
            if (isset($body['isPrint'])) {
                $isPrint = filter_var($body['isPrint'], FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE) ?? true;
            } elseif (isset($body['is_print'])) {
                $isPrint = filter_var($body['is_print'], FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE) ?? true;
            }

            $printStatus = 'skipped';
            if ($isPrint && $invoiceId > 0) {
                $printResult = self::dispatchPrintJob($invoiceId, $service);
                $printStatus = $printResult['status'];
            }

            $responseBody = [
                'success'      => true,
                'data'         => $result,
                'print_status' => $printStatus,
            ];

            return ['status' => 200, 'body' => $responseBody];
        } catch (\InvalidArgumentException $e) {
            return ['status' => 400, 'body' => ['success' => false, 'message' => $e->getMessage()]];
        } catch (PDOException $e) {
            return ['status' => 500, 'body' => ['success' => false, 'message' => 'Database error', 'error' => defined('APP_DEBUG') && APP_DEBUG ? $e->getMessage() : 'DATABASE_ERROR']];
        } catch (\Throwable $e) {
            return ['status' => 500, 'body' => ['success' => false, 'message' => 'Server error', 'error' => defined('APP_DEBUG') && APP_DEBUG ? $e->getMessage() : 'SERVER_ERROR']];
        }
    }

    public static function void(array $request)
    {
        $service = new SaleService();
        try {
            $invoiceId = (int) (($request['params'] ?? [])[0] ?? 0);
            $user = $request['user'] ?? [];
            $auditContext = self::auditContext($request);
            $employeeId = (int) ($user['employee_id'] ?? $user['employeeId'] ?? 0);
            $result = $service->voidSale($invoiceId, $employeeId, $auditContext);

            return ['status' => 200, 'body' => ['success' => true, 'data' => $result]];
        } catch (\InvalidArgumentException $e) {
            return ['status' => 400, 'body' => ['success' => false, 'message' => $e->getMessage()]];
        } catch (PDOException $e) {
            return ['status' => 500, 'body' => ['success' => false, 'message' => 'Database error', 'error' => defined('APP_DEBUG') && APP_DEBUG ? $e->getMessage() : 'DATABASE_ERROR']];
        } catch (\Throwable $e) {
            return ['status' => 500, 'body' => ['success' => false, 'message' => 'Server error', 'error' => defined('APP_DEBUG') && APP_DEBUG ? $e->getMessage() : 'SERVER_ERROR']];
        }
    }

    public static function settle(array $request)
    {
        $service = new SaleService();
        try {
            $invoiceId = (int) (($request['params'] ?? [])[0] ?? 0);
            $user = $request['user'] ?? [];
            $body = $request['body'] ?? [];
            $auditContext = self::auditContext($request);
            $employeeId = (int) ($user['employee_id'] ?? $user['employeeId'] ?? 0);
            $result = $service->settleSale($invoiceId, $employeeId, $body, $auditContext);

            return ['status' => 200, 'body' => ['success' => true, 'data' => $result]];
        } catch (\InvalidArgumentException $e) {
            return ['status' => 400, 'body' => ['success' => false, 'message' => $e->getMessage()]];
        } catch (PDOException $e) {
            return ['status' => 500, 'body' => ['success' => false, 'message' => 'Database error', 'error' => defined('APP_DEBUG') && APP_DEBUG ? $e->getMessage() : 'DATABASE_ERROR']];
        } catch (\Throwable $e) {
            return ['status' => 500, 'body' => ['success' => false, 'message' => 'Server error', 'error' => defined('APP_DEBUG') && APP_DEBUG ? $e->getMessage() : 'SERVER_ERROR']];
        }
    }

    public static function reprint(array $request)
    {
        $service = new SaleService();
        try {
            $invoiceId = (int) (($request['params'] ?? [])[0] ?? 0);
            if ($invoiceId <= 0) {
                return ['status' => 400, 'body' => ['success' => false, 'message' => 'Valid invoice ID is required']];
            }

            $result = self::dispatchPrintJob($invoiceId, $service);

            return [
                'status' => $result['status'] === 'spooled' ? 200 : 502,
                'body'   => [
                    'success'      => $result['status'] === 'spooled',
                    'print_status' => $result['status'],
                    'message'      => $result['message'],
                ]
            ];
        } catch (\Throwable $e) {
            return ['status' => 500, 'body' => ['success' => false, 'message' => $e->getMessage()]];
        }
    }

    private static function dispatchPrintJob(int $invoiceId, SaleService $service): array
    {
        try {
            $printPayload = $service->getInvoiceForPrint($invoiceId);
            if (empty($printPayload)) {
                return [
                    'status'  => 'failed',
                    'message' => "Invoice #{$invoiceId} data could not be retrieved or formatted.",
                ];
            }

            $ch = curl_init(self::PRINT_AGENT_URL);
            curl_setopt_array($ch, [
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_POST           => true,
                CURLOPT_POSTFIELDS     => json_encode($printPayload),
                CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
                CURLOPT_TIMEOUT        => 12,
                CURLOPT_CONNECTTIMEOUT => 4,
                CURLOPT_IPRESOLVE      => CURL_IPRESOLVE_V4,
            ]);

            $response  = curl_exec($ch);
            $httpCode  = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $curlError = curl_error($ch);
            curl_close($ch);

            if ($curlError) {
                return [
                    'status'  => 'failed',
                    'message' => "cURL connection error: {$curlError} (Target: " . self::PRINT_AGENT_URL . ")",
                ];
            }

            if ($httpCode !== 200) {
                $errBody = json_decode((string)$response, true);
                $msg = $errBody['message'] ?? $response ?? "HTTP {$httpCode}";
                return [
                    'status'  => 'failed',
                    'message' => "Print Agent returned error (HTTP {$httpCode}): {$msg}",
                ];
            }

            return [
                'status'  => 'spooled',
                'message' => 'Invoice sent to printer',
            ];
        } catch (\Throwable $e) {
            return [
                'status'  => 'failed',
                'message' => 'Backend exception: ' . $e->getMessage(),
            ];
        }
    }
}