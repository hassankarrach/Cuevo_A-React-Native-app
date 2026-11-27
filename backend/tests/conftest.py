import os


os.environ["DATABASE_URL"] = (
    "postgresql+psycopg://cuevo:cuevo_dev_password@localhost:5432/cuevo_dev"
)
os.environ["TEST_DATABASE_URL"] = (
    "postgresql+psycopg://cuevo:cuevo_dev_password@localhost:5432/cuevo_test"
)
os.environ["ENVIRONMENT"] = "test"
os.environ["AUTH_SECRET_KEY"] = "test-only-auth-secret-key-not-for-production"

TEST_AUTH_RATE_LIMITS = {
    "AUTH_RATE_LIMIT_REGISTER_IP_HOUR": "5",
    "AUTH_RATE_LIMIT_LOGIN_EMAIL_15M": "5",
    "AUTH_RATE_LIMIT_LOGIN_IP_15M": "10",
    "AUTH_RATE_LIMIT_VERIFY_EMAIL_15M": "10",
    "AUTH_RATE_LIMIT_VERIFY_IP_15M": "10",
    "AUTH_RATE_LIMIT_RESEND_EMAIL_30S": "1",
    "AUTH_RATE_LIMIT_RESEND_EMAIL_HOUR": "5",
    "AUTH_RATE_LIMIT_REFRESH_TOKEN_15M": "10",
    "AUTH_RATE_LIMIT_REFRESH_IP_15M": "10",
    "AUTH_RATE_LIMIT_RESET_REQUEST_EMAIL_30S": "1",
    "AUTH_RATE_LIMIT_RESET_REQUEST_EMAIL_HOUR": "3",
    "AUTH_RATE_LIMIT_RESET_REQUEST_IP_HOUR": "10",
    "AUTH_RATE_LIMIT_RESET_CONFIRM_EMAIL_HOUR": "5",
    "AUTH_RATE_LIMIT_RESET_CONFIRM_IP_HOUR": "10",
    "AUTH_RATE_LIMIT_PASSWORD_CHANGE_ACCOUNT_15M": "5",
    "AUTH_RATE_LIMIT_PASSWORD_CHANGE_IP_15M": "10",
    "AUTH_RATE_LIMIT_GOOGLE_SIGNIN_IP_15M": "20",
    "AUTH_RATE_LIMIT_GOOGLE_LINK_ACCOUNT_15M": "5",
    "AUTH_RATE_LIMIT_GOOGLE_LINK_IP_15M": "10",
    "AUTH_RATE_LIMIT_GOOGLE_UNLINK_ACCOUNT_15M": "5",
    "AUTH_RATE_LIMIT_GOOGLE_UNLINK_IP_15M": "10",
}
os.environ.update(TEST_AUTH_RATE_LIMITS)

test_database_port = os.environ.get("CUEVO_TEST_DATABASE_PORT", "5432")
if not test_database_port.isdecimal() or not 1 <= int(test_database_port) <= 65535:
    raise RuntimeError("CUEVO_TEST_DATABASE_PORT must be a valid TCP port")
os.environ["TEST_DATABASE_URL"] = (
    "postgresql+psycopg://cuevo:cuevo_dev_password"
    f"@127.0.0.1:{test_database_port}/cuevo_test"
)
