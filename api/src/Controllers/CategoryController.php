<?php

namespace App\Controllers;

use App\Pagination\PaginationMetaDataFactory;
use App\Services\CategoryService;

class CategoryController
{
    public function create(array $request): array
    {
        $input = $request['body'] ?? [];
        $user = $request['user'] ?? null;
        $input['_audit'] = [
            'employee_id' => $user['employeeId'] ?? $user['employee_id'] ?? null,
            'ip_address' => $_SERVER['REMOTE_ADDR'] ?? null,
            'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? null,
        ];

        try {
            $service = new CategoryService();
            $category = $service->create($input, $user);
            $recordedBy = $category->getRecordedBy();

            return [
                'status' => 201,
                'body' => [
                    'success' => true,
                    'data' => [
                        'category_id' => $category->getId(),
                        'name'        => $category->getName(),
                        'recorded_by' => $recordedBy ? [
                            'id'   => $recordedBy->getId(),
                            'name' => trim(preg_replace('/\s+/', ' ', sprintf(
                                '%s %s %s',
                                $recordedBy->getFirstName() ?? '',
                                $recordedBy->getMiddleName() ?? '',
                                $recordedBy->getLastName() ?? ''
                            ))),
                        ] : null,
                        'created_at'  => $category->getCreatedAt()?->format('c'),
                    ],
                ],
            ];
        } catch (\InvalidArgumentException $e) {
            return [
                'status' => 400,
                'body' => ['success' => false, 'message' => $e->getMessage()],
            ];
        } catch (\Throwable $e) {
            return [
                'status' => 500,
                'body' => [
                    'success' => false,
                    'message' => 'Database error',
                    'error'   => defined('APP_DEBUG') && APP_DEBUG ? $e->getMessage() : 'DATABASE_ERROR',
                ],
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
            'recorded_by' => $request['query']['recorded_by'] ?? null,
            'created_at'  => $request['query']['created_at'] ?? null,
            'sort'        => $request['query']['sort'] ?? null,
        ], fn($value) => $value !== null && $value !== '');

        try {
            $service = new CategoryService();
            $totalCategories = $service->countPaginated($filters);
            $categories = $service->getPaginated($page, $perPage, $filters);

            $paginationMetaData = PaginationMetaDataFactory::create($request, $totalCategories);

            return [
                'status' => 200,
                'body' => [
                    'success' => true,
                    'data' => array_map(function ($category) {
                        $recordedBy = $category->getRecordedBy();

                        return [
                            'category_id' => $category->getId(),
                            'name'        => $category->getName(),
                            'recorded_by' => $recordedBy ? [
                                'id'   => $recordedBy->getId(),
                                'name' => trim(preg_replace('/\s+/', ' ', sprintf(
                                    '%s %s %s',
                                    $recordedBy->getFirstName() ?? '',
                                    $recordedBy->getMiddleName() ?? '',
                                    $recordedBy->getLastName() ?? ''
                                ))),
                            ] : null,
                            'created_at'  => $category->getCreatedAt()?->format('c'),
                        ];
                    }, $categories),
                    'links'      => $paginationMetaData->links,
                    'pagination' => $paginationMetaData->metadata,
                ],
            ];
        } catch (\Throwable $e) {
            return [
                'status' => 500,
                'body' => [
                    'success' => false,
                    'message' => 'Database error',
                    'error'   => defined('APP_DEBUG') && APP_DEBUG ? $e->getMessage() : 'DATABASE_ERROR',
                ],
            ];
        }
    }

    public function update(array $request): array
    {
        $id = (int) ($request['params'][0] ?? 0);
        if ($id <= 0) {
            return [
                'status' => 400,
                'body'   => ['success' => false, 'message' => 'Invalid category ID']
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
            $service  = new CategoryService();
            $category = $service->update($id, $input, $user);

            if (!$category) {
                return [
                    'status' => 404,
                    'body'   => ['success' => false, 'message' => 'Category not found']
                ];
            }

            $recordedBy = $category->getRecordedBy();

            return [
                'status' => 200,
                'body'   => [
                    'success' => true,
                    'data'    => [
                        'category_id' => $category->getId(),
                        'name'        => $category->getName(),
                        'recorded_by' => $recordedBy ? [
                            'id'   => $recordedBy->getId(),
                            'name' => trim(preg_replace('/\s+/', ' ', sprintf(
                                '%s %s %s',
                                $recordedBy->getFirstName() ?? '',
                                $recordedBy->getMiddleName() ?? '',
                                $recordedBy->getLastName() ?? ''
                            ))),
                        ] : null,
                        'created_at'  => $category->getCreatedAt()?->format('c'),
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