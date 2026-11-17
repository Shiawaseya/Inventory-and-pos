<?php

namespace App\Pagination;

class PaginationMetaDataFactory {

    public static function create(array $request, int $totalItems): PaginationMetaData {
        $page = (int) ($request['query']['page'] ?? 1);
        $perPage = (int) ($request['query']['per_page'] ?? PaginationMetaData::DEFAULT_PER_PAGE);
        $totalPages = (int) ceil($totalItems / $perPage);

        $path = $request['path'] ?? '';

        $links = [
            'self' => $path . '?page=' . $page . '&per_page=' . $perPage,
            'first' => $path . '?page=1&per_page=' . $perPage,
            'last' => $path . '?page=' . $totalPages . '&per_page=' . $perPage,
            'prev' => $page > 1 ? $path . '?page=' . ($page - 1) . '&per_page=' . $perPage : null,
            'next' => $page < $totalPages ? $path . '?page=' . ($page + 1) . '&per_page=' . $perPage : null,
        ];

        return new PaginationMetaData(
            currentPage: $page,
            perPage: $perPage,
            links: $links,
            metadata: [
                'total_items' => $totalItems,
                'total_pages' => $totalPages,
                'current_page' => $page,
                'per_page' => $perPage,
            ]
        );
    }
}