<?php
namespace App\Enums;

enum StockAdjustmentReason: string
{
    case DAMAGED = 'damaged';
    case EXPIRED = 'expired';
    case LOST_THEFT = 'lost_theft';
    case INVENTORY_AUDIT = 'inventory_audit';
    case INTERNAL_USE = 'internal_use';
    case FOUND_STOCK = 'found_stock';
    case INSPECTION = 'inspection';
    case OTHER = 'other';
}