# Account recovery and verification UI

## Flows

- Welcome → Login → Forgot password → email confirmation → Enter reset code → Reset password → completion → Login.
- Welcome → Sign up → Verify email → verification confirmation → Profile setup → introduction.
- The existing AuthModal hosts all views; no new full-screen route is needed.

## Local test behavior

This is UI-only. No email is sent, no account is created/verified, and no password is changed on a server. Login and Google sign-in remain unconnected.

- Suggested sample signup inputs: `test@example.com` / `CuevoDemo123`. These are form test values, not an authenticated test account. Any valid email and password of at least eight characters will exercise the local UI.
- Local verification/reset code: **123456**.
- Any other six-digit code shows an incorrect-code error. Fewer than six digits shows an incomplete-code error.
- Code expiration is checked after 15 minutes. Resend resets expiration and clears code errors.
- Resend has a 30-second cooldown; reset form carries over the remaining cooldown from the request.
- Reset requires matching passwords of at least eight characters. Successful reset clears password inputs.
- Changing email returns to the corresponding form. Back/Close remains available through the shared modal.

## Integration remaining

Replace the local code and deadline checks in `authValidation.ts` with server-issued challenges and server validation. Add request/loading/network-error states, actual email delivery and real signup/reset/verification operations. Code expiration and resend limits must be enforced by the backend; local state is only for exercising layouts. Do not use the fixed local code as real authentication.

## Validation

Typecheck and lint passed. Email/password and malformed/wrong/expired/valid code validation cases exercised directly. Signup inline validation inspected in iOS Simulator. Full recovery/verification UI regression and physical-device keyboard checks remain.
