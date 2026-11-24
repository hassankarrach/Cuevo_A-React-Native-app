import os


os.environ.setdefault(
    "DATABASE_URL",
    "postgresql+psycopg://cuevo:cuevo_dev_password@localhost:5432/cuevo_test",
)
os.environ.setdefault(
    "TEST_DATABASE_URL",
    "postgresql+psycopg://cuevo:cuevo_dev_password@localhost:5432/cuevo_test",
)
os.environ.setdefault("ENVIRONMENT", "test")
