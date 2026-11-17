<?php

namespace App\Controllers;

use App\Pagination\PaginationMetaDataFactory;
use App\Services\AuditLogService;

class AuditLogController
{
    public function list(array $request): array
    {
        $page = max(1, (int) ($request['query']['page'] ?? 1));
        $perPage = min(100, max(1, (int) ($request['query']['per_page'] ?? 25)));
        $filters = array_filter([
            'action' => $request['query']['action'] ?? null,
            'module' => $request['query']['module'] ?? null,
            'record_id' => $request['query']['record_id'] ?? null,
            'employee_id' => $request['query']['employee_id'] ?? null,
            'branch_id' => $request['query']['branch_id'] ?? null,
        ], fn($value) => $value !== null && $value !== '');

        try {
            $service = new AuditLogService();
            $total = $service->countPaginated($filters);
            $logs = $service->getPaginated($page, $perPage, $filters);
            $pagination = PaginationMetaDataFactory::create($request, $total);

            return [
                'status' => 200,
                'body' => [
                    'success' => true,
                    'data' => array_map(function ($log) use ($service) {
                        $view = $service->present($log);

                        return [
                            'audit_id' => $log->getId(),
                            'employee_id' => $log->getEmployee()?->getId(),
                            'employee_name' => $log->getEmployeeName(),
                            'branch_id' => $log->getBranch()?->getId(),
                            'action' => $log->getAction(),
                            'module' => $log->getModule(),
                            'record_id' => $log->getRecordId(),

                            // Plain-language fields for screens used by non-technical staff.
                            'action_label' => $view['action_label'],
                            'module_label' => $view['module_label'],
                            'record_label' => $view['record_label'],
                            'headline' => $view['headline'],
                            'changes' => $view['changes'],
                            'details' => $view['details'],
                            'description' => $service->describe($log, $view),

                            // Raw data, kept for the technical "before / after" view.
                            'old_values' => $log->getOldValues(),
                            'new_values' => $log->getNewValues(),
                            'ip_address' => $log->getIpAddress(),
                            'user_agent' => $log->getUserAgent(),
                            'created_at' => $log->getCreatedAt()->format('c'),
                        ];
                    }, $logs),
                    'links' => $pagination->links,
                    'pagination' => $pagination->metadata,
                ],
            ];
        } catch (\Throwable $e) {
            // Keep the technical reason in the server log, not on the user's screen.
            error_log('Failed to load audit logs: ' . $e->getMessage());
            return [
                'status' => 500,
                'body' => [
                    'success' => false,
                    'message' => 'We could not load the activity history right now. '
                        . 'Please try again in a moment, or contact your administrator if it keeps happening.',
                ],
            ];
        }
    }
}