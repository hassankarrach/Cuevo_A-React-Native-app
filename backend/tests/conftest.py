import os


os.environ["DATABASE_URL"] = (
    "postgresql+psycopg://cuevo:cuevo_dev_password@localhost:5432/cuevo_dev"
)
os.environ["TEST_DATABASE_URL"] = (
    "postgresql+psycopg://cuevo:cuevo_dev_password@localhost:5432/cuevo_test"
)
os.environ["ENVIRONMENT"] = "test"
