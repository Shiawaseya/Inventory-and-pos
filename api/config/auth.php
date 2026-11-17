<?php
/**
 * Authentication Configuration
 */

return [
    // Default admin credentials (change these in production!)
    'admin' => [
        'username' => 'admin',
        'password' => 'admin123', // In production, use a hashed password
    ],
    
    // JWT/Token settings
    'token' => [
        'secret' => 'your-secret-key-change-this', // Change this in production
        'expiration' => 86400, // Token expiration in seconds (24 hours)
    ],
];
