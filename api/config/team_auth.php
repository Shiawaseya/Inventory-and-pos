<?php

/**
 * Staff Authentication Configuration
 */

return [
    'token' => [
        'expiration' => 86400, // 24 hours (in seconds)
    ],
    
    'employees' => [
        [
            'employeeId' => 'EMP001',
            'name' => 'John Doe',
            'department' => 'Sales',
            'pin' => '1234'
        ],
        [
            'employeeId' => 'EMP002',
            'name' => 'Jane Smith',
            'department' => 'Warehouse',
            'pin' => '5678'
        ],
        [
            'employeeId' => 'EMP003',
            'name' => 'Mike Johnson',
            'department' => 'Logistics',
            'pin' => '9012'
        ],
    ]
];
