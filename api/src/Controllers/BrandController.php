<?php

namespace App\Controllers;

use App\Pagination\PaginationMetaDataFactory;
use App\Services\BrandService;

class BrandController
{
    public function create(array $request): array
    {
        $input = $request['body'] ?? [];

        $employeeId = (int) ($request['user']['employeeId'] ?? $request['user']['employee_id'] ?? 0);
        if ($employeeId <= 0) {
            return ['status' => 401, 'body' => ['success' => false, 'message' => 'Authenticated employee is required']];
        }
        $input['recorded_by'] = $employeeId;
        $input['_audit'] = [
            'employee_id' => $employeeId,
            'ip_address' => $_SERVER['REMOTE_ADDR'] ?? null,
            'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? null,
        ];

        try {
            $service = new BrandService();
            $brand = $service->create($input);
            $recordedBy = $brand->getRecordedBy();

            return [
                'status' => 201,
                'body' => [
                    'success' => true,
                    'data' => [
                        'brand_id'    => $brand->getId(),
                        'name'        => $brand->getName(),
                        'is_active'   => $brand->isActive(),
                        'recorded_by' => $recordedBy ? [
                            'id'   => $recordedBy->getId(),
                            'name' => trim(preg_replace('/\s+/', ' ', sprintf(
                                '%s %s %s',
                                $recordedBy->getFirstName() ?? '',
                                $recordedBy->getMiddleName() ?? '',
                                $recordedBy->getLastName() ?? ''
                            ))),
                        ] : null,
                        'created_at'  => $brand->getCreatedAt()?->format('c'),
                    ]
                ]
            ];
        } catch (\InvalidArgumentException $e) {
            return [
                'status' => 400,
                'body' => ['success' => false, 'message' => $e->getMessage()]
            ];
        } catch (\Throwable $e) {
            return [
                'status' => 500,
                'body' => ['success' => false, 'message' => $e->getMessage()]
            ];
        }
    }

    public function list(array $request): array
    {
        $page = (int) ($request['query']['page'] ?? 1);
        $perPage = (int) ($request['query']['per_page'] ?? 10);

        $filters = array_filter([
            'name'        => $request['query']['name'] ?? null,
            'search'      => $request['query']['search'] ?? null,
            'is_active'   => $request['query']['is_active'] ?? null,
            'recorded_by' => $request['query']['recorded_by'] ?? null,
            'sort'        => $request['query']['sort'] ?? null,
        ], fn($value) => $value !== null && $value !== '');

        try {
            $service = new BrandService();
            $totalBrands = $service->countPaginated($filters);
            $brands = $service->getPaginated($page, $perPage, $filters);

            $paginationMetaData = PaginationMetaDataFactory::create($request, $totalBrands);

            return [
                'status' => 200,
                'body' => [
                    'success' => true,
                    'data' => array_map(function ($brand) {
                        $recordedBy = $brand->getRecordedBy();

                        return [
                            'brand_id'    => $brand->getId(),
                            'name'        => $brand->getName(),
                            'is_active'   => $brand->isActive(),
                            'recorded_by' => $recordedBy ? [
                                'id'   => $recordedBy->getId(),
                                'name' => trim(preg_replace('/\s+/', ' ', sprintf(
                                    '%s %s %s',
                                    $recordedBy->getFirstName() ?? '',
                                    $recordedBy->getMiddleName() ?? '',
                                    $recordedBy->getLastName() ?? ''
                                ))),
                            ] : null,
                            'created_at'  => $brand->getCreatedAt()?->format('c'),
                        ];
                    }, $brands),
                    'links'      => $paginationMetaData->links,
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
    
    public function update(array $request): array
    {
        $id = (int) ($request['params'][0] ?? 0);
        if ($id <= 0) {
            return [
                'status' => 400,
                'body'   => ['success' => false, 'message' => 'Invalid brand ID']
            ];
        }

        $input = $request['body'] ?? [];
        $user  = $request['user'] ?? null;
        $employeeId = (int) ($user['employeeId'] ?? $user['employee_id'] ?? 0);
        $input['_audit'] = [
            'employee_id' => $employeeId > 0 ? $employeeId : null,
            'ip_address' => $_SERVER['REMOTE_ADDR'] ?? null,
            'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? null,
        ];

        try {
            $service = new BrandService();
            $brand   = $service->update($id, $input, $user);

            if (!$brand) {
                return [
                    'status' => 404,
                    'body'   => ['success' => false, 'message' => 'Brand not found']
                ];
            }

            $recordedBy = $brand->getRecordedBy();

            return [
                'status' => 200,
                'body'   => [
                    'success' => true,
                    'data'    => [
                        'brand_id'    => $brand->getId(),
                        'name'        => $brand->getName(),
                        'is_active'   => $brand->isActive(),
                        'recorded_by' => $recordedBy ? [
                            'id'   => $recordedBy->getId(),
                            'name' => trim(preg_replace('/\s+/', ' ', sprintf(
                                '%s %s %s',
                                $recordedBy->getFirstName() ?? '',
                                $recordedBy->getMiddleName() ?? '',
                                $recordedBy->getLastName() ?? ''
                            ))),
                        ] : null,
                        'created_at'  => $brand->getCreatedAt()?->format('c'),
                    ]
                ]
            ];
        } catch (\InvalidArgumentException $e) {
            return [
                'status' => 400,
                'body'   => ['success' => false, 'message' => $e->getMessage()]
            ];
        } catch (\Throwable $e) {
            return [
                'status' => 500,
                'body'   => [
                    'success' => false,
                    'message' => 'Database error',
                    'error'   => defined('APP_DEBUG') && APP_DEBUG ? $e->getMessage() : 'DATABASE_ERROR'
                ]
            ];
        }
    }
}