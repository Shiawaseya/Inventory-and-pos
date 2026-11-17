<?php

namespace App\Enums;

enum InvoiceFinancingStatus: string
{
    case APPROVED = 'approved';
    case CANCELLED = 'cancelled';
}