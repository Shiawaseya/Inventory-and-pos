<?php

namespace App\Repositories\Traits;

use Doctrine\ORM\QueryBuilder;

trait SortableRepositoryTrait
{
    /**
     * Applies sorting to a QueryBuilder instance based on an allowed field map and default fallback.
     *
     * @param QueryBuilder $qb
     * @param array $filters The query params containing the 'sort' key (e.g., 'date_of_purchase,-total_amount')
     * @param array<string, string> $sortMap Mapping of request param names to DQL entity paths (e.g., ['total_amount' => 'si.totalAmount'])
     * @param array<string, string> $defaultSort Fallback sort order if none is supplied (e.g., ['si.dateOfPurchase' => 'DESC', 'si.id' => 'DESC'])
     */
    protected function applySorting(
        QueryBuilder $qb,
        array $filters,
        array $sortMap,
        array $defaultSort = []
    ): void {
        $sortParam = $filters['sort'] ?? null;

        if (empty($sortParam)) {
            foreach ($defaultSort as $field => $direction) {
                $qb->addOrderBy($field, $direction);
            }
            return;
        }

        $fields = explode(',', (string) $sortParam);

        foreach ($fields as $field) {
            $field = trim($field);
            if ($field === '') {
                continue;
            }

            $direction = 'ASC';
            if (str_starts_with($field, '-')) {
                $direction = 'DESC';
                $field = ltrim($field, '-');
            }

            // Only sort allowed mapped fields to prevent DQL injection
            if (isset($sortMap[$field])) {
                $qb->addOrderBy($sortMap[$field], $direction);
            }
        }
    }
}