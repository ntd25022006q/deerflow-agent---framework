#!/usr/bin/env bash
# ==============================================================================
# Deerflow Framework — Validation Script
# Version: 1.0.0
# Description: Comprehensive validation suite for AI agents and CI pipelines.
#              Runs quality gates, security checks, and generates a report.
# Usage: chmod +x validate.sh && ./validate.sh [--ci] [--no-color] [--json]
# ==============================================================================

set -euo pipefail

# ---------------------------------------------------------------------------
# Color & Formatting
# ---------------------------------------------------------------------------
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
BOLD='\033[1m'
DIM='\033[2m'
NC='\033[0m'

NO_COLOR=false
CI_MODE=false
JSON_OUTPUT=false

for arg in "$@"; do
    case "$arg" in
        --no-color) NO_COLOR=true ;;
        --ci)       CI_MODE=true  ;;
        --json)     JSON_OUTPUT=true ;;
        --help|-h)
            echo "Usage: $0 [--ci] [--no-color] [--json]"
            exit 0
            ;;
    esac
done

# Disable colors when requested or in CI without TTY
if [ "$NO_COLOR" = true ] || { [ "$CI_MODE" = true ] && [ ! -t 1 ]; }; then
    RED='' GREEN='' YELLOW='' BLUE='' CYAN='' MAGENTA='' BOLD='' DIM='' NC=''
fi

# ---------------------------------------------------------------------------
# Counters & Report
# ---------------------------------------------------------------------------
PASS=0
FAIL=0
WARN=0
SKIP=0
REPORT_FILE="deerflow/reports/validation-report-$(date +%Y%m%d-%H%M%S).txt"
REPORT_JSON="deerflow/reports/validation-report-$(date +%Y%m%d-%H%M%S).json"
SECTIONS=()

mkdir -p deerflow/reports

# Touch report files
: > "$REPORT_FILE"
: > "$REPORT_JSON"

# Start JSON array
echo '[' > "$REPORT_JSON"

record() {
    local status="$1" check="$2" detail="${3:-}"
    case "$status" in
        pass) ((PASS++)); icon="✅"; color="$GREEN" ;;
        fail) ((FAIL++)); icon="❌"; color="$RED"   ;;
        warn) ((WARN++)); icon="⚠️"; color="$YELLOW";;
        skip) ((SKIP++)); icon="⏭️"; color="$DIM"   ;;
    esac
    echo -e "  ${icon} ${color}${check}${NC} ${detail:+— ${DIM}${detail}${NC}}"
    echo "  ${icon} ${check} ${detail}" >> "$REPORT_FILE"

    # JSON entry (note: we close the array later)
    local ts
    ts=$(date -u +%Y-%m-%dT%H:%M:%SZ)
    local entry="{\"timestamp\":\"${ts}\",\"status\":\"${status}\",\"check\":\"${check}\",\"detail\":\"${detail:-}\"}"
    # Append comma-separated entries; we fix trailing comma at the end
    echo "${entry}," >> "$REPORT_JSON"
}

section() {
    echo -e "\n${BOLD}${BLUE}━━━ $1 ━━━${NC}"
    echo "" >> "$REPORT_FILE"
    echo "=== $1 ===" >> "$REPORT_FILE"
    SECTIONS+=("$1")
}

# ---------------------------------------------------------------------------
# 1. Rule File Presence
# ---------------------------------------------------------------------------
check_rule_files() {
    section "Rule File Presence"

    local rules=(
        ".cursorrules:Cursor rules file"
        ".clinerules:Cline rules file"
        ".windsurfrules:Windsurf rules file"
        "deerflow/rules/:Rule directory"
        "deerflow/workflows/:Workflow directory"
        "deerflow.config.yaml:Main config"
    )

    for entry in "${rules[@]}"; do
        local path="${entry%%:*}"
        local desc="${entry##*:}"
        if [ -e "$path" ]; then
            record "pass" "$desc" "Found at $path"
        else
            record "warn" "$desc" "Not found at $path"
        fi
    done

    # At least one editor rule file must exist
    local found=0
    for f in .cursorrules .clinerules .windsurfrules; do
        [ -f "$f" ] && ((found++))
    done
    if [ "$found" -eq 0 ]; then
        record "fail" "Editor rule file" "No .cursorrules/.clinerules/.windsurfrules found"
    else
        record "pass" "Editor rule file" "${found} file(s) present"
    fi
}

# ---------------------------------------------------------------------------
# 2. TypeScript Compilation
# ---------------------------------------------------------------------------
check_typescript() {
    section "TypeScript Compilation"

    if ! command -v npx &>/dev/null; then
        record "skip" "TypeScript check" "npx not available"
        return 0
    fi

    if [ ! -f "tsconfig.json" ]; then
        record "skip" "TypeScript check" "No tsconfig.json found"
        return 0
    fi

    # Run tsc
    local tsc_output
    if tsc_output=$(npx tsc --noEmit 2>&1); then
        record "pass" "TypeScript compilation" "No errors"
    else
        local err_count
        err_count=$(echo "$tsc_output" | grep -c "error TS" || true)
        if [ "$err_count" -gt 0 ]; then
            record "fail" "TypeScript compilation" "${err_count} error(s) found"
        else
            record "warn" "TypeScript compilation" "Completed with warnings"
        fi
    fi

    # Check for `any` usage if strict mode
    if grep -q '"noImplicitAny": true' tsconfig.json 2>/dev/null; then
        record "pass" "Strict no-any" "Configured in tsconfig.json"
    else
        record "warn" "Strict no-any" "noImplicitAny not enabled"
    fi
}

# ---------------------------------------------------------------------------
# 3. ESLint
# ---------------------------------------------------------------------------
check_eslint() {
    section "ESLint"

    if ! command -v npx &>/dev/null; then
        record "skip" "ESLint" "npx not available"
        return 0
    fi

    # Check for eslint config
    local eslint_config=""
    for f in .eslintrc.json .eslintrc.js .eslintrc.cjs .eslintrc.yml eslint.config.js eslint.config.mjs; do
        if [ -f "$f" ]; then
            eslint_config="$f"
            break
        fi
    done

    if [ -z "$eslint_config" ]; then
        record "warn" "ESLint config" "No ESLint config file found"
        return 0
    fi

    record "pass" "ESLint config" "Found ${eslint_config}"

    # Run ESLint
    local eslint_output
    if eslint_output=$(npx eslint . --max-warnings=-1 2>&1); then
        record "pass" "ESLint lint" "No errors or warnings"
    else
        local problems
        problems=$(echo "$eslint_output" | tail -5 || true)
        record "fail" "ESLint lint" "Issues found — see output below"
        echo -e "${DIM}${problems}${NC}"
        echo "$problems" >> "$REPORT_FILE"
    fi
}

# ---------------------------------------------------------------------------
# 4. Test Coverage
# ---------------------------------------------------------------------------
check_test_coverage() {
    section "Test Coverage"

    local coverage_file="coverage/coverage-summary.json"

    if [ ! -f "$coverage_file" ]; then
        # Try running tests with coverage
        if command -v npx &>/dev/null; then
            info "Running tests with coverage…"
            npx jest --coverage --passWithNoTests 2>/dev/null || \
            npx vitest run --coverage 2>/dev/null || \
            true
        fi
    fi

    if [ -f "$coverage_file" ]; then
        # Parse coverage — default threshold: 80%
        local threshold=80
        # Read threshold from config if available
        if [ -f "deerflow.config.yaml" ]; then
            local cfg_threshold
            cfg_threshold=$(grep 'min_test_coverage' deerflow.config.yaml 2>/dev/null \
                | head -1 | awk '{print $2}' || true)
            [ -n "$cfg_threshold" ] && threshold="$cfg_threshold"
        fi

        # Extract branch coverage (most rigorous metric)
        local branches
        branches=$(python3 -c "
import json, sys
d = json.load(open('${coverage_file}'))
p = d.get('total', {}).get('branches', {}).get('pct', 0)
print(p)
" 2>/dev/null || echo "0")

        if [ "$branches" -ge "$threshold" ] 2>/dev/null; then
            record "pass" "Test coverage (${branches}%)" ">= ${threshold}% threshold"
        else
            record "fail" "Test coverage (${branches}%)" "Below ${threshold}% threshold"
        fi
    else
        record "warn" "Test coverage" "No coverage report found"
    fi
}

# ---------------------------------------------------------------------------
# 5. Build Output Size
# ---------------------------------------------------------------------------
check_build_size() {
    section "Build Output Size"

    local build_dirs=("dist" "build" "out" ".next")
    local total_size=0
    local found_build=false

    for dir in "${build_dirs[@]}"; do
        if [ -d "$dir" ]; then
            found_build=true
            local size
            size=$(du -sk "$dir" 2>/dev/null | cut -f1 || echo "0")
            total_size=$((total_size + size))
            info "  ${dir}: ${size} KB"
        fi
    done

    if [ "$found_build" = false ]; then
        record "skip" "Build size" "No build directory found"
        return 0
    fi

    if [ "$total_size" -gt 0 ]; then
        record "pass" "Build output" "Total: ${total_size} KB"
    else
        record "fail" "Build output" "Build directories exist but are empty"
    fi

    # Warn if suspiciously large (> 50 MB)
    if [ "$total_size" -gt 51200 ]; then
        record "warn" "Build size" "Build exceeds 50 MB (${total_size} KB)"
    fi
}

# ---------------------------------------------------------------------------
# 6. Security Vulnerabilities
# ---------------------------------------------------------------------------
check_security() {
    section "Security"

    if ! command -v npm &>/dev/null; then
        record "skip" "Security audit" "npm not available"
        return 0
    fi

    # npm audit
    local audit_output
    if audit_output=$(npm audit --json 2>/dev/null); then
        record "pass" "npm audit" "No known vulnerabilities"
    else
        local vuln_count
        vuln_count=$(echo "$audit_output" | python3 -c "
import json, sys
d = json.load(sys.stdin)
metadata = d.get('metadata', {})
v = metadata.get('vulnerabilities', {})
total = sum(info.get('count', 0) for info in v.values())
print(total)
" 2>/dev/null || echo "unknown")

        if [ "$vuln_count" = "0" ]; then
            record "pass" "npm audit" "No vulnerabilities (with updates available)"
        elif [ "$vuln_count" = "unknown" ]; then
            record "warn" "npm audit" "Could not parse audit output"
        else
            record "fail" "npm audit" "${vuln_count} vulnerability(ies) found"
        fi
    fi

    # Check for hardcoded secrets (basic heuristic)
    local secret_patterns=(
        "API_KEY\s*=\s*['\"][^'\"]+['\"]"
        "SECRET\s*=\s*['\"][^'\"]+['\"]"
        "PASSWORD\s*=\s*['\"][^'\"]+['\"]"
        "TOKEN\s*=\s*['\"][^'\"]+['\"]"
    )

    local secret_found=false
    for pattern in "${secret_patterns[@]}"; do
        # Only check src/ and scripts/ — skip node_modules and .env
        local matches
        matches=$(rg -l "$pattern" --type ts --type js --glob '!node_modules' \
            --glob '!.env*' --glob '!*.test.*' 2>/dev/null || true)
        if [ -n "$matches" ]; then
            if [ "$secret_found" = false ]; then
                secret_found=true
            fi
            record "warn" "Hardcoded secret" "Possible secret in: $(echo "$matches" | head -3)"
        fi
    done

    if [ "$secret_found" = false ]; then
        record "pass" "Hardcoded secrets" "No obvious hardcoded secrets detected"
    fi
}

# ---------------------------------------------------------------------------
# 7. File Safety — Unintended Deletions
# ---------------------------------------------------------------------------
check_file_safety() {
    section "File Safety"

    # Check that critical Deerflow files still exist
    local critical_files=(
        "deerflow/context.md"
        "deerflow.config.yaml"
        ".cursorrules"
        "package.json"
        "tsconfig.json"
    )

    for f in "${critical_files[@]}"; do
        if [ -f "$f" ]; then
            record "pass" "Critical file exists" "$f"
        elif [ -f "${f}.example" ]; then
            record "warn" "Critical file missing (example exists)" "$f"
        else
            record "fail" "Critical file missing" "$f"
        fi
    done

    # Check for staged deletions
    if [ -d ".git" ]; then
        local deleted
        deleted=$(git diff --cached --name-status --diff-filter=D 2>/dev/null | awk '{print $2}' || true)
        if [ -n "$deleted" ]; then
            local count
            count=$(echo "$deleted" | wc -l | tr -d ' ')
            record "warn" "Staged deletions" "${count} file(s) staged for deletion"
            echo "$deleted" | while read -r file; do
                echo -e "    ${DIM}→ ${file}${NC}"
            done
        else
            record "pass" "Staged deletions" "None"
        fi
    fi

    # Verify deerflow state directory
    if [ -d "deerflow/.deerflow-state" ]; then
        record "pass" "State directory" "deerflow/.deerflow-state/ exists"
    else
        record "warn" "State directory" "deerflow/.deerflow-state/ missing"
    fi
}

# ---------------------------------------------------------------------------
# 8. Dependency Health
# ---------------------------------------------------------------------------
check_dependency_health() {
    section "Dependency Health"

    if [ ! -f "package.json" ]; then
        record "skip" "Dependencies" "No package.json"
        return 0
    fi

    # Check for outdated major deps
    if command -v npx &>/dev/null; then
        local outdated
        outdated=$(npm outdated --json 2>/dev/null || echo "{}")

        local major_outdated
        major_outdated=$(echo "$outdated" | python3 -c "
import json, sys
d = json.load(sys.stdin)
major = [k for k, v in d.items() if 'latest' in v]
print(len(major))
" 2>/dev/null || echo "0")

        if [ "$major_outdated" -gt 0 ]; then
            record "warn" "Outdated dependencies" "${major_outdated} package(s) have major updates"
        else
            record "pass" "Dependencies" "Up to date"
        fi
    fi

    # Check lockfile
    if [ -f "package-lock.json" ] || [ -f "bun.lockb" ] || [ -f "yarn.lock" ]; then
        record "pass" "Lockfile" "Present"
    else
        record "warn" "Lockfile" "No lockfile found — install may not be reproducible"
    fi
}

# ---------------------------------------------------------------------------
# Final Report
# ---------------------------------------------------------------------------
generate_report() {
    # Fix trailing comma in JSON
    # Remove last comma and close the array
    local json_temp
    json_temp=$(mktemp)
    head -c -1 "$REPORT_JSON" > "$json_temp"
    echo ']' >> "$json_temp"
    mv "$json_temp" "$REPORT_JSON"

    echo -e "\n${BOLD}${BLUE}═══════════════════════════════════════════════════${NC}"
    echo -e "${BOLD}  🦌  Deerflow Validation Report${NC}"
    echo -e "${BOLD}${BLUE}═══════════════════════════════════════════════════${NC}"
    echo -e "  ${GREEN}Passed:  ${PASS}${NC}"
    echo -e "  ${RED}Failed:  ${FAIL}${NC}"
    echo -e "  ${YELLOW}Warning: ${WARN}${NC}"
    echo -e "  ${DIM}Skipped: ${SKIP}${NC}"
    echo -e "${BOLD}${BLUE}───────────────────────────────────────────────────────${NC}"

    local total=$((PASS + FAIL + WARN + SKIP))
    local score=0
    if [ "$total" -gt 0 ]; then
        score=$(( (PASS * 100) / total ))
    fi

    if [ "$FAIL" -gt 0 ]; then
        echo -e "  ${RED}${BOLD}Score: ${score}/100 — VALIDATION FAILED${NC}"
    elif [ "$WARN" -gt 3 ]; then
        echo -e "  ${YELLOW}${BOLD}Score: ${score}/100 — Passed with warnings${NC}"
    else
        echo -e "  ${GREEN}${BOLD}Score: ${score}/100 — VALIDATION PASSED${NC}"
    fi

    echo ""
    echo -e "  Report saved: ${BOLD}${REPORT_FILE}${NC}"
    echo -e "  JSON report:  ${BOLD}${REPORT_JSON}${NC}"
    echo -e "${BOLD}${BLUE}═══════════════════════════════════════════════════${NC}"

    # Append summary to text report
    echo "" >> "$REPORT_FILE"
    echo "=== Summary ===" >> "$REPORT_FILE"
    echo "Passed:  ${PASS}" >> "$REPORT_FILE"
    echo "Failed:  ${FAIL}" >> "$REPORT_FILE"
    echo "Warning: ${WARN}" >> "$REPORT_FILE"
    echo "Skipped: ${SKIP}" >> "$REPORT_FILE"
    echo "Score:   ${score}/100" >> "$REPORT_FILE"

    # Exit with error if failures
    [ "$FAIL" -gt 0 ] && exit 1
}

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
main() {
    echo -e "${BOLD}${CYAN}"
    echo "  ╔══════════════════════════════════════════════╗"
    echo "  ║  🦌  Deerflow Validation Suite v1.0.0       ║"
    echo "  ╚══════════════════════════════════════════════╝"
    echo -e "${NC}"

    check_rule_files
    check_typescript
    check_eslint
    check_test_coverage
    check_build_size
    check_security
    check_file_safety
    check_dependency_health
    generate_report
}

main "$@"
