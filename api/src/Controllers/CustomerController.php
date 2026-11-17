<?php

namespace App\Controllers;

use App\Pagination\PaginationMetaDataFactory;
use App\Entities\Customer;
use App\Services\CustomerService;

class CustomerController
{
    private static function attachAuditContext(array $request, array &$data): void
    {
        $employeeId = (int) (
            $request['user']['employeeId']
            ?? $request['user']['employee_id']
            ?? $request['employeeId']
            ?? 0
        );

        $branchId = (int) (
            $request['user']['branchId']
            ?? $request['user']['branch_id']
            ?? $request['branchId']
            ?? 0
        );

        $data['employee_id'] = $employeeId > 0 ? $employeeId : null;
        $data['branch_id'] = $branchId > 0 ? $branchId : null;
        $data['_audit'] = $request['_audit'] ?? [
            'ip_address' => $_SERVER['REMOTE_ADDR'] ?? null,
            'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? null,
        ];
    }

    public static function create(array $request): array
    {
        $service = new CustomerService();
        try {
            $data = $request['body'] ?? [];
            if (!is_array($data) || empty(array_filter($data, fn($value) => $value !== null && $value !== ''))) {
                return ['status' => 400, 'body' => ['success' => false, 'message' => 'Customer data is required']];
            }

            $allowedFields = [
                'first_name',
                'middle_name',
                'last_name',
                'contact_number',
                'email_address',
                'address',
                'street_address',
                'barangay',
                'city_municipality',
                'province',
                'region',
                'postal_code',
                'psgc_code',
                'tin',
                'business_style',
            ];
            $data = array_intersect_key($data, array_flip($allowedFields));
            if (empty(array_filter($data, fn($value) => $value !== null && $value !== ''))) {
                return ['status' => 400, 'body' => ['success' => false, 'message' => 'At least one customer field is required']];
            }

            self::attachAuditContext($request, $data);
            $customer = $service->create($data);

            return ['status' => 201, 'body' => ['success' => true, 'data' => self::serializeCustomer($customer)]];
        } catch (\Throwable $e) {
            return [
                'status' => 500,
                'body' => [
                    'success' => false,
                    'message' => 'Database error',
                    'error' => defined('APP_DEBUG') && APP_DEBUG ? $e->getMessage() : 'DATABASE_ERROR',
                ],
            ];
        }
    }

    /**
     * GET /customers
     * Returns ALL customers, regardless of branch or purchase history.
     * Any ?branch_id= query param is intentionally ignored.
     */
    public static function list(array $request): array
    {
        return self::fetchCustomers($request, null);
    }

    /**
     * GET /branches/{id}/customers
     * Returns only customers with at least one sales invoice at the given branch.
     */
    public static function listByBranch(array $request): array
    {
        $branchId = $request['params'][0] ?? null;

        if ($branchId === null || !ctype_digit((string) $branchId) || (int) $branchId <= 0) {
            return ['status' => 400, 'body' => ['success' => false, 'message' => 'Invalid branch id']];
        }

        return self::fetchCustomers($request, (int) $branchId);
    }

    /**
     * Shared pagination/filter/sort logic.
     * When $branchId is null, no branch filter is applied (all customers).
     */
    private static function fetchCustomers(array $request, ?int $branchId): array
    {
        try {
            $query = $request['query'] ?? [];
            $page = self::positiveInt($query['page'] ?? 1, 'page');
            $perPage = self::positiveInt($query['per_page'] ?? 10, 'per_page');
            if ($perPage > 100) {
                return ['status' => 400, 'body' => ['success' => false, 'message' => 'per_page cannot exceed 100']];
            }

            $filters = array_filter([
                'search' => $query['search'] ?? null,
                'first_name' => $query['first_name'] ?? null,
                'middle_name' => $query['middle_name'] ?? null,
                'last_name' => $query['last_name'] ?? null,
                'contact_number' => $query['contact_number'] ?? null,
                'email_address' => $query['email_address'] ?? null,
                'street_address' => $query['street_address'] ?? null,
                'barangay' => $query['barangay'] ?? null,
                'city_municipality' => $query['city_municipality'] ?? null,
                'province' => $query['province'] ?? null,
                'region' => $query['region'] ?? null,
                'postal_code' => $query['postal_code'] ?? null,
                'psgc_code' => $query['psgc_code'] ?? null,
                'tin' => $query['tin'] ?? null,
                'business_style' => $query['business_style'] ?? null,
                'sort' => $query['sort'] ?? null,
                // null for list(), so the repository skips the invoice subquery
                'branch_id' => $branchId,
            ], static fn ($value) => $value !== null && $value !== '');

            $service = new CustomerService();
            $totalCustomers = $service->countPaginated($filters);
            $customers = $service->getPaginated($page, $perPage, $filters);
            $pagination = PaginationMetaDataFactory::create($request, $totalCustomers);

            return [
                'status' => 200,
                'body' => [
                    'success' => true,
                    'data' => array_map([self::class, 'serializeCustomer'], $customers),
                    'links' => $pagination->links,
                    'pagination' => $pagination->metadata,
                ],
            ];
        } catch (\InvalidArgumentException $e) {
            return ['status' => 400, 'body' => ['success' => false, 'message' => $e->getMessage()]];
        } catch (\Throwable $e) {
            return [
                'status' => 500,
                'body' => [
                    'success' => false,
                    'message' => 'Database error',
                    'error' => defined('APP_DEBUG') && APP_DEBUG ? $e->getMessage() : 'DATABASE_ERROR',
                ],
            ];
        }
    }

    private static function positiveInt($value, string $name): int
    {
        if (filter_var($value, FILTER_VALIDATE_INT) === false || (int) $value < 1) {
            throw new \InvalidArgumentException($name . ' must be a positive integer');
        }

        return (int) $value;
    }

    private static function serializeCustomer(Customer $customer): array
    {
        return [
            'customer_id' => $customer->getId(),
            'first_name' => $customer->getFirstName(),
            'middle_name' => $customer->getMiddleName(),
            'last_name' => $customer->getLastName(),
            'contact_number' => $customer->getContactNumber(),
            'email_address' => $customer->getEmailAddress(),
            'address_id' => $customer->getAddress()?->getId(),
            'address' => [
                'street_address' => $customer->getStreetAddress(),
                'barangay' => $customer->getBarangay(),
                'city_municipality' => $customer->getCityMunicipality(),
                'province' => $customer->getProvince(),
                'region' => $customer->getRegion(),
                'postal_code' => $customer->getPostalCode(),
                'psgc_code' => $customer->getPsgcCode(),
            ],
            'tin' => $customer->getTin(),
            'business_style' => $customer->getBusinessStyle(),
            'created_at' => $customer->getCreatedAt()?->format('c'),
        ];
    }
}