# Gmail SMTP Setup for OTP Emails

## Quick Setup Guide

### 1. Enable 2-Step Verification on Gmail
1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Click **2-Step Verification** and turn it ON

### 2. Generate App Password
1. Go to [App Passwords](https://myaccount.google.com/apppasswords)
2. Select **Mail** and your device
3. Click **Generate**
4. Copy the 16-character password (no spaces)

### 3. Update .env File
Open your `.env` file and update:

```env
# Email Configuration (for OTP)
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=your-email@gmail.com
MAIL_PASSWORD=your-16-character-app-password
MAIL_FROM_ADDRESS=your-email@gmail.com
MAIL_FROM_NAME=Inventory Management
```

**Example:**
```env
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=peraltagerald97@gmail.com
MAIL_PASSWORD=abcd efgh ijkl mnop
MAIL_FROM_ADDRESS=peraltagerald97@gmail.com
MAIL_FROM_NAME=Inventory Management
```

### 4. Test OTP Email
Use your React Native app or test with cURL:

```bash
curl -X POST http://192.168.8.33/inventory_management_api/staff/send-otp \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "qr_code_id": "qr_123"}'
```

---

## Alternative: Use Debug Mode (No Email Server)

If you don't want to configure email yet, you can return OTP directly in the API response for testing.

### Enable Debug Mode
In `.env`:
```env
APP_DEBUG=true
```

### Response Will Include OTP
```json
{
  "success": true,
  "message": "OTP sent to email",
  "expires_in": 600,
  "debug": {
    "otp": "123456"
  }
}
```

---

## Troubleshooting

### Error: "Failed to connect to mailserver"
- Check `MAIL_HOST` and `MAIL_PORT` are correct
- Verify internet connection
- Ensure firewall allows port 587

### Error: "Invalid credentials"
- Use **App Password**, not your Gmail password
- Remove spaces from the 16-character app password
- Verify `MAIL_USERNAME` is your full Gmail address

### Error: "Less secure app access"
- Gmail no longer supports "Less secure apps"
- You MUST use App Passwords with 2-Step Verification

### Still not working?
Enable debug mode to see detailed PHPMailer errors:
```env
APP_DEBUG=true
```
Check your PHP error log for detailed SMTP connection errors.

---

## Alternative Email Providers

### Using SendGrid (Recommended for Production)
```env
MAIL_HOST=smtp.sendgrid.net
MAIL_PORT=587
MAIL_USERNAME=apikey
MAIL_PASSWORD=your-sendgrid-api-key
MAIL_FROM_ADDRESS=verified-sender@yourdomain.com
MAIL_FROM_NAME=Inventory Management
```

### Using Mailtrap (For Testing Only)
```env
MAIL_HOST=smtp.mailtrap.io
MAIL_PORT=2525
MAIL_USERNAME=your-mailtrap-username
MAIL_PASSWORD=your-mailtrap-password
MAIL_FROM_ADDRESS=test@example.com
MAIL_FROM_NAME=Inventory Management
```

---

## Security Notes

⚠️ **Important:**
- Never commit `.env` file to Git
- Use App Passwords, not real passwords
- In production, use a dedicated email service (SendGrid, Mailgun, etc.)
- Consider rate limiting OTP requests to prevent abuse
