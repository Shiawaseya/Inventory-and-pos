<?php
namespace App\Enums;

enum StockUnitStatus: string
{
    case AVAILABLE = 'available';
    case UNDER_INSPECTION = 'under_inspection';
    case SOLD = 'sold';
    case RESERVED = 'reserved';
    case DAMAGED = 'damaged';
    case RETURNED = 'returned';
    case LOST = 'lost';
    case WRITTEN_OFF = 'written_off';
}