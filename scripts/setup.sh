#!/usr/bin/env bash
# ==============================================================================
# Deerflow Framework — Universal Setup Script
# Version: 1.0.0
# Description: Automated environment setup for Deerflow Agent Framework.
#              Detects OS, installs prerequisites, configures git, and
#              initializes the deerflow working context.
# Usage: chmod +x setup.sh && ./setup.sh [--skip-deps] [--verbose]
# ==============================================================================

set -euo pipefail

# ---------------------------------------------------------------------------
# Color & Logging Utilities
# ---------------------------------------------------------------------------
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

LOG_FILE="deerflow_setup.log"

log() {
    local level="$1"; shift
    local ts
    ts=$(date '+%Y-%m-%d %H:%M:%S')
    local color=""
    case "$level" in
        INFO)  color="$CYAN"   ;;
        OK)    color="$GREEN"  ;;
        WARN)  color="$YELLOW" ;;
        ERROR) color="$RED"    ;;
        *)     color="$NC"     ;;
    esac
    echo -e "${color}[${ts}] [${level}]${NC} $*" | tee -a "$LOG_FILE"
}

info()    { log "INFO"  "$@"; }
ok()      { log "OK"    "$@"; }
warn()    { log "WARN"  "$@"; }
error()   { log "ERROR" "$@"; }
success() { log "OK"    "✅ $@"; }

separator() {
    echo -e "${BLUE}─────────────────────────────────────────────────────────────${NC}"
}

# ---------------------------------------------------------------------------
# Parse CLI flags
# ---------------------------------------------------------------------------
SKIP_DEPS=false
VERBOSE=false

for arg in "$@"; do
    case "$arg" in
        --skip-deps) SKIP_DEPS=true ;;
        --verbose)   VERBOSE=true   ;;
        --help|-h)
            echo "Usage: $0 [--skip-deps] [--verbose]"
            echo "  --skip-deps   Skip dependency installation"
            echo "  --verbose     Enable verbose output"
            exit 0
            ;;
        *)
            error "Unknown flag: $arg"
            exit 1
            ;;
    esac
done

# ---------------------------------------------------------------------------
# OS Detection
# ---------------------------------------------------------------------------
detect_os() {
    info "Detecting operating system…"
    local os_name="unknown"
    local os_version=""
    local arch=""

    case "$(uname -s)" in
        Linux*)
            os_name="linux"
            if grep -qi microsoft /proc/version 2>/dev/null; then
                os_name="wsl"
            fi
            if [ -f /etc/os-release ]; then
                # shellcheck disable=SC1091
                os_version=$(grep '^PRETTY_NAME=' /etc/os-release | cut -d'"' -f2)
            else
                os_version=$(uname -r)
            fi
            ;;
        Darwin*)
            os_name="macos"
            os_version=$(sw_vers -productVersion 2>/dev/null || uname -r)
            ;;
        MINGW*|MSYS*|CYGWIN*)
            os_name="windows"
            os_version=$(uname -r)
            ;;
        *)
            warn "Unrecognized OS: $(uname -s)"
            ;;
    esac

    arch=$(uname -m)
    ok "OS: ${BOLD}${os_name}${NC} | Version: ${os_version} | Arch: ${arch}"

    # Export for later use
    DF_OS="$os_name"
    DF_OS_VERSION="$os_version"
    DF_ARCH="$arch"
}

# ---------------------------------------------------------------------------
# Dependency Checks
# ---------------------------------------------------------------------------
check_command() {
    local cmd="$1"
    local url="${2:-}"
    if command -v "$cmd" &>/dev/null; then
        local version
        version=$("$cmd" --version 2>/dev/null | head -1 || echo "version unknown")
        ok "Found ${BOLD}${cmd}${NC}: ${version}"
        return 0
    else
        warn "Missing ${BOLD}${cmd}${NC}${url:+ — install: ${url}}"
        return 1
    fi
}

check_prerequisites() {
    separator
    info "Checking prerequisites…"

    local missing=0

    check_command "node"   "https://nodejs.org"                || ((missing++))
    check_command "npm"    "(bundled with Node.js)"            || ((missing++))
    check_command "git"    "https://git-scm.com"               || ((missing++))
    check_command "bun"    "https://bun.sh"                    || ((missing++)) || true  # optional
    check_command "npx"    "(bundled with Node.js)"            || ((missing++))

    if command -v "node" &>/dev/null; then
        local node_ver
        node_ver=$(node -v | sed 's/^v//' | cut -d. -f1)
        if [ "$node_ver" -lt 18 ]; then
            error "Node.js >= 18 required. Detected: $(node -v)"
            ((missing++))
        fi
    fi

    if [ "$missing" -gt 0 ]; then
        error "${missing} prerequisite(s) missing. Please install them and re-run."
        exit 1
    fi

    ok "All prerequisites satisfied."
}

# ---------------------------------------------------------------------------
# Dependency Installation
# ---------------------------------------------------------------------------
install_dependencies() {
    separator
    info "Installing project dependencies…"

    if [ "$SKIP_DEPS" = true ]; then
        warn "Skipping dependency installation (--skip-deps flag)."
        return 0
    fi

    if [ -f "package.json" ]; then
        info "Running npm install…"
        if npm install 2>&1 | tee -a "$LOG_FILE"; then
            success "Dependencies installed via npm."
        else
            error "npm install failed. Check ${LOG_FILE} for details."
            exit 1
        fi
    else
        warn "No package.json found — skipping npm install."
    fi

    # Prefer bun for lockfile if available
    if command -v bun &>/dev/null && [ -f "package.json" ]; then
        info "Generating bun.lockb for faster installs…"
        bun install --no-save 2>&1 | tee -a "$LOG_FILE" || true
        ok "Bun lockfile generated."
    fi
}

# ---------------------------------------------------------------------------
# Git Configuration
# ---------------------------------------------------------------------------
configure_git() {
    separator
    info "Configuring git settings…"

    # Ensure repo is initialised
    if [ ! -d ".git" ]; then
        info "Initializing git repository…"
        git init
        ok "Git repository initialised."
    fi

    # Git config — Deerflow defaults
    git config --local deerflow.enabled true
    git config --local deerflow.version "1.0.0"

    # Commit template (if present)
    if [ -f ".github/commit-template.txt" ]; then
        git config --local commit.template ".github/commit-template.txt"
        ok "Commit template configured."
    fi

    # Default branch protection
    local default_branch
    default_branch=$(git symbolic-ref --short HEAD 2>/dev/null || echo "main")
    if [ "$default_branch" != "main" ] && [ "$default_branch" != "master" ]; then
        warn "Current branch is '${default_branch}'. Consider using 'main'."
    fi

    # LFS check
    if [ -f ".gitattributes" ]; then
        if command -v git-lfs &>/dev/null; then
            git lfs install 2>/dev/null || true
            ok "Git LFS configured."
        else
            warn ".gitattributes found but git-lfs not installed."
        fi
    fi

    ok "Git configured."
}

# ---------------------------------------------------------------------------
# Pre-commit Hooks
# ---------------------------------------------------------------------------
setup_hooks() {
    separator
    info "Setting up pre-commit hooks…"

    local hook_dir=".git/hooks"
    mkdir -p "$hook_dir"

    # Install via the dedicated installer if it exists
    local installer="scripts/install-hooks.sh"
    if [ -f "$installer" ]; then
        chmod +x "$installer"
        bash "$installer"
        ok "Hooks installed via ${installer}."
    else
        # Fallback: simple pre-commit
        cat > "$hook_dir/pre-commit" <<'HOOK'
#!/usr/bin/env bash
echo "[deerflow] Running pre-commit validation…"
npm run lint --if-present 2>/dev/null
npm run typecheck --if-present 2>/dev/null
echo "[deerflow] Pre-commit checks complete."
HOOK
        chmod +x "$hook_dir/pre-commit"
        ok "Basic pre-commit hook created."
    fi
}

# ---------------------------------------------------------------------------
# Deerflow Context & State
# ---------------------------------------------------------------------------
create_deerflow_structure() {
    separator
    info "Creating Deerflow working context…"

    # Ensure directories
    mkdir -p deerflow/context
    mkdir -p deerflow/.deerflow-state
    mkdir -p deerflow/rules
    mkdir -p deerflow/workflows
    mkdir -p deerflow/skills
    mkdir -p deerflow/mcp
    mkdir -p deerflow/reports

    # context.md — initial template
    local ctx="deerflow/context.md"
    if [ ! -f "$ctx" ]; then
        cat > "$ctx" <<'EOF'
# Deerflow Context

## Project
- **Name**: (auto-detected from package.json)
- **Version**: (auto-detected)
- **Language**: TypeScript
- **Framework**: Deerflow Agent Framework v1.0.0

## Current Task
> Describe the current task here. Update after each phase.

## Progress
- [ ] Understand
- [ ] Plan
- [ ] Verify
- [ ] Implement
- [ ] Test
- [ ] Review
- [ ] Deploy

## Notes
- Setup completed at: __TIMESTAMP__
- Agent: (fill in agent name)
EOF
        # Replace placeholder
        local ts
        ts=$(date -u '+%Y-%m-%dT%H:%M:%SZ')
        sed -i "s/__TIMESTAMP__/${ts}/" "$ctx" 2>/dev/null || \
            sed -i '' "s/__TIMESTAMP__/${ts}/" "$ctx" 2>/dev/null || true
        ok "Created ${ctx}"
    else
        info "${ctx} already exists — skipping."
    fi

    # .deerflow-state — placeholder marker
    local state_file="deerflow/.deerflow-state/.active"
    echo "{\"setup_at\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\", \"os\": \"${DF_OS:-unknown}\"}" \
        > "deerflow/.deerflow-state/.active"
    ok "Created deerflow/.deerflow-state/"

    # Ensure the state dir is gitignored but tracked as empty
    touch deerflow/.deerflow-state/.gitkeep
}

# ---------------------------------------------------------------------------
# Environment File
# ---------------------------------------------------------------------------
setup_env_file() {
    separator
    info "Checking environment configuration…"

    if [ ! -f ".env" ] && [ ! -f ".env.example" ]; then
        cat > ".env.example" <<'EOF'
# Deerflow Framework — Environment Variables
# Copy this file to .env and fill in values.

NODE_ENV=development
DEERFLOW_LOG_LEVEL=info
DEERFLOW_CONTEXT_DIR=./deerflow/context
DEERFLOW_REPORTS_DIR=./deerflow/reports

# MCP Server (optional)
MCP_ENABLED=true
MCP_PORT=3001

# Uncomment below for production overrides
# NODE_ENV=production
# DEERFLOW_LOG_LEVEL=warn
EOF
        ok "Created .env.example"
    else
        info ".env or .env.example already exists."
    fi
}

# ---------------------------------------------------------------------------
# Setup Summary
# ---------------------------------------------------------------------------
print_summary() {
    separator
    echo -e "${BOLD}${GREEN}  🦌  Deerflow Framework Setup Complete${NC}"
    separator
    echo ""
    echo -e "  OS:            ${BOLD}${DF_OS:-unknown}${NC}"
    echo -e "  Arch:          ${BOLD}${DF_ARCH:-unknown}${NC}"
    echo -e "  Node.js:       ${BOLD}$(node -v 2>/dev/null || echo 'N/A')${NC}"
    echo -e "  Git:           ${BOLD}$(git --version 2>/dev/null || echo 'N/A')${NC}"
    echo -e "  Context:       ${BOLD}deerflow/context.md${NC}"
    echo -e "  State:         ${BOLD}deerflow/.deerflow-state/${NC}"
    echo -e "  Hooks:         ${BOLD}.git/hooks/${NC}"
    echo -e "  Log:           ${BOLD}${LOG_FILE}${NC}"
    echo ""
    echo -e "  ${CYAN}Next steps:${NC}"
    echo -e "    1. Review and update ${BOLD}deerflow/context.md${NC}"
    echo -e "    2. Copy ${BOLD}.env.example${NC} → ${BOLD}.env${NC} and configure"
    echo -e "    3. Run ${BOLD}npm run dev${NC} to start development"
    echo -e "    4. Run ${BOLD}./scripts/validate.sh${NC} to verify setup"
    echo ""
    separator
}

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
main() {
    echo -e "${BOLD}${CYAN}"
    echo "  ╔══════════════════════════════════════════════╗"
    echo "  ║     🦌  Deerflow Framework Setup v1.0.0     ║"
    echo "  ╚══════════════════════════════════════════════╝"
    echo -e "${NC}"

    # Clear previous log
    : > "$LOG_FILE"

    detect_os
    check_prerequisites
    install_dependencies
    configure_git
    setup_hooks
    create_deerflow_structure
    setup_env_file
    print_summary

    success "All done! Happy coding. 🚀"
}

main "$@"
