# Test Credentials

## Admin Account (use for testing)
- Email: `admin@test.com`
- Password: `test123`
- Role: admin

## Other Approved Accounts (in DB)
- `ca.ankurnagaria@gmail.com` (admin) — primary user account.
  - **NOTE**: This password was changed during forgot-password flow testing on 2026-05-10. Current password: `NewTempPass123` — owner can use Forgot Password to reset to a preferred value.
- `demo@test.com` (admin)
- `cadollygupta@gmail.com` (admin)
- `newuser@test.com` (teacher)

## Email Service
- Resend API Key configured in `/app/backend/.env` (RESEND_API_KEY)
- Sender: `onboarding@resend.dev` (Resend testing-mode sender; only delivers to the email used to sign up at Resend)
- To enable sending to ANY recipient, the Resend sender domain must be verified (DNS records).
