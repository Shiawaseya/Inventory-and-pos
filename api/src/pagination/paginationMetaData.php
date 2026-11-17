<?php
namespace App\Pagination;

readonly class PaginationMetaData {

    public const DEFAULT_PER_PAGE = 10;

    public function __construct(
        public int $currentPage,
        public int $perPage,
        public array $links,
        public array $metadata
    ) {}
}