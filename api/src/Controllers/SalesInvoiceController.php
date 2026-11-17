<?php

namespace App\Controllers;

use App\Pagination\PaginationMetaDataFactory;
use App\Services\SalesInvoiceService;

class SalesInvoiceController
{
    public function listParked(array $request): array
    {
        $user = $request['user'] ?? [];
        $branchId = (int) ($user['branchId'] ?? $user['branch_id'] ?? 0);
        $employeeId = (int) ($user['employeeId'] ?? $user['employee_id'] ?? 0);
        $role = strtolower((string) ($user['role'] ?? ''));
        $position = strtolower((string) ($user['position'] ?? ''));
        $isSalesOic = in_array('sales-oic', [$role, $position], true)
            || (in_array('admin', [$role, $position], true) && $position === 'sales-oic');
        $isSalesRepresentative = in_array('sales-representative', [$role, $position], true)
            || (in_array('team', [$role, $position], true) && $position === 'sales-representative');

        if ($branchId <= 0 || $employeeId <= 0) {
            return ['status' => 401, 'body' => ['success' => false, 'message' => 'Authenticated employee and branch are required']];
        }
        if (!$isSalesOic && !$isSalesRepresentative) {
            return ['status' => 403, 'body' => ['success' => false, 'message' => 'You are not allowed to view parked invoices']];
        }

        $query = array_merge($_GET ?? [], $request['query'] ?? []);
        $page = max(1, (int) ($query['page'] ?? 1));
        $perPage = min(100, max(1, (int) ($query['per_page'] ?? 10)));

        $filters = [
            'statuses'             => ['parked'],
            'sort'                 => $query['sort'] ?? null,
            'search'               => $query['search'] ?? $query['q'] ?? null,
            'sales_invoice_number' => $query['sales_invoice_number'] ?? null,
            'created_by'           => $query['created_by'] ?? null,
            'created_at'           => $query['created_at'] ?? null,
            'customer_id'          => $query['customer_id'] ?? null,
            'customer_search'      => $query['customer_search'] ?? null,
        ];

        if (!$isSalesOic) {
            $filters['created_by'] = $employeeId;
        }

        $filters = array_filter($filters, fn($value) => $value !== null && $value !== '');

        try {
            $service = new SalesInvoiceService();
            $totalInvoices = $service->countByBranch($branchId, $filters);
            $invoices = $service->getByBranch($branchId, $page, $perPage, $filters);
            $pagination = PaginationMetaDataFactory::create($request, $totalInvoices);

            return [
                'status' => 200,
                'body' => [
                    'success' => true,
                    'data' => array_map([$this, 'serializeInvoice'], $invoices),
                    'links' => $pagination->links,
                    'pagination' => $pagination->metadata,
                ],
            ];
        } catch (\Throwable $e) {
            return ['status' => 500, 'body' => ['success' => false, 'message' => 'Database error']];
        }
    }

    public function listByBranch(array $request): array
    {
        $branchId = (int) ($request['params'][0] ?? $request['body']['branch_id'] ?? $request['branch_id'] ?? 0);
        $userBranchId = (int) (($request['user']['branchId'] ?? $request['user']['branch_id'] ?? 0));

        if ($userBranchId <= 0 || $branchId !== $userBranchId) {
            return [
                'status' => 403,
                'body' => ['success' => false, 'message' => 'You are not allowed to view invoices for this branch'],
            ];
        }
        
        if ($branchId <= 0) {
            return [
                'status' => 400, 
                'body' => ['success' => false, 'message' => 'branch_id is required']
            ];
        }

        $query = array_merge($_GET ?? [], $request['query'] ?? []);
        $page = (int) ($query['page'] ?? 1);
        $perPage = (int) ($query['per_page'] ?? 10);

        $filters = array_filter([
            'sales_invoice_number' => $query['sales_invoice_number'] ?? null,
            'search'               => $query['search'] ?? $query['q'] ?? null,
            'created_by'           => $query['created_by'] ?? null,
            'created_at'           => $query['created_at'] ?? null,
            'status'               => $query['status'] ?? null,
            'customer_id'          => $query['customer_id'] ?? null,
            'customer_search'      => $query['customer_search'] ?? null,
            'sort'                 => $query['sort'] ?? null,
        ], fn($value) => $value !== null && $value !== '');

        try {
            $service = new SalesInvoiceService();
            
            $totalInvoices = $service->countByBranch($branchId, $filters);
            $invoices = $service->getByBranch($branchId, $page, $perPage, $filters);

            $paginationMetaData = PaginationMetaDataFactory::create($request, $totalInvoices);

            return [
                'status' => 200,
                'body' => [
                    'success' => true,
                    'data' => array_map([$this, 'serializeInvoice'], $invoices),
                    'links' => $paginationMetaData->links,
                    'pagination' => $paginationMetaData->metadata,
                ],
            ];
        } catch (\Throwable $e) {
            return [
                'status' => 500, 
                'body' => ['success' => false, 'message' => $e->getMessage()]
            ];
        }
    }

    private function serializeInvoice($invoice): array
    {
        $customer = $invoice->getCustomer();
        $employee = $invoice->getEmployee();
        $authorizer = $invoice->getAuthorizedBy();

        $items = [];
        foreach ($invoice->getDetails() as $detail) {
            $stockUnit = $detail->getStockUnit();
            $inventory = $detail->getInventory();

            $variant = $stockUnit ? $stockUnit->getVariant() : ($inventory ? $inventory->getVariant() : null);
            $item = $variant?->getItem();

            $items[] = [
                'detail_id'     => $detail->getId(),
                'quantity'      => $detail->getQuantity(),
                'unit_price'    => $detail->getUnitPriceAtSale(),
                'item_name'     => $item?->getName() ?? 'Item',
                'model'         => $variant?->getModel() ?? '',
                'sku'           => $variant?->getSku() ?? '',
                'serial_number' => $stockUnit?->getSerialNumber(),
                'stock_unit_id' => $stockUnit?->getId(),
                'inventory_id'  => $inventory?->getId(),
            ];
        }

        return [
            'id' => $invoice->getId(),
            'sales_invoice_number' => $invoice->getInvoiceNumber(),
            'date_of_purchase' => $invoice->getDateOfPurchase()?->format('Y-m-d'),
            'total_amount' => $invoice->getTotalAmount(),
            'payment_method' => $invoice->getPaymentMethod(),
            'status' => $invoice->getStatus()->value,
            'reference_note' => $invoice->getReferenceNote(),
            'items' => $items,
            'customer' => $customer ? [
                'id' => $customer->getId(),
                'full_name' => method_exists($customer, 'getFullName')
                    ? $customer->getFullName()
                    : trim(($customer->getFirstName() ?? '') . ' ' . ($customer->getLastName() ?? '')),
            ] : null,
            'employee' => $employee ? [
                'id' => $employee->getId(),
                'name' => trim(preg_replace('/\s+/', ' ', sprintf(
                    '%s %s %s',
                    $employee->getFirstName() ?? '',
                    $employee->getMiddleName() ?? '',
                    $employee->getLastName() ?? ''
                ))),
            ] : null,
            'authorized_by' => $authorizer ? [
                'id' => $authorizer->getId(),
                'name' => trim(preg_replace('/\s+/', ' ', sprintf(
                    '%s %s %s',
                    $authorizer->getFirstName() ?? '',
                    $authorizer->getMiddleName() ?? '',
                    $authorizer->getLastName() ?? ''
                ))),
            ] : null,
            'authorized_at' => $invoice->getAuthorizedAt()?->format('c'),
            'branch_id' => $invoice->getBranch()->getId(),
            'created_at' => $invoice->getCreatedAt()?->format('c'),
        ];
    }
    public function listMineOrBranch(array $request): array
{
    $user = $request['user'] ?? [];
    $userBranchId = (int) ($user['branchId'] ?? $user['branch_id'] ?? 0);
    $employeeId = (int) ($user['employeeId'] ?? $user['employee_id'] ?? 0);
    $branchId = (int) ($request['params'][0] ?? $request['body']['branch_id'] ?? $request['branch_id'] ?? 0);

    // 1. Verify branch & employee presence
    if ($userBranchId <= 0 || $employeeId <= 0) {
        return [
            'status' => 401,
            'body' => ['success' => false, 'message' => 'Authenticated employee and branch are required'],
        ];
    }

    // 2. Prevent accessing other branches
    if ($branchId <= 0 || $branchId !== $userBranchId) {
        return [
            'status' => 403,
            'body' => ['success' => false, 'message' => 'You are not allowed to view invoices for this branch'],
        ];
    }

    // 3. Resolve role permissions
    $role = strtolower((string) ($user['role'] ?? ''));
    $position = strtolower((string) ($user['position'] ?? ''));

    $isSalesOic = in_array('sales-oic', [$role, $position], true)
        || (in_array('admin', [$role, $position], true) && $position === 'sales-oic');

    $isSalesRepresentative = in_array('sales-representative', [$role, $position], true)
        || (in_array('team', [$role, $position], true) && $position === 'sales-representative');

    if (!$isSalesOic && !$isSalesRepresentative) {
        return [
            'status' => 403,
            'body' => ['success' => false, 'message' => 'Access denied'],
        ];
    }

    // 4. Build query & filters
    $query = array_merge($_GET ?? [], $request['query'] ?? []);
    $page = max(1, (int) ($query['page'] ?? 1));
    $perPage = min(100, max(1, (int) ($query['per_page'] ?? 10)));

    $filters = [
        'sales_invoice_number' => $query['sales_invoice_number'] ?? null,
        'search'               => $query['search'] ?? $query['q'] ?? null,
        'created_at'           => $query['created_at'] ?? null,
        'status'               => $query['status'] ?? null,
        'customer_id'          => $query['customer_id'] ?? null,
        'customer_search'      => $query['customer_search'] ?? null,
        'sort'                 => $query['sort'] ?? null,
        'created_by'           => $query['created_by'] ?? null,
    ];

    // Restrict sales representatives strictly to their own created invoices
    if (!$isSalesOic) {
        $filters['created_by'] = $employeeId;
    }

    $filters = array_filter($filters, fn($value) => $value !== null && $value !== '');

    try {
        $service = new SalesInvoiceService();
        $totalInvoices = $service->countByBranch($branchId, $filters);
        $invoices = $service->getByBranch($branchId, $page, $perPage, $filters);

        $paginationMetaData = PaginationMetaDataFactory::create($request, $totalInvoices);

        return [
            'status' => 200,
            'body' => [
                'success' => true,
                'data' => array_map([$this, 'serializeInvoice'], $invoices),
                'links' => $paginationMetaData->links,
                'pagination' => $paginationMetaData->metadata,
            ],
        ];
    } catch (\Throwable $e) {
        return [
            'status' => 500,
            'body' => ['success' => false, 'message' => $e->getMessage()],
        ];
    }
}
}