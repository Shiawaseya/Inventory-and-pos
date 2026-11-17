<?php

namespace App\Services;

use App\Database\DatabaseManager;
use App\Entities\AttributeOption;
use App\Entities\AttributeUnit;
use App\Entities\ItemAttribute;
use App\Entities\ItemVariantSpecification;
use App\Repositories\AttributeOptionRepository;
use App\Repositories\AttributeUnitRepository;
use App\Repositories\ItemVariantSpecificationRepository;
use Doctrine\ORM\EntityManager;

class AttributeCatalogService
{
    private EntityManager $entityManager;
    private AttributeUnitRepository $units;
    private AttributeOptionRepository $options;
    private ItemVariantSpecificationRepository $specifications;
    private $attributes;

    public function __construct(?EntityManager $entityManager = null)
    {
        $this->entityManager = $entityManager ?? DatabaseManager::getEntityManager();
        $this->units = $this->entityManager->getRepository(AttributeUnit::class);
        $this->options = $this->entityManager->getRepository(AttributeOption::class);
        $this->specifications = $this->entityManager->getRepository(ItemVariantSpecification::class);
        $this->attributes = $this->entityManager->getRepository(ItemAttribute::class);
    }

    public function listAttributes(): array { return $this->attributes->findAllOrdered(); }

    public function createAttribute(array $data): ItemAttribute
    {
        $name = trim((string) ($data['name'] ?? ''));
        $dataType = (string) ($data['data_type'] ?? 'text');
        if ($name === '' || !in_array($dataType, ItemAttribute::DATA_TYPES, true)) {
            throw new \InvalidArgumentException('name and valid data_type are required');
        }

        return $this->entityManager->wrapInTransaction(function () use ($name, $dataType, $data) {
            $attribute = new ItemAttribute($name, $dataType);
            $this->entityManager->persist($attribute);
            $this->entityManager->flush();

            (new AuditLogService($this->entityManager))->record([
                'action' => 'CREATE',
                'module' => 'item_attributes',
                'employee_id' => $data['employee_id'] ?? null,
                'branch_id' => $data['branch_id'] ?? null,
                'record_id' => $attribute->getId(),
                'old_values' => null,
                'new_values' => [
                    'name' => $attribute->getName(),
                    'data_type' => $attribute->getDataType(),
                ],
                'ip_address' => $data['_audit']['ip_address'] ?? null,
                'user_agent' => $data['_audit']['user_agent'] ?? null,
            ]);

            return $attribute;
        });
    }

    public function listUnits(): array { return $this->units->findAllOrdered(); }
    public function listOptions(?int $attributeId = null): array
    {
        return $attributeId !== null ? $this->options->findByAttribute($attributeId) : $this->options->findBy([], ['value' => 'ASC']);
    }

    public function createUnit(array $data): AttributeUnit
    {
        $symbol = trim((string) ($data['symbol'] ?? ''));
        $name = trim((string) ($data['name'] ?? ''));
        if ($symbol === '' || $name === '') throw new \InvalidArgumentException('symbol and name are required');

        return $this->entityManager->wrapInTransaction(function () use ($symbol, $name, $data) {
            $unit = new AttributeUnit($symbol, $name);
            $this->entityManager->persist($unit);
            $this->entityManager->flush();

            (new AuditLogService($this->entityManager))->record([
                'action' => 'CREATE',
                'module' => 'attribute_units',
                'employee_id' => $data['employee_id'] ?? null,
                'branch_id' => $data['branch_id'] ?? null,
                'record_id' => $unit->getId(),
                'old_values' => null,
                'new_values' => [
                    'symbol' => $unit->getSymbol(),
                    'name' => $unit->getName(),
                ],
                'ip_address' => $data['_audit']['ip_address'] ?? null,
                'user_agent' => $data['_audit']['user_agent'] ?? null,
            ]);

            return $unit;
        });
    }

    public function createOption(array $data): AttributeOption
    {
        $attributeId = (int) ($data['attribute_id'] ?? 0);
        $value = trim((string) ($data['option_value'] ?? $data['value'] ?? ''));
        if ($attributeId <= 0 || $value === '') throw new \InvalidArgumentException('attribute_id and option_value are required');

        return $this->entityManager->wrapInTransaction(function () use ($attributeId, $value, $data) {
            $option = new AttributeOption($attributeId, $value);
            $this->entityManager->persist($option);
            $this->entityManager->flush();

            (new AuditLogService($this->entityManager))->record([
                'action' => 'CREATE',
                'module' => 'attribute_options',
                'employee_id' => $data['employee_id'] ?? null,
                'branch_id' => $data['branch_id'] ?? null,
                'record_id' => $option->getId(),
                'old_values' => null,
                'new_values' => [
                    'attribute_id' => $option->getAttributeId(),
                    'option_value' => $option->getValue(),
                ],
                'ip_address' => $data['_audit']['ip_address'] ?? null,
                'user_agent' => $data['_audit']['user_agent'] ?? null,
            ]);

            return $option;
        });
    }

    public function listSpecifications(int $variantId): array
    {
        return $this->specifications->findByVariant($variantId);
    }

    public function saveSpecification(int $variantId, array $data, ?int $attributeId = null): ItemVariantSpecification
    {
        $attributeId = $attributeId ?? (int) ($data['attribute_id'] ?? 0);
        if ($variantId <= 0 || $attributeId <= 0) throw new \InvalidArgumentException('variant_id and attribute_id are required');

        $attribute = $this->entityManager->find(ItemAttribute::class, $attributeId);
        if (!$attribute) throw new \InvalidArgumentException('Attribute not found');

        $existing = $this->specifications->findOneByVariantAndAttribute($variantId, $attributeId);
        $isNew = ($existing === null);
        $specification = $existing ?? new ItemVariantSpecification($variantId, $attributeId);

        $optionId = isset($data['option_id']) && $data['option_id'] !== '' ? (int) $data['option_id'] : null;
        $numericValue = isset($data['numeric_value']) && $data['numeric_value'] !== '' ? (string) $data['numeric_value'] : null;
        $textValue = isset($data['text_value']) && $data['text_value'] !== '' ? (string) $data['text_value'] : null;
        if ($optionId === null && $numericValue === null && $textValue === null) {
            throw new \InvalidArgumentException('option_id, numeric_value, or text_value is required');
        }
        if ($attribute->getDataType() === 'option' && $optionId === null) {
            throw new \InvalidArgumentException('option_id is required for option attributes');
        }
        if ($attribute->getDataType() === 'numeric' && $numericValue === null) {
            throw new \InvalidArgumentException('numeric_value is required for numeric attributes');
        }
        if ($attribute->getDataType() === 'text' && $textValue === null) {
            throw new \InvalidArgumentException('text_value is required for text attributes');
        }
        if ($optionId !== null) {
            $option = $this->entityManager->find(AttributeOption::class, $optionId);
            if (!$option || $option->getAttributeId() !== $attributeId) throw new \InvalidArgumentException('Option does not belong to attribute');
        }

        $unitId = isset($data['unit_id']) && $data['unit_id'] !== '' ? (int) $data['unit_id'] : null;

        $oldValues = $isNew ? null : [
            'variant_id' => $variantId,
            'attribute_id' => $attributeId,
            'option_id' => $specification->getOptionId(),
            'numeric_value' => $specification->getNumericValue(),
            'text_value' => $specification->getTextValue(),
            'unit_id' => $specification->getUnitId(),
        ];

        return $this->entityManager->wrapInTransaction(function () use (
            $specification,
            $optionId,
            $numericValue,
            $textValue,
            $unitId,
            $variantId,
            $attributeId,
            $isNew,
            $oldValues,
            $data
        ) {
            $specification->setOptionId($optionId)
                ->setNumericValue($numericValue)
                ->setTextValue($textValue)
                ->setUnitId($unitId);

            $this->entityManager->persist($specification);
            $this->entityManager->flush();

            (new AuditLogService($this->entityManager))->record([
                'action' => $isNew ? 'CREATE' : 'UPDATE',
                'module' => 'item_variant_specifications',
                'employee_id' => $data['employee_id'] ?? null,
                'branch_id' => $data['branch_id'] ?? null,
                'record_id' => "{$variantId}_{$attributeId}",
                'old_values' => $oldValues,
                'new_values' => [
                    'variant_id' => $variantId,
                    'attribute_id' => $attributeId,
                    'option_id' => $optionId,
                    'numeric_value' => $numericValue,
                    'text_value' => $textValue,
                    'unit_id' => $unitId,
                ],
                'ip_address' => $data['_audit']['ip_address'] ?? null,
                'user_agent' => $data['_audit']['user_agent'] ?? null,
            ]);

            return $specification;
        });
    }

    public function getAttribute(int $id): ?ItemAttribute { return $this->entityManager->find(ItemAttribute::class, $id); }
    public function getOption(int $id): ?AttributeOption { return $this->entityManager->find(AttributeOption::class, $id); }
    public function getUnit(int $id): ?AttributeUnit { return $this->entityManager->find(AttributeUnit::class, $id); }

    public function deleteSpecification(int $variantId, int $attributeId, array $auditContext = []): bool
    {
        $specification = $this->specifications->findOneByVariantAndAttribute($variantId, $attributeId);
        if (!$specification) return false;

        $oldValues = [
            'variant_id' => $variantId,
            'attribute_id' => $attributeId,
            'option_id' => $specification->getOptionId(),
            'numeric_value' => $specification->getNumericValue(),
            'text_value' => $specification->getTextValue(),
            'unit_id' => $specification->getUnitId(),
        ];

        return $this->entityManager->wrapInTransaction(function () use (
            $specification,
            $variantId,
            $attributeId,
            $oldValues,
            $auditContext
        ) {
            (new AuditLogService($this->entityManager))->record([
                'action' => 'DELETE',
                'module' => 'item_variant_specifications',
                'employee_id' => $auditContext['employee_id'] ?? null,
                'branch_id' => $auditContext['branch_id'] ?? null,
                'record_id' => "{$variantId}_{$attributeId}",
                'old_values' => $oldValues,
                'new_values' => null,
                'ip_address' => $auditContext['_audit']['ip_address'] ?? null,
                'user_agent' => $auditContext['_audit']['user_agent'] ?? null,
            ]);

            $this->entityManager->remove($specification);
            $this->entityManager->flush();
            return true;
        });
    }

    // ---- Edit / delete -------------------------------------------------

    private function audit(string $action, string $module, int $recordId, ?array $old, ?array $new, array $context): void
    {
        (new AuditLogService($this->entityManager))->record([
            'action' => $action,
            'module' => $module,
            'employee_id' => $context['employee_id'] ?? null,
            'branch_id' => $context['branch_id'] ?? null,
            'record_id' => $recordId,
            'old_values' => $old,
            'new_values' => $new,
            'ip_address' => $context['_audit']['ip_address'] ?? null,
            'user_agent' => $context['_audit']['user_agent'] ?? null,
        ]);
    }

    private static function same(string $a, string $b): bool
    {
        return mb_strtolower(trim($a)) === mb_strtolower(trim($b));
    }

    public function updateAttribute(int $id, array $data): ItemAttribute
    {
        $name = trim((string) ($data['name'] ?? ''));
        if ($id <= 0 || $name === '') throw new \InvalidArgumentException('name is required');

        $attribute = $this->getAttribute($id);
        if (!$attribute) throw new \DomainException('Attribute not found');

        foreach ($this->listAttributes() as $other) {
            if ((int) $other->getId() !== $id && self::same($other->getName(), $name)) {
                throw new \InvalidArgumentException('An attribute with this name already exists');
            }
        }

        $old = ['name' => $attribute->getName(), 'data_type' => $attribute->getDataType()];

        return $this->entityManager->wrapInTransaction(function () use ($attribute, $name, $old, $id, $data) {
            $attribute->setName($name);
            $this->entityManager->flush();
            $this->audit('UPDATE', 'item_attributes', $id, $old, ['name' => $name, 'data_type' => $attribute->getDataType()], $data);
            return $attribute;
        });
    }

    public function deleteAttribute(int $id, array $context = []): void
    {
        $attribute = $this->getAttribute($id);
        if (!$attribute) throw new \DomainException('Attribute not found');

        $old = ['name' => $attribute->getName(), 'data_type' => $attribute->getDataType()];

        $this->entityManager->wrapInTransaction(function () use ($attribute, $old, $id, $context) {
            $this->entityManager->remove($attribute);
            $this->entityManager->flush(); // fails with an FK violation if still in use
            $this->audit('DELETE', 'item_attributes', $id, $old, null, $context);
        });
    }

    public function updateUnit(int $id, array $data): AttributeUnit
    {
        $symbol = trim((string) ($data['symbol'] ?? ''));
        $name = trim((string) ($data['name'] ?? ''));
        if ($id <= 0 || $symbol === '' || $name === '') throw new \InvalidArgumentException('symbol and name are required');

        $unit = $this->getUnit($id);
        if (!$unit) throw new \DomainException('Unit not found');

        foreach ($this->listUnits() as $other) {
            if ((int) $other->getId() !== $id && self::same($other->getSymbol(), $symbol)) {
                throw new \InvalidArgumentException('A unit with this symbol already exists');
            }
        }

        $old = ['symbol' => $unit->getSymbol(), 'name' => $unit->getName()];

        return $this->entityManager->wrapInTransaction(function () use ($unit, $symbol, $name, $old, $id, $data) {
            $unit->setSymbol($symbol);
            $unit->setName($name);
            $this->entityManager->flush();
            $this->audit('UPDATE', 'attribute_units', $id, $old, ['symbol' => $symbol, 'name' => $name], $data);
            return $unit;
        });
    }

    public function deleteUnit(int $id, array $context = []): void
    {
        $unit = $this->getUnit($id);
        if (!$unit) throw new \DomainException('Unit not found');

        $old = ['symbol' => $unit->getSymbol(), 'name' => $unit->getName()];

        $this->entityManager->wrapInTransaction(function () use ($unit, $old, $id, $context) {
            $this->entityManager->remove($unit);
            $this->entityManager->flush();
            $this->audit('DELETE', 'attribute_units', $id, $old, null, $context);
        });
    }

    public function updateOption(int $id, array $data): AttributeOption
    {
        $value = trim((string) ($data['option_value'] ?? $data['value'] ?? ''));
        if ($id <= 0 || $value === '') throw new \InvalidArgumentException('option_value is required');

        $option = $this->getOption($id);
        if (!$option) throw new \DomainException('Option not found');

        foreach ($this->options->findByAttribute((int) $option->getAttributeId()) as $other) {
            if ((int) $other->getId() !== $id && self::same($other->getValue(), $value)) {
                throw new \InvalidArgumentException('This option already exists for the attribute');
            }
        }

        $old = ['attribute_id' => $option->getAttributeId(), 'option_value' => $option->getValue()];

        return $this->entityManager->wrapInTransaction(function () use ($option, $value, $old, $id, $data) {
            $option->setValue($value);
            $this->entityManager->flush();
            $this->audit('UPDATE', 'attribute_options', $id, $old, ['attribute_id' => $option->getAttributeId(), 'option_value' => $value], $data);
            return $option;
        });
    }

    public function deleteOption(int $id, array $context = []): void
    {
        $option = $this->getOption($id);
        if (!$option) throw new \DomainException('Option not found');

        $old = ['attribute_id' => $option->getAttributeId(), 'option_value' => $option->getValue()];

        $this->entityManager->wrapInTransaction(function () use ($option, $old, $id, $context) {
            $this->entityManager->remove($option);
            $this->entityManager->flush();
            $this->audit('DELETE', 'attribute_options', $id, $old, null, $context);
        });
    }
}