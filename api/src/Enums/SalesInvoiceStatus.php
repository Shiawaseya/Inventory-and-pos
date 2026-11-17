<?php

namespace App\Enums;

enum SalesInvoiceStatus: string
{
    case COMPLETED = 'completed';
    case PARKED = 'parked';
    case PENDING_AUTHORIZATION = 'pending_authorization';
    case REJECTED = 'rejected';
    case VOIDED = 'voided';
    case AUTHORIZED = 'authorized';
}