from pathlib import Path


BACKEND_DIR = Path(__file__).resolve().parents[1]


def test_env_example_contains_only_placeholder_configuration() -> None:
    content = (BACKEND_DIR / ".env.example").read_text()
    assert "cuevo_dev_password" in content
    assert "DATABASE_URL=" in content
    assert "TEST_DATABASE_URL=" in content

    for line in content.splitlines():
        if "DATABASE_URL=" in line:
            assert "postgresql+" in line
            assert "localhost" in line
