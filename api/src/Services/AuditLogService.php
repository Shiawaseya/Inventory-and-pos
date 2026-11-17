<?php

namespace App\Services;

use App\Database\DatabaseManager;
use App\Entities\AuditLog;
use App\Entities\Branch;
use App\Entities\Employee;
use Doctrine\ORM\EntityManager;

class AuditLogService
{
    /** Short label shown on the action badge. */
    private const ACTION_LABELS = [
        'CREATE' => 'Added',
        'UPDATE' => 'Changed',
        'DELETE' => 'Removed',
        'LOGIN' => 'Signed in',
        'LOGOUT' => 'Signed out',
        'STOCK_IN' => 'Stock received',
        'STOCK_OUT' => 'Stock released',
        'SALE' => 'Sale',
        'PRICE_CHANGE' => 'Price changed',
        'STOCK_ADJUSTMENT' => 'Stock adjusted',
        'ONBOARDING' => 'Registration approved',
        'AUTHORIZE' => 'Authorized',
        'RESUME' => 'Resumed',
        'VOID' => 'Cancelled',
        'VERIFY' => 'Verified',
        'REJECT' => 'Rejected',
    ];

    /** Verb used in the sentence: "<Name> <verb> <the thing>." */
    private const ACTION_VERBS = [
        'CREATE' => 'added',
        'UPDATE' => 'updated',
        'DELETE' => 'removed',
        'STOCK_IN' => 'received new stock for',
        'STOCK_OUT' => 'released stock of',
        'SALE' => 'recorded a sale for',
        'PRICE_CHANGE' => 'changed the price of',
        'STOCK_ADJUSTMENT' => 'adjusted the stock for',
        'ONBOARDING' => 'approved the registration of',
        'AUTHORIZE' => 'authorized',
        'RESUME' => 'resumed',
        'VOID' => 'cancelled',
        'VERIFY' => 'verified',
        'REJECT' => 'rejected',
    ];

    /** The part of the system an entry belongs to, in everyday words. */
    private const MODULE_LABELS = [
        'inventory' => 'Inventory',
        'items' => 'Products',
        'item_variants' => 'Product variants',
        'branch_item' => 'Branch prices & stock levels',
        'stock_unit' => 'Stock items',
        'stock_adjustments' => 'Stock adjustments',
        'sales' => 'Sales',
        'customers' => 'Customers',
        'employees' => 'Employees',
        'team_onboarding' => 'Team registration',
        'brands' => 'Brands',
        'categories' => 'Categories',
        'addresses' => 'Addresses',
        'attribute_options' => 'Product attribute options',
        'attribute_units' => 'Units of measure',
        'item_attributes' => 'Product attributes',
        'item_variant_specifications' => 'Product specifications',
        'sales_details' => 'Sale items',
        'service_reports' => 'Service reports',
        'service_report_actions' => 'Service report actions',
        'supervisors' => 'Supervisors',
        'team_onboarding_qr_codes' => 'Registration QR codes',
        'employee_account_verifications' => 'Account verification',
        'roles' => 'Roles',
        'branches' => 'Branches',
        'inventory_clerk' => 'Inventory clerks',
        'sales_settlements' => 'Sale payments',
        'invoice_financing' => 'Invoice financing',
    ];

    /** Singular noun for modules that have no name lookup below. */
    private const MODULE_NOUNS = [
        'inventory' => 'inventory record',
        'addresses' => 'address',
        'sales_details' => 'sale item',
        'supervisors' => 'supervisor',
        'item_variant_specifications' => 'product specification',
        'employee_account_verifications' => 'account verification',
        'inventory_clerk' => 'inventory clerk',
    ];

    /** Which "<something>_id" column identifies a record of each module. */
    private const MODULE_ID_KEYS = [
        'items' => 'item_id',
        'item_variants' => 'variant_id',
        'stock_unit' => 'stock_unit_id',
        'branch_item' => 'branch_item_id',
        'categories' => 'category_id',
        'brands' => 'brand_id',
        'roles' => 'role_id',
        'employees' => 'employee_id',
        'customers' => 'customer_id',
        'sales' => 'sales_invoice_id',
        'team_onboarding' => 'team_onboarding_id',
        'team_onboarding_qr_codes' => 'qrcode_id',
        'service_reports' => 'service_report_id',
        'stock_adjustments' => 'stock_adjustment_id',
        'sales_settlements' => 'settlement_id',
        'invoice_financing' => 'financing_id',
        'service_report_actions' => 'action_id',
        'item_attributes' => 'attribute_id',
        'attribute_units' => 'unit_id',
        'attribute_options' => 'option_id',
        'branches' => 'branch_id',
    ];

    /** Friendly names for the fields we store. Anything else is tidied up automatically. */
    private const FIELD_LABELS = [
        'price' => 'Price',
        'reorder_level' => 'Low-stock alert level',
        'is_serialized' => 'Tracked by serial number',
        'sku' => 'SKU',
        'serial_number' => 'Serial number',
        'adjustment_number' => 'Adjustment number',
        'control_number' => 'Control number',
        'complaint_description' => 'Complaint',
        'report_to' => 'Reported to',
        'asc_name' => 'Service center',
        'image_url' => 'Product photo',
        'variants' => 'Variants',
        'items' => 'Items',
        'variant_id' => 'Product variant',
        'branch_id' => 'Branch',
        'stock_unit_id' => 'Stock item (serial number)',
        'item_id' => 'Product',
        'brand_id' => 'Brand',
        'category_id' => 'Category',
        'employee_id' => 'Employee',
        'customer_id' => 'Customer',
        'role_id' => 'Role',
        'sales_invoice_id' => 'Sales invoice',
        'team_onboarding_id' => 'Team member',
        'qrcode_id' => 'Registration QR code',
        'service_report_id' => 'Service report',
        'stock_adjustment_id' => 'Stock adjustment',
        'settlement_id' => 'Payment',
        'financing_id' => 'Financing',
        'action_id' => 'Service action',
        'attribute_id' => 'Attribute',
        'unit_id' => 'Unit',
        'option_id' => 'Option',
    ];

    /** Fields that only make sense to developers; never shown in plain-language output. */
    private const HIDDEN_KEYS = '/^(action_time|source|ip_address|user_agent)$/i';

    private EntityManager $entityManager;
    private $repository;

    /** @var array<string, ?string> */
    private array $nameCache = [];

    /** @var array<string, array>|null */
    private ?array $lookupDefinitions = null;

    public function __construct(?EntityManager $entityManager = null)
    {
        $this->entityManager = $entityManager ?? DatabaseManager::getEntityManager();
        $this->repository = $this->entityManager->getRepository(AuditLog::class);
    }

    public function record(array $data): AuditLog
    {
        $audit = new AuditLog((string) ($data['action'] ?? ''), (string) ($data['module'] ?? ''));
        $employee = !empty($data['employee_id'])
            ? $this->entityManager->find(Employee::class, (int) $data['employee_id'])
            : null;
        $branch = !empty($data['branch_id'])
            ? $this->entityManager->find(Branch::class, (int) $data['branch_id'])
            : $employee?->getBranch();

        $audit->setEmployee($employee)
            ->setEmployeeName($data['employee_name'] ?? $this->employeeName($employee))
            ->setBranch($branch)
            ->setRecordId(isset($data['record_id']) ? (string) $data['record_id'] : null)
            ->setOldValues($data['old_values'] ?? null)
            ->setNewValues($data['new_values'] ?? null)
            ->setIpAddress($data['ip_address'] ?? null)
            ->setUserAgent($data['user_agent'] ?? null);

        $this->entityManager->persist($audit);
        $this->entityManager->flush();
        return $audit;
    }

    public function getPaginated(int $page, int $perPage, array $filters = []): array
    {
        return $this->repository->findPaginated($page, $perPage, $filters);
    }

    public function countPaginated(array $filters = []): int
    {
        return $this->repository->countPaginated($filters);
    }

    /**
     * Everything a screen needs to show one entry in plain language:
     *  - action_label / module_label / record_label : short labels for table columns
     *  - headline : one sentence, e.g. `Maria Santos updated the product "Galaxy S24".`
     *  - changes  : [{label, from, to}] for edits (from/to are null when empty)
     *  - details  : [{label, value}] for everything else (new records, removals, ...)
     */
    public function present(AuditLog $log): array
    {
        $action = strtoupper($log->getAction());
        $module = $log->getModule();
        [$noun, $name] = $this->recordSubject($log);

        [$changes, $details] = $this->summarize($log);

        return [
            'action_label' => self::ACTION_LABELS[$action] ?? $this->label($action),
            'module_label' => self::MODULE_LABELS[$module] ?? $this->label($module),
            'record_label' => $name !== null ? ucfirst($noun) . ' "' . $name . '"' : null,
            'headline' => $this->headline($log, $noun, $name),
            'changes' => $changes,
            'details' => $details,
        ];
    }

    /** Full sentence(s) in plain language. Pass the result of present() to avoid recomputing it. */
    public function describe(AuditLog $log, ?array $view = null): string
    {
        $view ??= $this->present($log);
        $description = $view['headline'];

        if (in_array(strtoupper($log->getAction()), ['LOGIN', 'LOGOUT'], true)) {
            return $description;
        }

        if ($view['changes'] !== []) {
            $parts = array_map(fn(array $change) => $this->changeSentence($change), $view['changes']);
            return $description . ' What changed: ' . implode('; ', $parts) . '.';
        }

        if ($view['details'] !== []) {
            $parts = array_map(fn(array $row) => $row['label'] . ': ' . $row['value'], $view['details']);
            return $description . ' Details: ' . implode('; ', $parts) . '.';
        }

        return $description;
    }

    /* ---------------------------------------------------------------------
     * Sentence building
     * ------------------------------------------------------------------- */

    private function headline(AuditLog $log, string $noun, ?string $name): string
    {
        $actor = $log->getEmployeeName() ?: 'Someone';
        $action = strtoupper($log->getAction());

        if ($action === 'LOGIN') {
            return "{$actor} signed in.";
        }
        if ($action === 'LOGOUT') {
            return "{$actor} signed out.";
        }

        $verb = self::ACTION_VERBS[$action] ?? strtolower(str_replace('_', ' ', $action));
        return "{$actor} {$verb} " . $this->subjectText($noun, $name, $log->getRecordId()) . '.';
    }

    private function subjectText(string $noun, ?string $name, ?string $recordId): string
    {
        if ($name !== null && $name !== '') {
            return 'the ' . $noun . ' "' . $name . '"';
        }

        $text = $this->article($noun) . ' ' . $noun;
        if ($recordId !== null && $recordId !== '') {
            $text .= ' (reference no. ' . $recordId . ')';
        }
        return $text;
    }

    private function article(string $noun): string
    {
        return preg_match('/^[aeiou]/i', $noun) ? 'an' : 'a';
    }

    private function changeSentence(array $change): string
    {
        if ($change['from'] === null) {
            return "{$change['label']} was set to {$change['to']}";
        }
        if ($change['to'] === null) {
            return "{$change['label']} was cleared (it was {$change['from']})";
        }
        return "{$change['label']} changed from {$change['from']} to {$change['to']}";
    }

    /* ---------------------------------------------------------------------
     * What changed
     * ------------------------------------------------------------------- */

    /** @return array{0: array, 1: array} [changes, details] */
    private function summarize(AuditLog $log): array
    {
        $action = strtoupper($log->getAction());
        $old = $this->visibleValues($log, $log->getOldValues());
        $new = $this->visibleValues($log, $log->getNewValues());

        if (in_array($action, ['UPDATE', 'PRICE_CHANGE'], true)) {
            $changes = [];
            foreach (array_unique(array_merge(array_keys($old), array_keys($new))) as $key) {
                $key = (string) $key;
                $from = $this->display($key, $old[$key] ?? null);
                $to = $this->display($key, $new[$key] ?? null);
                if ($from === $to) {
                    continue;
                }
                $changes[] = ['label' => $this->fieldLabel($key), 'from' => $from, 'to' => $to];
            }
            return [$changes, []];
        }

        // Removals show what the record looked like; everything else shows what was saved.
        $values = $action === 'DELETE' ? $old : $new;
        $details = [];
        foreach ($values as $key => $value) {
            $text = $this->display((string) $key, $value);
            if ($text !== null) {
                $details[] = ['label' => $this->fieldLabel((string) $key), 'value' => $text];
            }
        }
        return [[], $details];
    }

    /** Stored values minus secrets, developer-only fields and ids we cannot turn into a name. */
    private function visibleValues(AuditLog $log, ?array $values): array
    {
        $ownIdKey = self::MODULE_ID_KEYS[$log->getModule()] ?? null;
        $visible = [];

        foreach ($this->safeValues($values) as $key => $value) {
            $key = (string) $key;
            if (preg_match(self::HIDDEN_KEYS, $key)) {
                continue;
            }
            // "Employee: Juan" on the entry that is already about Juan adds nothing.
            if ($ownIdKey === $key && is_scalar($value) && (string) $value === (string) $log->getRecordId()) {
                continue;
            }
            if ($this->isUnresolvedId($key, $value)) {
                continue;
            }
            $visible[$key] = $value;
        }

        return $visible;
    }

    private function isUnresolvedId(string $key, $value): bool
    {
        if (!str_ends_with($key, '_id') || !is_scalar($value) || $value === '' || $value === null) {
            return false;
        }
        if (!is_numeric($value) || (int) $value <= 0) {
            return true;
        }
        return $this->lookupName($key, (int) $value) === null;
    }

    /** Turns a stored value into text a non-technical person can read. Null means "empty". */
    private function display(string $key, $value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }
        if (is_bool($value)) {
            return $value ? 'Yes' : 'No';
        }
        if (is_array($value)) {
            return $this->arrayValue($value);
        }

        $text = (string) $value;

        if (str_ends_with($key, '_id') && is_numeric($text)) {
            return $this->lookupName($key, (int) $text) ?? $text;
        }
        if (preg_match('/^(is|has)_/i', $key) && in_array($text, ['0', '1'], true)) {
            return $text === '1' ? 'Yes' : 'No';
        }
        if ($key === 'image_url') {
            return 'Photo uploaded';
        }
        if (preg_match('/(price|amount|total|cost|balance|fee|payment)$/i', $key) && is_numeric($text)) {
            return '₱' . number_format((float) $text, 2);
        }
        if (preg_match('/(_at|_time|date)$/i', $key) && strtotime($text) !== false) {
            try {
                $date = new \DateTimeImmutable($text);
                return preg_match('/^\d{4}-\d{2}-\d{2}$/', $text)
                    ? $date->format('M j, Y')
                    : $date->format('M j, Y g:i A');
            } catch (\Throwable $e) {
                // fall through and show the text as stored
            }
        }
        if (preg_match('/^(status|reason|role|type)$/i', $key)) {
            return $this->label(strtolower($text));
        }

        return $text;
    }

    private function arrayValue(array $value): ?string
    {
        if ($value === []) {
            return null;
        }
        if (array_is_list($value)) {
            $count = count($value);
            return $count . ($count === 1 ? ' entry' : ' entries');
        }

        $pairs = [];
        foreach ($value as $key => $item) {
            $key = (string) $key;
            if (is_array($item) || preg_match(self::HIDDEN_KEYS, $key) || $this->isUnresolvedId($key, $item)) {
                continue;
            }
            $text = $this->display($key, $item);
            if ($text !== null) {
                $pairs[] = $this->fieldLabel($key) . ': ' . $text;
            }
        }

        return $pairs === [] ? null : implode(', ', $pairs);
    }

    private function fieldLabel(string $key): string
    {
        return self::FIELD_LABELS[$key] ?? trim(preg_replace('/\s+Id$/', '', $this->label($key)));
    }

    private function safeValues(?array $values): array
    {
        if ($values === null) {
            return [];
        }

        foreach (array_keys($values) as $key) {
            if (preg_match('/password|pin|hash|token|secret/i', (string) $key)) {
                unset($values[$key]);
            }
        }

        return $values;
    }

    /* ---------------------------------------------------------------------
     * Which record is this about?
     * ------------------------------------------------------------------- */

    /** @return array{0: string, 1: ?string} [what kind of thing, its name if we can find it] */
    private function recordSubject(AuditLog $log): array
    {
        $module = $log->getModule();
        $definitions = $this->lookupDefinitions();
        $idKey = self::MODULE_ID_KEYS[$module] ?? null;

        $noun = $idKey !== null && isset($definitions[$idKey])
            ? $definitions[$idKey][0]
            : (self::MODULE_NOUNS[$module] ?? strtolower($this->label($module)));

        $recordId = $log->getRecordId();
        if ($idKey !== null && $recordId !== null && is_numeric($recordId)) {
            $name = $this->lookupName($idKey, (int) $recordId);
            if ($name !== null) {
                return [$noun, $name];
            }
        }

        // The record may be gone (e.g. deleted); fall back to a name saved in the entry itself.
        return [$noun, $this->nameFromValues($log)];
    }

    private function nameFromValues(AuditLog $log): ?string
    {
        $sources = [$log->getNewValues() ?? [], $log->getOldValues() ?? []];
        foreach (['name', 'adjustment_number', 'control_number', 'serial_number', 'username', 'code'] as $key) {
            foreach ($sources as $values) {
                if (isset($values[$key]) && is_scalar($values[$key]) && $values[$key] !== '') {
                    return (string) $values[$key];
                }
            }
        }
        return null;
    }

    private function lookupName(string $idKey, int $id): ?string
    {
        $definitions = $this->lookupDefinitions();
        if ($id <= 0 || !isset($definitions[$idKey])) {
            return null;
        }

        $cacheKey = $idKey . ':' . $id;
        if (array_key_exists($cacheKey, $this->nameCache)) {
            return $this->nameCache[$cacheKey];
        }

        [, $sql, $formatter] = $definitions[$idKey];
        $name = null;
        try {
            $row = $this->entityManager->getConnection()->fetchAssociative($sql, ['id' => $id]);
            if (is_array($row)) {
                $name = trim($formatter($row)) ?: null;
            }
        } catch (\Throwable $e) {
            // A failed lookup must never break the activity list; we just show a generic label.
            error_log('Audit lookup failed for ' . $idKey . ': ' . $e->getMessage());
        }

        return $this->nameCache[$cacheKey] = $name;
    }

    /**
     * "<something>_id" column => [noun, SQL that finds its name, formatter].
     * One table serves both the entry's own record and ids that appear inside the saved values.
     *
     * @return array<string, array{0: string, 1: string, 2: callable}>
     */
    private function lookupDefinitions(): array
    {
        if ($this->lookupDefinitions !== null) {
            return $this->lookupDefinitions;
        }

        $join = static fn(array $parts): string => trim(implode(' ', array_filter($parts, static fn($p) => $p !== null && $p !== '')));
        $fullName = static fn(array $row): string => trim(implode(' ', array_filter([
            $row['first_name'] ?? null,
            $row['middle_name'] ?? null,
            $row['last_name'] ?? null,
        ])));

        return $this->lookupDefinitions = [
            'item_id' => [
                'product',
                'SELECT name, model FROM items WHERE item_id = :id',
                static fn(array $r): string => $join([$r['name'] ?? null, $r['model'] ?? null]),
            ],
            'variant_id' => [
                'product variant',
                'SELECT i.name, iv.model, iv.sku
                 FROM item_variants iv
                 JOIN items i ON i.item_id = iv.item_id
                 WHERE iv.variant_id = :id',
                static function (array $r) use ($join): string {
                    $text = $join([$r['name'] ?? null, $r['model'] ?? null]);
                    return !empty($r['sku']) ? $text . ' (SKU ' . $r['sku'] . ')' : $text;
                },
            ],
            'stock_unit_id' => [
                'stock item with serial number',
                'SELECT serial_number FROM stock_unit WHERE stock_unit_id = :id',
                static fn(array $r): string => (string) ($r['serial_number'] ?? ''),
            ],
            'branch_item_id' => [
                'branch product listing',
                'SELECT i.name, iv.model, b.location
                 FROM branch_item bi
                 JOIN item_variants iv ON iv.variant_id = bi.variant_id
                 JOIN items i ON i.item_id = iv.item_id
                 JOIN branches b ON b.branch_id = bi.branch_id
                 WHERE bi.branch_item_id = :id',
                static fn(array $r): string => $join([$r['name'] ?? null, $r['model'] ?? null]) . ' at ' . ($r['location'] ?? ''),
            ],
            'branch_id' => [
                'branch',
                'SELECT location FROM branches WHERE branch_id = :id',
                static fn(array $r): string => (string) ($r['location'] ?? ''),
            ],
            'category_id' => [
                'category',
                'SELECT name FROM categories WHERE category_id = :id',
                static fn(array $r): string => (string) ($r['name'] ?? ''),
            ],
            'brand_id' => [
                'brand',
                'SELECT name FROM brands WHERE brand_id = :id',
                static fn(array $r): string => (string) ($r['name'] ?? ''),
            ],
            'role_id' => [
                'role',
                'SELECT role_key, display_name FROM roles WHERE role_id = :id',
                static fn(array $r): string => (string) (($r['display_name'] ?? '') ?: ($r['role_key'] ?? '')),
            ],
            'employee_id' => [
                'employee',
                'SELECT first_name, middle_name, last_name, username FROM employees WHERE employee_id = :id',
                static fn(array $r): string => $fullName($r) ?: (string) ($r['username'] ?? ''),
            ],
            'customer_id' => [
                'customer',
                'SELECT first_name, middle_name, last_name FROM customers WHERE customer_id = :id',
                static fn(array $r): string => $fullName($r),
            ],
            'sales_invoice_id' => [
                'sales invoice',
                'SELECT sales_invoice_number FROM sales_invoice WHERE sales_invoice_id = :id',
                static fn(array $r): string => (string) ($r['sales_invoice_number'] ?? ''),
            ],
            'team_onboarding_id' => [
                'team member',
                'SELECT first_name, last_name, username FROM team_onboarding WHERE team_onboarding_id = :id',
                static fn(array $r): string => $join([$r['first_name'] ?? null, $r['last_name'] ?? null]) ?: (string) ($r['username'] ?? ''),
            ],
            'qrcode_id' => [
                'registration QR code',
                'SELECT code FROM team_onboarding_qr_codes WHERE qrcode_id = :id',
                static fn(array $r): string => (string) ($r['code'] ?? ''),
            ],
            'service_report_id' => [
                'service report',
                'SELECT control_number FROM service_reports WHERE service_report_id = :id',
                static fn(array $r): string => (string) ($r['control_number'] ?? ''),
            ],
            'stock_adjustment_id' => [
                'stock adjustment',
                'SELECT adjustment_number FROM stock_adjustments WHERE stock_adjustment_id = :id',
                static fn(array $r): string => (string) ($r['adjustment_number'] ?? ''),
            ],
            'settlement_id' => [
                'payment for sales invoice',
                'SELECT si.sales_invoice_number
                 FROM sales_settlements ss
                 JOIN sales_invoice si ON si.sales_invoice_id = ss.sales_invoice_id
                 WHERE ss.settlement_id = :id',
                static fn(array $r): string => (string) ($r['sales_invoice_number'] ?? ''),
            ],
            'financing_id' => [
                'invoice financing',
                'SELECT provider, loan_account_number FROM invoice_financing WHERE financing_id = :id',
                static fn(array $r): string => $join([$r['provider'] ?? null, $r['loan_account_number'] ?? null]),
            ],
            'action_id' => [
                'service report action',
                'SELECT action_taken FROM service_report_actions WHERE action_id = :id',
                static fn(array $r): string => (string) ($r['action_taken'] ?? ''),
            ],
            'attribute_id' => [
                'product attribute',
                'SELECT name FROM item_attributes WHERE attribute_id = :id',
                static fn(array $r): string => (string) ($r['name'] ?? ''),
            ],
            'unit_id' => [
                'unit of measure',
                'SELECT symbol, name FROM attribute_units WHERE unit_id = :id',
                static fn(array $r): string => trim(($r['name'] ?? '') . (!empty($r['symbol']) ? ' (' . $r['symbol'] . ')' : '')),
            ],
            'option_id' => [
                'attribute option',
                'SELECT option_value FROM attribute_options WHERE option_id = :id',
                static fn(array $r): string => (string) ($r['option_value'] ?? ''),
            ],
        ];
    }

    /* ---------------------------------------------------------------------
     * Small helpers
     * ------------------------------------------------------------------- */

    private function label(string $value): string
    {
        $value = preg_replace('/([a-z])([A-Z])/', '$1 $2', $value);
        $value = str_replace(['_', '-'], ' ', $value);
        return ucwords($value);
    }

    private function employeeName(?Employee $employee): ?string
    {
        if ($employee === null) return null;
        return trim(implode(' ', array_filter([
            $employee->getFirstName(), $employee->getMiddleName(), $employee->getLastName(),
        ])));
    }
}