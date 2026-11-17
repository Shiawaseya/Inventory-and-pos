<?php

namespace App\Repositories;

use Doctrine\DBAL\Connection;

/**
 * Read-only, variant-level lookup for the POS stock & price checker.
 * Raw SQL on purpose: the filters are EAV joins over item_variant_specifications
 * and are clearer (and faster) as EXISTS clauses than as DQL.
 */
class StockCheckerRepository
{
    private const SORT_MAP = [
        'name'       => 'i.name ASC, v.model ASC, v.variant_id ASC',
        'price_asc'  => 'bi.price ASC, i.name ASC, v.variant_id ASC',
        'price_desc' => 'bi.price DESC, i.name ASC, v.variant_id ASC',
        'stock_desc' => 'available_count DESC, i.name ASC, v.variant_id ASC',
    ];

    /** Available units: stock_unit rows for serialized items, inventory.quantity otherwise. */
    private const STOCK_EXPR = "CASE WHEN i.is_serialized = 1
        THEN (SELECT COUNT(*) FROM stock_unit su
              WHERE su.variant_id = v.variant_id AND su.branch_id = :branch AND su.status = 'available')
        ELSE COALESCE(inv.quantity, 0) END";

    private const FROM_SQL = "FROM item_variants v
        JOIN items i ON i.item_id = v.item_id
        JOIN branch_item bi ON bi.variant_id = v.variant_id AND bi.branch_id = :branch
        LEFT JOIN inventory inv ON inv.variant_id = v.variant_id AND inv.branch_id = :branch
        LEFT JOIN brands b ON b.brand_id = i.brand_id
        LEFT JOIN categories c ON c.category_id = i.category_id";

    public function __construct(private Connection $db)
    {
    }

    /**
     * @param array $f {branch_id, search, category_id, brand_id, price_min, price_max,
     *                  in_stock, sort, specs: array<attrId, {min,max,unit_id,option_ids,text}>}
     */
    public function search(array $f, int $page, int $perPage): array
    {
        [$where, $params] = $this->buildWhere($f);
        $params['min_stock'] = !empty($f['in_stock']) ? 1 : 0;
        $sort = self::SORT_MAP[$f['sort'] ?? 'name'] ?? self::SORT_MAP['name'];
        $stock = self::STOCK_EXPR;
        $from = self::FROM_SQL;

        $total = (int) $this->db->fetchOne(
            "SELECT COUNT(*) $from WHERE $where AND ($stock) >= :min_stock",
            $params
        );

        $limit = (int) $perPage;
        $offset = max(0, ($page - 1) * $perPage);
        $rows = $this->db->fetchAllAssociative(
            "SELECT v.variant_id, v.item_id, v.model, v.sku, v.image_url AS variant_image,
                    i.name AS item_name, i.image_url AS item_image, i.is_serialized,
                    b.name AS brand, c.name AS category, bi.price, ($stock) AS available_count
             $from
             WHERE $where AND ($stock) >= :min_stock
             ORDER BY $sort
             LIMIT $limit OFFSET $offset",
            $params
        );

        $specs = $this->specsFor(array_map(fn($r) => (int) $r['variant_id'], $rows));

        $data = array_map(fn($r) => [
            'variant_id'      => (int) $r['variant_id'],
            'item_id'         => (int) $r['item_id'],
            'item_name'       => $r['item_name'],
            'model'           => $r['model'],
            'sku'             => $r['sku'],
            'image_url'       => $r['variant_image'] ?: $r['item_image'],
            'brand'           => $r['brand'],
            'category'        => $r['category'],
            'is_serialized'   => (bool) $r['is_serialized'],
            'price'           => (float) $r['price'],
            'available_count' => (int) $r['available_count'],
            'specs'           => $specs[(int) $r['variant_id']] ?? [],
        ], $rows);

        return [
            'data' => $data,
            'pagination' => [
                'current_page' => $page,
                'per_page'     => $perPage,
                'total_items'  => $total,
                'total_pages'  => $perPage > 0 ? (int) ceil($total / $perPage) : 1,
            ],
        ];
    }

    /**
     * Filter options for the sidebar. Scoped to the branch (and category when given)
     * so ranges/options only describe variants that can actually be sold here.
     */
    public function facets(int $branchId, ?int $categoryId): array
    {
        $params = ['branch' => $branchId];
        $scope = "v.is_active = 1";
        if ($categoryId) {
            $scope .= " AND i.category_id = :category";
            $params['category'] = $categoryId;
        }

        $specFrom = "FROM item_variant_specifications s
            JOIN item_attributes a ON a.attribute_id = s.attribute_id
            JOIN item_variants v ON v.variant_id = s.variant_id
            JOIN items i ON i.item_id = v.item_id
            JOIN branch_item bi ON bi.variant_id = v.variant_id AND bi.branch_id = :branch";

        $categories = $this->db->fetchAllAssociative(
            "SELECT c.category_id, c.name, COUNT(DISTINCT v.variant_id) AS variant_count
             FROM branch_item bi
             JOIN item_variants v ON v.variant_id = bi.variant_id AND v.is_active = 1
             JOIN items i ON i.item_id = v.item_id
             JOIN categories c ON c.category_id = i.category_id
             WHERE bi.branch_id = :branch
             GROUP BY c.category_id, c.name ORDER BY c.name",
            ['branch' => $branchId]
        );

        $price = $this->db->fetchAssociative(
            "SELECT MIN(bi.price) AS min, MAX(bi.price) AS max
             FROM branch_item bi
             JOIN item_variants v ON v.variant_id = bi.variant_id AND v.is_active = 1
             JOIN items i ON i.item_id = v.item_id
             WHERE bi.branch_id = :branch" . ($categoryId ? " AND i.category_id = :category" : ""),
            $params
        );

        $attrs = [];

        // numeric -> min/max per unit
        $numeric = $this->db->fetchAllAssociative(
            "SELECT s.attribute_id, a.name, s.unit_id, u.symbol, MIN(s.numeric_value) AS min, MAX(s.numeric_value) AS max
             $specFrom LEFT JOIN attribute_units u ON u.unit_id = s.unit_id
             WHERE a.data_type = 'numeric' AND s.numeric_value IS NOT NULL AND $scope
             GROUP BY s.attribute_id, a.name, s.unit_id, u.symbol ORDER BY a.name",
            $params
        );
        foreach ($numeric as $r) {
            $id = (int) $r['attribute_id'];
            $attrs[$id] ??= ['attribute_id' => $id, 'name' => $r['name'], 'data_type' => 'numeric', 'units' => []];
            $attrs[$id]['units'][] = [
                'unit_id' => $r['unit_id'] !== null ? (int) $r['unit_id'] : null,
                'symbol'  => $r['symbol'],
                'min'     => (float) $r['min'],
                'max'     => (float) $r['max'],
            ];
        }

        // option -> distinct options with counts
        $options = $this->db->fetchAllAssociative(
            "SELECT s.attribute_id, a.name, o.option_id, o.option_value, COUNT(DISTINCT v.variant_id) AS variant_count
             $specFrom JOIN attribute_options o ON o.option_id = s.option_id
             WHERE a.data_type = 'option' AND $scope
             GROUP BY s.attribute_id, a.name, o.option_id, o.option_value ORDER BY a.name, o.option_value",
            $params
        );
        foreach ($options as $r) {
            $id = (int) $r['attribute_id'];
            $attrs[$id] ??= ['attribute_id' => $id, 'name' => $r['name'], 'data_type' => 'option', 'options' => []];
            $attrs[$id]['options'][] = [
                'option_id' => (int) $r['option_id'],
                'value'     => $r['option_value'],
                'count'     => (int) $r['variant_count'],
            ];
        }

        // text -> just the attribute (free "contains" search)
        $texts = $this->db->fetchAllAssociative(
            "SELECT DISTINCT s.attribute_id, a.name $specFrom
             WHERE a.data_type = 'text' AND s.text_value IS NOT NULL AND $scope ORDER BY a.name",
            $params
        );
        foreach ($texts as $r) {
            $id = (int) $r['attribute_id'];
            $attrs[$id] = ['attribute_id' => $id, 'name' => $r['name'], 'data_type' => 'text'];
        }

        uasort($attrs, fn($x, $y) => strcasecmp($x['name'], $y['name']));

        return [
            'categories' => array_map(fn($r) => [
                'category_id'   => (int) $r['category_id'],
                'name'          => $r['name'],
                'variant_count' => (int) $r['variant_count'],
            ], $categories),
            'price'      => ['min' => (float) ($price['min'] ?? 0), 'max' => (float) ($price['max'] ?? 0)],
            'attributes' => array_values($attrs),
        ];
    }

    /** @return array{0:string,1:array} */
    private function buildWhere(array $f): array
    {
        $where = ['v.is_active = 1'];
        $params = ['branch' => (int) $f['branch_id']];

        if (!empty($f['search'])) {
            $term = trim((string) $f['search']);
            $where[] = "(i.name LIKE :q OR v.model LIKE :q OR v.sku LIKE :q OR b.name LIKE :q
                         OR EXISTS (SELECT 1 FROM stock_unit sq WHERE sq.variant_id = v.variant_id AND sq.serial_number = :q_exact))";
            $params['q'] = '%' . $term . '%';
            $params['q_exact'] = $term;
        }
        if (!empty($f['category_id'])) {
            $where[] = 'i.category_id = :category';
            $params['category'] = (int) $f['category_id'];
        }
        if (!empty($f['brand_id'])) {
            $where[] = 'i.brand_id = :brand';
            $params['brand'] = (int) $f['brand_id'];
        }
        if (isset($f['price_min']) && is_numeric($f['price_min'])) {
            $where[] = 'bi.price >= :price_min';
            $params['price_min'] = (float) $f['price_min'];
        }
        if (isset($f['price_max']) && is_numeric($f['price_max'])) {
            $where[] = 'bi.price <= :price_max';
            $params['price_max'] = (float) $f['price_max'];
        }

        // Specification filters: AND across attributes, one EXISTS per attribute.
        $n = 0;
        foreach (($f['specs'] ?? []) as $attrId => $spec) {
            $attrId = (int) $attrId;
            if ($attrId <= 0 || !is_array($spec)) continue;

            $p = "sp{$n}_";
            $conds = ['s.variant_id = v.variant_id', "s.attribute_id = :{$p}a"];
            $local = ["{$p}a" => $attrId];
            $active = false;

            $hasMin = isset($spec['min']) && is_numeric($spec['min']);
            $hasMax = isset($spec['max']) && is_numeric($spec['max']);
            if ($hasMin) {
                $conds[] = "s.numeric_value >= :{$p}min";
                $local["{$p}min"] = (float) $spec['min'];
                $active = true;
            }
            if ($hasMax) {
                $conds[] = "s.numeric_value <= :{$p}max";
                $local["{$p}max"] = (float) $spec['max'];
                $active = true;
            }
            if (($hasMin || $hasMax) && isset($spec['unit_id']) && is_numeric($spec['unit_id'])) {
                $conds[] = "s.unit_id = :{$p}unit";
                $local["{$p}unit"] = (int) $spec['unit_id'];
            }

            $optionIds = $spec['option_ids'] ?? [];
            if (is_string($optionIds)) $optionIds = explode(',', $optionIds);
            $optionIds = array_values(array_filter(array_map('intval', (array) $optionIds), fn($x) => $x > 0));
            if ($optionIds) {
                $ph = [];
                foreach ($optionIds as $k => $oid) {
                    $ph[] = ":{$p}o{$k}";
                    $local["{$p}o{$k}"] = $oid;
                }
                $conds[] = 's.option_id IN (' . implode(',', $ph) . ')';
                $active = true;
            }

            if (isset($spec['text']) && trim((string) $spec['text']) !== '') {
                $conds[] = "s.text_value LIKE :{$p}text";
                $local["{$p}text"] = '%' . trim((string) $spec['text']) . '%';
                $active = true;
            }

            if (!$active) continue; // nothing selected for this attribute

            $where[] = 'EXISTS (SELECT 1 FROM item_variant_specifications s WHERE ' . implode(' AND ', $conds) . ')';
            $params += $local;
            $n++;
        }

        return [implode(' AND ', $where), $params];
    }

    /** @return array<int, array> variant_id => spec rows for the card */
    private function specsFor(array $variantIds): array
    {
        if (!$variantIds) return [];
        $ph = [];
        $params = [];
        foreach ($variantIds as $k => $id) {
            $ph[] = ":v{$k}";
            $params["v{$k}"] = $id;
        }

        $rows = $this->db->fetchAllAssociative(
            "SELECT s.variant_id, a.attribute_id, a.name, a.data_type, o.option_value, s.numeric_value, s.text_value, u.symbol
             FROM item_variant_specifications s
             JOIN item_attributes a ON a.attribute_id = s.attribute_id
             LEFT JOIN attribute_options o ON o.option_id = s.option_id
             LEFT JOIN attribute_units u ON u.unit_id = s.unit_id
             WHERE s.variant_id IN (" . implode(',', $ph) . ")
             ORDER BY a.name",
            $params
        );

        $out = [];
        foreach ($rows as $r) {
            $value = $r['option_value'];
            if ($value === null && $r['numeric_value'] !== null) {
                $value = rtrim(rtrim(number_format((float) $r['numeric_value'], 4, '.', ''), '0'), '.');
            }
            $value ??= $r['text_value'];
            $out[(int) $r['variant_id']][] = [
                'attribute_id' => (int) $r['attribute_id'],
                'name'         => $r['name'],
                'data_type'    => $r['data_type'],
                'value'        => $value,
                'unit'         => $r['symbol'],
            ];
        }
        return $out;
    }
}