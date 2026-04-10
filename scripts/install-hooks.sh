#!/usr/bin/env bash
# ==============================================================================
# Deerflow Framework — Git Hook Installer
# Version: 1.0.0
# Description: Installs git hooks (pre-commit, pre-push, commit-msg,
#              prepare-commit-msg) for automated quality enforcement.
# Usage: chmod +x install-hooks.sh && ./install-hooks.sh [--force] [--remove]
# ==============================================================================

set -euo pipefail

# ---------------------------------------------------------------------------
# Colors
# ---------------------------------------------------------------------------
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

FORCE=false
REMOVE=false

for arg in "$@"; do
    case "$arg" in
        --force)  FORCE=true  ;;
        --remove) REMOVE=true ;;
        --help|-h)
            echo "Usage: $0 [--force] [--remove]"
            echo "  --force   Overwrite existing hooks"
            echo "  --remove  Remove Deerflow hooks"
            exit 0
            ;;
    esac
done

HOOK_DIR=".git/hooks"

ensure_hook_dir() {
    if [ ! -d ".git" ]; then
        echo -e "${RED}Error: Not a git repository.${NC}"
        exit 1
    fi
    mkdir -p "$HOOK_DIR"
}

install_hook() {
    local hook_name="$1"
    local hook_content="$2"

    local target="${HOOK_DIR}/${hook_name}"

    # Check if hook already exists
    if [ -f "$target" ] && [ "$FORCE" != true ]; then
        # Check if it's already a deerflow hook
        if head -5 "$target" 2>/dev/null | grep -q "Deerflow"; then
            echo -e "${YELLOW}  ⏭️  ${hook_name} — already managed by Deerflow (use --force to overwrite)${NC}"
            return 0
        fi
        echo -e "${YELLOW}  ⚠️  ${hook_name} — exists but not managed by Deerflow. Use --force to overwrite.${NC}"
        return 0
    fi

    echo "$hook_content" > "$target"
    chmod +x "$target"
    echo -e "${GREEN}  ✅ ${hook_name} — installed${NC}"
}

remove_hook() {
    local hook_name="$1"
    local target="${HOOK_DIR}/${hook_name}"

    if [ ! -f "$target" ]; then
        echo -e "${YELLOW}  ⏭️  ${hook_name} — not found${NC}"
        return 0
    fi

    if head -5 "$target" 2>/dev/null | grep -q "Deerflow"; then
        rm "$target"
        echo -e "${GREEN}  ✅ ${hook_name} — removed${NC}"
    else
        echo -e "${YELLOW}  ⚠️  ${hook_name} — not a Deerflow hook, skipping${NC}"
    fi
}

# ---------------------------------------------------------------------------
# Pre-commit Hook — runs fast validation
# ---------------------------------------------------------------------------
PRE_COMMIT='#!/usr/bin/env bash
# Deerflow Framework — pre-commit hook
# Runs fast quality checks before each commit.

set -euo pipefail

echo -e "\033[0;36m[deerflow] 🦌 Running pre-commit validation…\033[0m"

# 1. TypeScript type check
if [ -f "tsconfig.json" ]; then
    echo -e "\033[0;36m[deerflow]   ▸ TypeScript type-check…\033[0m"
    if ! npx tsc --noEmit 2>&1; then
        echo -e "\033[0;31m[deerflow] ❌ TypeScript errors found. Commit blocked.\033[0m"
        exit 1
    fi
    echo -e "\033[0;32m[deerflow]   ✅ TypeScript OK\033[0m"
fi

# 2. ESLint
if [ -f ".eslintrc.json" ] || [ -f "eslint.config.js" ] || [ -f "eslint.config.mjs" ]; then
    echo -e "\033[0;36m[deerflow]   ▸ ESLint…\033[0m"
    if ! npx eslint . --max-warnings=-1 2>&1; then
        echo -e "\033[0;31m[deerflow] ❌ ESLint errors found. Commit blocked.\033[0m"
        exit 1
    fi
    echo -e "\033[0;32m[deerflow]   ✅ ESLint OK\033[0m"
fi

# 3. File safety — ensure no staged deletions of critical files
CRITICAL_FILES=("deerflow/context.md" "deerflow.config.yaml" ".cursorrules")
for f in "${CRITICAL_FILES[@]}"; do
    if git diff --cached --name-status --diff-filter=D 2>/dev/null | grep -q "$f"; then
        echo -e "\033[0;31m[deerflow] ❌ Critical file staged for deletion: $f\033[0m"
        echo -e "\033[0;31m[deerflow]   Use --no-verify only if intentional.\033[0m"
        exit 1
    fi
done

echo -e "\033[0;32m[deerflow] ✅ Pre-commit checks passed.\033[0m"
'

# ---------------------------------------------------------------------------
# Pre-push Hook — runs full quality gates
# ---------------------------------------------------------------------------
PRE_PUSH='#!/usr/bin/env bash
# Deerflow Framework — pre-push hook
# Runs comprehensive validation before pushing to remote.

set -euo pipefail

echo -e "\033[0;36m[deerflow] 🦌 Running pre-push quality gates…\033[0m"

# Run the full validation suite if available
VALIDATE_SCRIPT="scripts/validate.sh"
if [ -f "$VALIDATE_SCRIPT" ]; then
    if bash "$VALIDATE_SCRIPT"; then
        echo -e "\033[0;32m[deerflow] ✅ All quality gates passed. Safe to push.\033[0m"
    else
        echo -e "\033[0;31m[deerflow] ❌ Quality gates failed. Push blocked.\033[0m"
        echo -e "\033[0;31m[deerflow]   Fix issues or use --no-verify to bypass.\033[0m"
        exit 1
    fi
else
    # Fallback: run basic checks
    echo -e "\033[0;33m[deerflow]   ⚠️  validate.sh not found, running basic checks…\033[0m"
    npm run build --if-present 2>&1 || {
        echo -e "\033[0;31m[deerflow] ❌ Build failed.\033[0m"
        exit 1
    }
    npm run test --if-present 2>&1 || {
        echo -e "\033[0;31m[deerflow] ❌ Tests failed.\033[0m"
        exit 1
    }
    echo -e "\033[0;32m[deerflow] ✅ Basic pre-push checks passed.\033[0m"
fi
'

# ---------------------------------------------------------------------------
# Commit-msg Hook — validates commit message format
# ---------------------------------------------------------------------------
COMMIT_MSG='#!/usr/bin/env bash
# Deerflow Framework — commit-msg hook
# Validates commit message follows Conventional Commits format.

set -euo pipefail

COMMIT_MSG_FILE="$1"
COMMIT_MSG=$(cat "$COMMIT_MSG_FILE")

# Conventional Commits pattern:
#   type(scope)?: description
#   type: description
#
# Types: feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert
PATTERN="^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(\(.+\))?!?:\s.{1,100}"

if ! echo "$COMMIT_MSG" | head -1 | grep -qE "$PATTERN"; then
    echo -e "\033[0;31m[deerflow] ❌ Invalid commit message format.\033[0m"
    echo ""
    echo -e "\033[0;33mExpected format:\033[0m"
    echo "  type(scope): description"
    echo ""
    echo -e "\033[0;33mValid types:\033[0m"
    echo "  feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert"
    echo ""
    echo -e "\033[0;33mExamples:\033[0m"
    echo "  feat(auth): add OAuth2 login flow"
    echo "  fix(api): resolve null pointer in user endpoint"
    echo "  docs: update README with setup instructions"
    echo ""
    echo -e "\033[0;33mYour message:\033[0m"
    echo "  ${COMMIT_MSG}"
    echo ""
    echo -e "Bypass with: \033[0;36mgit commit --no-verify -m \"...\"\033[0m"
    exit 1
fi

# Check for Deerflow phase tag (optional but encouraged)
if echo "$COMMIT_MSG" | head -1 | grep -qE "\[phase:\s?(understand|plan|verify|implement|test|review|deploy)\]"; then
    echo -e "\033[0;32m[deerflow] ✅ Deerflow phase tag detected.\033[0m"
fi

echo -e "\033[0;32m[deerflow] ✅ Commit message valid.\033[0m"
'

# ---------------------------------------------------------------------------
# Prepare-commit-msg Hook — adds Deerflow metadata
# ---------------------------------------------------------------------------
PREPARE_COMMIT_MSG='#!/usr/bin/env bash
# Deerflow Framework — prepare-commit-msg hook
# Prepends Deerflow context metadata to commit messages (merge/squash only).

set -euo pipefail

COMMIT_MSG_FILE="$1"
COMMIT_SOURCE="$2"  # message, merge, squash, commit, template, or empty

# Only augment merge and squash commits
if [ "$COMMIT_SOURCE" != "merge" ] && [ "$COMMIT_SOURCE" != "squash" ]; then
    exit 0
fi

# Read the current context
CTX_FILE="deerflow/context.md"
if [ ! -f "$CTX_FILE" ]; then
    exit 0
fi

# Extract current task line
CURRENT_TASK=$(grep -A1 "## Current Task" "$CTX_FILE" 2>/dev/null | tail -1 | sed "s/^>[ ]*//" || true)

if [ -n "$CURRENT_TASK" ]; then
    # Prepend a Deerflow metadata line
    TEMP_FILE=$(mktemp)
    echo "" >> "$TEMP_FILE"
    echo "🦌 Deerflow Context: ${CURRENT_TASK}" >> "$TEMP_FILE"
    cat "$COMMIT_MSG_FILE" >> "$TEMP_FILE"
    mv "$TEMP_FILE" "$COMMIT_MSG_FILE"
fi
'

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
main() {
    echo -e "${BOLD}${CYAN}"
    echo "  ╔═══════════════════════════════════════════╗"
    echo "  ║  🦌  Deerflow Git Hook Installer v1.0.0  ║"
    echo "  ╚═══════════════════════════════════════════╝"
    echo -e "${NC}"

    ensure_hook_dir

    if [ "$REMOVE" = true ]; then
        echo -e "${BOLD}Removing Deerflow hooks…${NC}"
        remove_hook "pre-commit"
        remove_hook "pre-push"
        remove_hook "commit-msg"
        remove_hook "prepare-commit-msg"
        echo -e "${GREEN}Done. All Deerflow hooks removed.${NC}"
        exit 0
    fi

    echo -e "${BOLD}Installing Deerflow hooks…${NC}"
    install_hook "pre-commit"       "$PRE_COMMIT"
    install_hook "pre-push"         "$PRE_PUSH"
    install_hook "commit-msg"       "$COMMIT_MSG"
    install_hook "prepare-commit-msg" "$PREPARE_COMMIT_MSG"

    echo ""
    echo -e "${GREEN}${BOLD}All hooks installed successfully! 🦌${NC}"
    echo -e "${DIM}Use --force to overwrite existing hooks.${NC}"
    echo -e "${DIM}Use --remove to uninstall Deerflow hooks.${NC}"
}

main "$@"
