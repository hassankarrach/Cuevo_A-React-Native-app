import os


os.environ["DATABASE_URL"] = (
    "postgresql+psycopg://cuevo:cuevo_dev_password@localhost:5432/cuevo_dev"
)
os.environ["TEST_DATABASE_URL"] = (
    "postgresql+psycopg://cuevo:cuevo_dev_password@localhost:5432/cuevo_test"
)
os.environ["ENVIRONMENT"] = "test"
os.environ["AUTH_SECRET_KEY"] = "test-only-auth-secret-key-not-for-production"

test_database_port = os.environ.get("CUEVO_TEST_DATABASE_PORT", "5432")
if not test_database_port.isdecimal() or not 1 <= int(test_database_port) <= 65535:
    raise RuntimeError("CUEVO_TEST_DATABASE_PORT must be a valid TCP port")
os.environ["TEST_DATABASE_URL"] = (
    "postgresql+psycopg://cuevo:cuevo_dev_password"
    f"@127.0.0.1:{test_database_port}/cuevo_test"
)
