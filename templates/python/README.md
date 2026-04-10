# Python Project Template with Deerflow

This template provides a production-ready Python project structure pre-configured
with the Deerflow Agent Framework for automated quality assurance, code review,
and deployment governance.

---

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Creating a New Project](#creating-a-new-project)
4. [Required Dependencies](#required-dependencies)
5. [Folder Structure](#folder-structure)
6. [Configuration Files](#configuration-files)
7. [Deerflow Integration](#deerflow-integration)
8. [Quality Gates](#quality-gates)
9. [Development Workflow](#development-workflow)
10. [Troubleshooting](#troubleshooting)

---

## Overview

This template bootstraps a Python project with modern tooling, integrated with
Deerflow's agent-based quality gates. It supports multiple Python project types:

- **Web API** — FastAPI / Flask backend services
- **CLI Application** — Click-based command-line tools
- **Library/Package** — Distributable Python packages
- **Data Pipeline** — ETL and data processing projects
- **ML/AI Service** — Machine learning microservices

It enforces:

- **Type checking** with mypy strict mode
- **Linting** with Ruff (replaces flake8, isort, black)
- **Testing** with pytest and coverage reporting
- **Formatting** via Ruff formatter
- **Dependency management** with uv or poetry
- **Automated quality gates** via Deerflow agents

---

## Prerequisites

| Tool         | Minimum Version | Purpose                        |
|--------------|-----------------|--------------------------------|
| Python       | 3.11+           | Runtime                        |
| uv           | 0.2+            | Package manager (recommended)  |
| Deerflow CLI | 1.0.0+          | Agent framework CLI            |
| Git          | 2.40+           | Version control                |
| Docker       | 24.x            | Containerization (optional)    |
| Make         | 4.x             | Task runner (optional)         |

Install the Deerflow CLI globally:

```bash
pip install deerflow-cli
# or
uv tool install deerflow-cli
```

---

## Creating a New Project

### Option A: Use the Deerflow Scaffolder (Recommended)

```bash
deerflow init python my-app
cd my-app
```

During scaffolding, you will be prompted to select a project type:
- `web-api` — FastAPI web service
- `cli` — Click CLI application
- `library` — Distributable package
- `data-pipeline` — Data processing project
- `ml-service` — Machine learning service

### Option B: Manual Setup

```bash
# 1. Create project directory
mkdir my-app && cd my-app

# 2. Initialize with uv
uv init --python ">=3.11"
uv add --dev ruff mypy pytest pytest-cov pytest-asyncio httpx

# 3. Copy the Deerflow config template
cp path/to/deerflow-agent-framework/templates/python/deerflow.config.yaml ./deerflow.config.yaml

# 4. Set up project structure
mkdir -p src/my_app/{api,models,services,utils,tests/{unit,integration,e2e}}
```

---

## Required Dependencies

### Core Dependencies (Example for Web API)

```toml
# pyproject.toml
[project]
name = "my-app"
version = "0.1.0"
requires-python = ">=3.11"
dependencies = [
    "fastapi>=0.115.0",
    "uvicorn[standard]>=0.30.0",
    "pydantic>=2.9.0",
    "pydantic-settings>=2.5.0",
    "sqlalchemy>=2.0.0",
    "alembic>=1.13.0",
    "httpx>=0.27.0",
    "structlog>=24.4.0",
]
```

### Development Dependencies

```toml
[dependency-groups]
dev = [
    "deerflow-core>=1.0.0",
    "ruff>=0.6.0",
    "mypy>=1.11.0",
    "pytest>=8.3.0",
    "pytest-cov>=5.0.0",
    "pytest-asyncio>=0.24.0",
    "pytest-xdist>=3.6.0",
    "httpx>=0.27.0",
    "factory-boy>=3.3.0",
    "pre-commit>=3.8.0",
    "anyio>=4.4.0",
]
```

---

## Folder Structure

```
my-app/
├── src/
│   └── my_app/                  # Main package (replace with your project name)
│       ├── __init__.py
│       ├── __main__.py          # Entry point for `python -m my_app`
│       ├── api/                 # API layer (for web-api projects)
│       │   ├── __init__.py
│       │   ├── routes/
│       │   │   ├── __init__.py
│       │   │   ├── health.py
│       │   │   └── users.py
│       │   ├── dependencies.py  # FastAPI dependency injection
│       │   ├── middleware.py    # API middleware
│       │   └── errors.py        # Error handlers
│       ├── models/              # Database models and schemas
│       │   ├── __init__.py
│       │   ├── user.py
│       │   └── base.py          # Base model classes
│       ├── schemas/             # Pydantic schemas (request/response)
│       │   ├── __init__.py
│       │   ├── user.py
│       │   └── common.py        # Shared schemas (Pagination, etc.)
│       ├── services/            # Business logic layer
│       │   ├── __init__.py
│       │   ├── user_service.py
│       │   └── auth_service.py
│       ├── repositories/        # Data access layer
│       │   ├── __init__.py
│       │   ├── base.py
│       │   └── user_repository.py
│       ├── utils/               # Utility functions
│       │   ├── __init__.py
│       │   ├── security.py
│       │   └── validation.py
│       ├── config.py            # Settings (pydantic-settings)
│       ├── exceptions.py        # Custom exception classes
│       └── logging.py           # Structured logging setup
├── tests/
│   ├── conftest.py              # Shared fixtures
│   ├── unit/
│   │   ├── test_services/
│   │   ├── test_utils/
│   │   └── test_models/
│   ├── integration/
│   │   ├── test_api/
│   │   └── test_repositories/
│   └── e2e/
│       └── test_workflows.py
├── alembic/                     # Database migrations (if using SQLAlchemy)
│   ├── versions/
│   └── env.py
├── scripts/                     # Development and utility scripts
│   ├── seed_db.py
│   └── migrate.py
├── docs/                        # Project documentation
├── deerflow.config.yaml
├── pyproject.toml               # Project metadata and tool configuration
├── ruff.toml                    # Ruff linter and formatter configuration
├── mypy.ini                     # mypy type checking configuration
├── .pre-commit-config.yaml      # Pre-commit hooks
├── Dockerfile                   # Container definition
├── docker-compose.yml           # Local development environment
├── Makefile                     # Common task shortcuts
└── README.md
```

---

## Configuration Files

### Copy these files into your project root:

| Source Template                            | Target Destination        |
|--------------------------------------------|---------------------------|
| `templates/python/deerflow.config.yaml`    | `./deerflow.config.yaml`  |
| `templates/python/ruff.toml`               | `./ruff.toml`             |
| `templates/python/mypy.ini`                | `./mypy.ini`              |
| `templates/python/.pre-commit-config.yaml` | `./.pre-commit-config.yaml`|

### Key Python-Specific Settings

The Deerflow configuration for Python enforces:

- **Ruff** for linting and formatting (replaces flake8, isort, black, pyupgrade)
- **mypy strict mode** for full type safety
- **pytest** with coverage enforcement (80% minimum)
- **pydantic** v2 for data validation
- **structured logging** via structlog

---

## Deerflow Integration

### Enabling Deerflow Agents

Place `deerflow.config.yaml` in your project root and run:

```bash
deerflow validate
```

### Pre-commit Hooks

```yaml
# .pre-commit-config.yaml
repos:
  - repo: local
    hooks:
      - id: deerflow-pre-commit
        name: Deerflow Pre-commit Checks
        entry: deerflow pre-commit
        language: system
        types: [python]
        pass_filenames: true
```

### CI/CD Integration

```yaml
# .github/workflows/deerflow.yml
name: Deerflow Quality Gates
on: [push, pull_request]
jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"
      - run: uv sync --frozen
      - run: deerflow ci --all
```

---

## Quality Gates

| Gate              | Description                                      | Blocking |
|-------------------|--------------------------------------------------|----------|
| `type_check`      | mypy strict mode                                 | Yes      |
| `lint`            | Ruff linting with all rules enabled              | Yes      |
| `format`          | Ruff format check                                | Yes      |
| `test`            | pytest with 80% coverage threshold                | Yes      |
| `security`        | Bandit security scan                             | Warning  |
| `imports`         | No circular imports, proper dependency order     | Warning  |
| `docs`            | docstring coverage for public APIs               | Warning  |
| `build`           | Package builds successfully                      | Yes      |

---

## Development Workflow

```bash
# Set up virtual environment
uv sync

# Run Deerflow checks with watch mode
deerflow check --watch

# Run tests
uv run pytest
uv run pytest --cov

# Type check
uv run mypy src/

# Lint and format
uv run ruff check src/
uv run ruff format --check src/

# Run all quality checks
deerflow validate --strict

# Build package
uv build
```

---

## Troubleshooting

**Q: Deerflow reports missing configuration**
Ensure `deerflow.config.yaml` is in the project root with the correct `version` field.

**Q: mypy is slow on large codebases**
Enable `mypy daemon` via `dmypy` or use `mypy --incremental`. Add
`incremental = true` to `mypy.ini`.

**Q: Ruff conflicts with existing flake8 config**
Remove flake8, isort, and black from your dev dependencies. Ruff handles
all of these. Run `ruff check --fix` for automatic migration.

**Q: Tests fail due to import issues**
Ensure `src/` is in your Python path. In `pyproject.toml`, set:
```toml
[tool.pytest.ini_options]
pythonpath = ["src"]
```

---

## License

This template is provided under the MIT License. The Deerflow Agent Framework
has its own license — see [deerflow.dev/license](https://deerflow.dev/license).
