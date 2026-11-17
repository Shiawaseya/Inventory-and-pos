<?php

namespace App\Services;

/**
 * Shared validation/normalization for passwords, emails and phone numbers.
 * Used by signup (TeamRegistrationService) and profile updates (EmployeeAccountController / EmployeeOtpService).
 */
class AccountValidator
{
    public const PASSWORD_MIN = 8;
    public const PASSWORD_MAX = 64; // bcrypt silently truncates at 72 bytes

    private const COMMON_PASSWORDS = [
        'password', 'password1', 'password123', 'qwerty123', 'qwertyuiop', '12345678', '123456789',
        'iloveyou', 'admin123', 'welcome1', 'welcome123', 'letmein123', 'abc12345', 'p@ssw0rd', 'p@ssword1',
    ];

    /** Returns an error message, or null when the password is acceptable. */
    public static function passwordError(string $password, array $context = []): ?string
    {
        if (strlen($password) < self::PASSWORD_MIN || strlen($password) > self::PASSWORD_MAX) {
            return 'Password must be between ' . self::PASSWORD_MIN . ' and ' . self::PASSWORD_MAX . ' characters.';
        }
        if (preg_match('/\s/', $password)) {
            return 'Password must not contain spaces.';
        }
        if (!preg_match('/[a-z]/', $password)) {
            return 'Password must contain at least one lowercase letter.';
        }
        if (!preg_match('/[A-Z]/', $password)) {
            return 'Password must contain at least one uppercase letter.';
        }
        if (!preg_match('/\d/', $password)) {
            return 'Password must contain at least one number.';
        }
        if (!preg_match('/[^A-Za-z0-9]/', $password)) {
            return 'Password must contain at least one special character.';
        }
        if (in_array(strtolower($password), self::COMMON_PASSWORDS, true)) {
            return 'Password is too common. Please choose a stronger one.';
        }
        $username = strtolower(trim((string) ($context['username'] ?? '')));
        if (strlen($username) >= 3 && str_contains(strtolower($password), $username)) {
            return 'Password must not contain your username.';
        }
        return null;
    }

    public static function normalizeEmail(string $email): string
    {
        return strtolower(trim($email));
    }

    public static function emailError(?string $email): ?string
    {
        $email = trim((string) $email);
        if ($email === '') {
            return 'Email is required.';
        }
        if (strlen($email) > 255 || filter_var($email, FILTER_VALIDATE_EMAIL) === false) {
            return 'A valid email address is required.';
        }
        return null;
    }

    /** Strips spaces/dashes/parentheses and converts +63 / 63 prefixes to the local 0-prefixed form. */
    public static function normalizePhone(string $phone): string
    {
        $p = preg_replace('/[\s\-().]/', '', trim($phone));
        if (preg_match('/^\+63(\d{10})$/', $p, $m) || preg_match('/^63(\d{10})$/', $p, $m)) {
            return '0' . $m[1];
        }
        return $p;
    }

    public static function phoneError(?string $phone): ?string
    {
        if (trim((string) $phone) === '') {
            return 'Contact number is required.';
        }
        if (!preg_match('/^\+?\d{7,15}$/', self::normalizePhone((string) $phone))) {
            return 'Contact number must be a valid phone number (e.g. 09171234567).';
        }
        return null;
    }

    /** All stored spellings of the same number, for duplicate lookups. */
    public static function phoneVariants(string $phone): array
    {
        $n = self::normalizePhone($phone);
        $variants = [$n];
        if (preg_match('/^0(\d{10})$/', $n, $m)) {
            $variants[] = '+63' . $m[1];
        }
        return array_values(array_unique($variants));
    }
}
