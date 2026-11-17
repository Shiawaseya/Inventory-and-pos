<?php

namespace App\Controllers;

use App\Database\DatabaseManager;
use App\Entities\StockAdjustment;
use App\Entities\StockAdjustmentItem;
use App\Entities\StockUnit;
use App\Pagination\PaginationMetaDataFactory;
use App\Services\StockAdjustmentService;
use InvalidArgumentException;
use Throwable;

class StockAdjustmentController
{
    private function resolveBranchId(array $request): int
    {
        return (int) (
            $request['params'][0] 
            ?? $request['query']['branch_id'] 
            ?? $request['user']['branchId'] 
            ?? $request['user']['branch_id'] 
            ?? $request['branchId'] 
            ?? 0
        );
    }

    public function listByBranch(array $request): array
    {
        $branchId = $this->resolveBranchId($request);

        if ($branchId <= 0) {
            return [
                'status' => 400,
                'body' => ['success' => false, 'message' => 'Branch ID could not be identified from token or request.'],
            ];
        }

        $page = (int) ($request['query']['page'] ?? 1);
        $perPage = (int) ($request['query']['per_page'] ?? 10);

        $filters = array_filter([
            'adjusted_by' => $request['query']['adjusted_by'] ?? null,
            'reason' => $request['query']['reason'] ?? null,
            'adjustment_number' => $request['query']['adjustment_number'] ?? null,
            'created_at' => $request['query']['created_at'] ?? null,
            'sort' => $request['query']['sort'] ?? null,
        ], fn($value) => $value !== null && $value !== '');

        try {
            $service = new StockAdjustmentService();
            $total = $service->countByBranch($branchId, $filters);
            $adjustments = $service->getByBranch($branchId, $page, $perPage, $filters);

            $paginationMetaData = PaginationMetaDataFactory::create($request, $total);

            return [
                'status' => 200,
                'body' => [
                    'success' => true,
                    'data' => array_map(function ($adj) {
                        $employee = $adj->getAdjustedBy();

                        return [
                            'id' => $adj->getId(),
                            'adjustment_number' => $adj->getAdjustmentNumber(),
                            'branch_id' => $adj->getBranch()->getId(),
                            'reason' => $adj->getReason()->value,
                            'notes' => $adj->getNotes(),
                            'adjusted_by' => $employee ? [
                                'id' => $employee->getId(),
                                'name' => trim(preg_replace('/\s+/', ' ', sprintf(
                                    '%s %s %s',
                                    $employee->getFirstName() ?? '',
                                    $employee->getMiddleName() ?? '',
                                    $employee->getLastName() ?? ''
                                ))),
                            ] : null,
                            'total_items' => $adj->getItems()->count(),
                            'created_at' => $adj->getCreatedAt()?->format('c'),
                        ];
                    }, $adjustments),
                    'links' => $paginationMetaData->links,
                    'pagination' => $paginationMetaData->metadata,
                ],
            ];
        } catch (Throwable $e) {
            return [
                'status' => 500,
                'body' => ['success' => false, 'message' => $e->getMessage()],
            ];
        }
    }

    public function getById(array $request): array
    {
        $id = (int) ($request['params'][0] ?? 0);
        if ($id <= 0) {
            return [
                'status' => 400,
                'body' => ['success' => false, 'message' => 'Valid adjustment ID is required.'],
            ];
        }

        try {
            $em = DatabaseManager::getEntityManager();
            /** @var StockAdjustment|null $adjustment */
            $adjustment = $em->find(StockAdjustment::class, $id);

            if (!$adjustment) {
                return [
                    'status' => 404,
                    'body' => ['success' => false, 'message' => 'Stock adjustment record not found.'],
                ];
            }

            /** @var StockAdjustmentItem[] $items */
            $items = $em->getRepository(StockAdjustmentItem::class)->findByAdjustmentId($id);
            $employee = $adjustment->getAdjustedBy();

            return [
                'status' => 200,
                'body' => [
                    'success' => true,
                    'data' => [
                        'id' => $adjustment->getId(),
                        'adjustment_number' => $adjustment->getAdjustmentNumber(),
                        'branch_id' => $adjustment->getBranch()->getId(),
                        'reason' => $adjustment->getReason()->value,
                        'notes' => $adjustment->getNotes(),
                        'adjusted_by' => $employee ? [
                            'id' => $employee->getId(),
                            'name' => trim(preg_replace('/\s+/', ' ', sprintf(
                                '%s %s %s',
                                $employee->getFirstName() ?? '',
                                $employee->getMiddleName() ?? '',
                                $employee->getLastName() ?? ''
                            ))),
                        ] : null,
                        'total_items' => count($items),
                        'created_at' => $adjustment->getCreatedAt()?->format('c'),
                        'items' => array_map(function (StockAdjustmentItem $item) {
                            $stockUnit = $item->getStockUnit();
                            $variant = $stockUnit?->getVariant();
                            $itemEntity = $variant?->getItem();

                            return [
                                'id' => $item->getId(),
                                'stock_unit_id' => $stockUnit?->getId(),
                                'serial_number' => $stockUnit?->getSerialNumber(),
                                'product_name' => $itemEntity ? trim($itemEntity->getName() . ' ' . ($variant->getModel() ?? '')) : null,
                                'previous_status' => $item->getPreviousStatus()->value,
                                'new_status' => $item->getNewStatus()->value,
                                'notes' => $item->getNotes(),
                            ];
                        }, $items),
                    ],
                ],
            ];
        } catch (Throwable $e) {
            return [
                'status' => 500,
                'body' => ['success' => false, 'message' => $e->getMessage()],
            ];
        }
    }

    public function findStockUnitBySerial(array $request): array
    {
        $serial = urldecode($request['params'][0] ?? '');
        $branchId = $this->resolveBranchId($request);

        if (empty($serial)) {
            return [
                'status' => 400,
                'body' => ['success' => false, 'message' => 'Serial number is required.'],
            ];
        }

        try {
            $em = DatabaseManager::getEntityManager();
            $criteria = ['serialNumber' => $serial];
            if ($branchId > 0) {
                $criteria['branch'] = $branchId;
            }

            /** @var StockUnit|null $unit */
            $unit = $em->getRepository(StockUnit::class)->findOneBy($criteria);

            if (!$unit) {
                return [
                    'status' => 404,
                    'body' => ['success' => false, 'message' => 'Stock unit with serial number not found in this branch.'],
                ];
            }

            $variant = $unit->getVariant();
            $item = $variant?->getItem();

            return [
                'status' => 200,
                'body' => [
                    'success' => true,
                    'data' => [
                        'stock_unit_id' => $unit->getId(),
                        'serial_number' => $unit->getSerialNumber(),
                        'status' => $unit->getStatus()->value,
                        'product_name' => $item ? trim($item->getName() . ' ' . ($variant->getModel() ?? '')) : null,
                    ],
                ],
            ];
        } catch (Throwable $e) {
            return [
                'status' => 500,
                'body' => ['success' => false, 'message' => $e->getMessage()],
            ];
        }
    }

    public function create(array $request): array
    {
        $body = $request['body'] ?? [];

        $employeeId = (int) (
            $request['user']['employeeId'] 
            ?? $request['user']['employee_id'] 
            ?? $request['employeeId'] 
            ?? 0
        );

        if ($employeeId <= 0) {
            return [
                'status' => 401,
                'body' => [
                    'success' => false, 
                    'message' => 'Unauthorized: Missing or invalid employee authentication token.'
                ],
            ];
        }

        // Branch resolved from token if not explicitly passed
        if (empty($body['branch_id'])) {
            $body['branch_id'] = $this->resolveBranchId($request);
        }

        if ($body['branch_id'] <= 0) {
            return [
                'status' => 400,
                'body' => ['success' => false, 'message' => 'No valid branch ID associated with this session.'],
            ];
        }

        $body['employee_id'] = $employeeId;
        $body['_audit'] = [
            'ip_address' => $_SERVER['REMOTE_ADDR'] ?? null,
            'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? null,
        ];

        try {
            $service = new StockAdjustmentService();
            $adjustment = $service->createAdjustment($body);

            return [
                'status' => 201,
                'body' => [
                    'success' => true,
                    'message' => 'Stock adjustment created successfully.',
                    'data' => [
                        'id' => $adjustment->getId(),
                        'adjustment_number' => $adjustment->getAdjustmentNumber(),
                        'branch_id' => $adjustment->getBranch()->getId(),
                        'reason' => $adjustment->getReason()->value,
                        'total_items' => $adjustment->getItems()->count(),
                        'created_at' => $adjustment->getCreatedAt()?->format('c'),
                    ],
                ],
            ];
        } catch (InvalidArgumentException $e) {
            return [
                'status' => 400,
                'body' => ['success' => false, 'message' => $e->getMessage()],
            ];
        } catch (Throwable $e) {
            return [
                'status' => 500,
                'body' => ['success' => false, 'message' => $e->getMessage()],
            ];
        }
    }
}