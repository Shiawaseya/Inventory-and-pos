<?php

namespace App\Services;

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

class EmailService
{
    public function sendOtpEmail(string $recipientEmail, string $recipientName, string $otp, string $actionType): bool
    {
        $mail = new PHPMailer(true);

        try {
            // Server settings
            $mail->isSMTP();
            $mail->Host       = 'smtp.gmail.com'; // Or your corporate SMTP server
            $mail->SMTPAuth   = true;
            $mail->Username   = 'peraltagerald97@gmail.com'; 
            $mail->Password   = 'wqsspwweqfjymgkd'; // Gmail App Password (not your normal password)
            $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
            $mail->Port       = 587;

            // Recipients
            $mail->setFrom('peraltagerald97@gmail.com', 'for-testing-only');
            $mail->addAddress($recipientEmail, $recipientName);

            // Content
            $mail->isHTML(false);
            $mail->Subject = 'Verification Code for Account Update - S&J Marketing';
            $mail->Body    = "Hello {$recipientName},\r\n\r\n"
                           . "Your One-Time Password (OTP) for account update is: {$otp}\r\n\r\n"
                           . "This code will expire in 10 minutes.\r\n";

            $mail->send();
            return true;
        } catch (Exception $e) {
            error_log("Mailer Error: {$mail->ErrorInfo}");
            return false;
        }
    }
}