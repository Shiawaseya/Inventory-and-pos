<?php

namespace App\Controllers;

use App\Entities\AttributeOption;
use App\Entities\AttributeUnit;
use App\Entities\ItemAttribute;
use App\Entities\ItemVariantSpecification;
use App\Services\AttributeCatalogService;

class AttributeCatalogController
{
    private static function attachAuditContext(array $request, array &$data): void
    {
        $employeeId = (int) ($request['user']['employeeId']
            ?? $request['user']['employee_id']
            ?? $request['employeeId']
            ?? 0
        );

        $branchId = (int) ($request['user']['branchId']
            ?? $request['user']['branch_id']
            ?? $request['branchId']
            ?? 0
        );

        $data['employee_id'] = $employeeId > 0 ?$employeeId : null;
        $data['branch_id'] = $branchId > 0 ?$branchId : null;
        $data['_audit'] = [
            'ip_address' => $_SERVER['REMOTE_ADDR'] ?? null,
            'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? null,
        ];
    }

    public static function attributes(array $request): array
    {
        try {
            $service = new AttributeCatalogService();
            if (($request['method'] ?? 'GET') === 'POST') {
                $body =$request['body'] ?? [];
                self::attachAuditContext($request, $body);$attribute = $service->createAttribute($body);
                return ['status' => 201, 'body' => ['success' => true, 'data' => self::attribute($attribute)]];
            }
            return ['status' => 200, 'body' => ['success' => true, 'data' => array_map([self::class, 'attribute'], $service->listAttributes())]];
        } catch (\InvalidArgumentException $e) { return self::error(400,$e->getMessage()); }
        catch (\Throwable $e) { return self::error(500,$e->getMessage()); }
    }

    public static function units(array $request): array
    {
        try {
            $service = new AttributeCatalogService();
            if (($request['method'] ?? 'GET') === 'POST') {
                $body =$request['body'] ?? [];
                self::attachAuditContext($request,$body);
                return self::unitResponse($service->createUnit($body), 201);
            }
            return ['status' => 200, 'body' => ['success' => true, 'data' => array_map([self::class, 'unit'], $service->listUnits())]];
        } catch (\InvalidArgumentException $e) { return self::error(400,$e->getMessage()); }
        catch (\Throwable $e) { return self::error(500,$e->getMessage()); }
    }

    public static function options(array $request): array
    {
        try {
            $service = new AttributeCatalogService();
            if (($request['method'] ?? 'GET') === 'POST') {
                $body =$request['body'] ?? [];
                self::attachAuditContext($request,$body);
                return ['status' => 201, 'body' => ['success' => true, 'data' => self::option($service->createOption($body))]];
            }
            $attributeId = isset($request['query']['attribute_id']) ? (int)$request['query']['attribute_id'] : null;
            return ['status' => 200, 'body' => ['success' => true, 'data' => array_map([self::class, 'option'], $service->listOptions($attributeId))]];
        } catch (\InvalidArgumentException $e) { return self::error(400,$e->getMessage()); }
        catch (\Throwable $e) { return self::error(500,$e->getMessage()); }
    }

    public static function specifications(array $request): array
    {
        $variantId = (int) (($request['params'] ?? [])[0] ?? 0);
        try {
            $service = new AttributeCatalogService();
            if (($request['method'] ?? 'GET') === 'POST') {
                $body =$request['body'] ?? [];
                self::attachAuditContext($request,$body);
                $specification =$service->saveSpecification($variantId,$body);
                return ['status' => 201, 'body' => ['success' => true, 'data' => self::specification($specification,$service)]];
            }
            if ($variantId <= 0) return self::error(400, 'Valid variant_id is required');
            return ['status' => 200, 'body' => ['success' => true, 'data' => array_map(fn($specification) => self::specification($specification,$service), $service->listSpecifications($variantId))]];
        } catch (\InvalidArgumentException $e) { return self::error(400,$e->getMessage()); }
        catch (\Throwable $e) { return self::error(500,$e->getMessage()); }
    }

    public static function updateSpecification(array $request): array
    {
        try {
            $variantId = (int) (($request['params'] ?? [])[0] ?? 0);
            $attributeId = (int) (($request['params'] ?? [])[1] ?? 0);
            $body =$request['body'] ?? [];
            self::attachAuditContext($request,$body);
            $service = new AttributeCatalogService();$specification = $service->saveSpecification($variantId, $body,$attributeId);
            return ['status' => 200, 'body' => ['success' => true, 'data' => self::specification($specification,$service)]];
        } catch (\InvalidArgumentException $e) { return self::error(400,$e->getMessage()); }
        catch (\Throwable $e) { return self::error(500,$e->getMessage()); }
    }

    public static function deleteSpecification(array $request): array
    {
        try {
            $params = $request['params'] ?? [];$auditContext = [];
            self::attachAuditContext($request, $auditContext);$deleted = (new AttributeCatalogService())->deleteSpecification(
                (int) ($params[0] ?? 0),
                (int) ($params[1] ?? 0),$auditContext
            );
            return $deleted
                ? ['status' => 200, 'body' => ['success' => true, 'message' => 'Specification deleted']]
                : self::error(404, 'Specification not found');
        } catch (\Throwable $e) {
            return self::error(500, $e->getMessage());
        }
    }

    private static function unit(AttributeUnit $unit): array { return ['unit_id' =>$unit->getId(), 'symbol' => $unit->getSymbol(), 'name' =>$unit->getName()]; }
    private static function option(AttributeOption $option): array { return ['option_id' =>$option->getId(), 'attribute_id' => $option->getAttributeId(), 'option_value' =>$option->getValue()]; }
    private static function attribute(ItemAttribute $attribute): array { return ['attribute_id' =>$attribute->getId(), 'name' => $attribute->getName(), 'data_type' =>$attribute->getDataType()]; }
    private static function specification(ItemVariantSpecification $specification, AttributeCatalogService$service): array
    {
        $attribute = $service->getAttribute($specification->getAttributeId());
        $option =$specification->getOptionId() !== null ? $service->getOption($specification->getOptionId()) : null;
        $unit =$specification->getUnitId() !== null ? $service->getUnit($specification->getUnitId()) : null;
        return [
            'variant_id' => $specification->getVariantId(),
            'attribute_id' => $specification->getAttributeId(),
            'attribute_name' => $attribute?->getName(),
            'data_type' => $attribute?->getDataType(),
            'option_id' => $specification->getOptionId(),
            'option_value' => $option?->getValue(),
            'numeric_value' => $specification->getNumericValue(),
            'text_value' => $specification->getTextValue(),
            'unit_id' => $specification->getUnitId(),
            'unit' => $unit ? ['unit_id' => $unit->getId(), 'symbol' => $unit->getSymbol(), 'name' =>$unit->getName()] : null,
        ];
    }
    private static function unitResponse(AttributeUnit $unit, int$status): array { return ['status' => $status, 'body' => ['success' => true, 'data' => self::unit($unit)]]; }
    private static function error(int $status, string$message): array { return ['status' => $status, 'body' => ['success' => false, 'message' =>$message]]; }

    // ---- Edit / delete -------------------------------------------------

    private static function guarded(callable $action): array
    {
        try {
            return $action();
        } catch (\InvalidArgumentException $e) {
            return self::error(400, $e->getMessage());
        } catch (\DomainException $e) {
            return self::error(404, $e->getMessage());
        } catch (\Doctrine\DBAL\Exception\ForeignKeyConstraintViolationException $e) {
            return self::error(409, 'This record is still in use (for example by variants or options) and cannot be deleted.');
        } catch (\Throwable $e) {
            return self::error(500, defined('APP_DEBUG') && APP_DEBUG ? $e->getMessage() : 'Server error');
        }
    }

    private static function routeId(array $request): int
    {
        return (int) (($request['params'] ?? [])[0] ?? 0);
    }

    private static function auditOnly(array $request): array
    {
        $context = [];
        self::attachAuditContext($request, $context);
        return $context;
    }

    private static function bodyWithAudit(array $request): array
    {
        $body = $request['body'] ?? [];
        self::attachAuditContext($request, $body);
        return $body;
    }

    public static function updateAttribute(array $request): array
    {
        return self::guarded(function () use ($request) {
            $attribute = (new AttributeCatalogService())->updateAttribute(self::routeId($request), self::bodyWithAudit($request));
            return ['status' => 200, 'body' => ['success' => true, 'data' => self::attribute($attribute)]];
        });
    }

    public static function deleteAttribute(array $request): array
    {
        return self::guarded(function () use ($request) {
            (new AttributeCatalogService())->deleteAttribute(self::routeId($request), self::auditOnly($request));
            return ['status' => 200, 'body' => ['success' => true, 'message' => 'Attribute deleted']];
        });
    }

    public static function updateUnit(array $request): array
    {
        return self::guarded(function () use ($request) {
            $unit = (new AttributeCatalogService())->updateUnit(self::routeId($request), self::bodyWithAudit($request));
            return self::unitResponse($unit, 200);
        });
    }

    public static function deleteUnit(array $request): array
    {
        return self::guarded(function () use ($request) {
            (new AttributeCatalogService())->deleteUnit(self::routeId($request), self::auditOnly($request));
            return ['status' => 200, 'body' => ['success' => true, 'message' => 'Unit deleted']];
        });
    }

    public static function updateOption(array $request): array
    {
        return self::guarded(function () use ($request) {
            $option = (new AttributeCatalogService())->updateOption(self::routeId($request), self::bodyWithAudit($request));
            return ['status' => 200, 'body' => ['success' => true, 'data' => self::option($option)]];
        });
    }

    public static function deleteOption(array $request): array
    {
        return self::guarded(function () use ($request) {
            (new AttributeCatalogService())->deleteOption(self::routeId($request), self::auditOnly($request));
            return ['status' => 200, 'body' => ['success' => true, 'message' => 'Option deleted']];
        });
    }
}