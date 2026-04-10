## 🦌 Deerflow PR Template

**Pull Request** — Deerflow Agent Framework

> All PRs must pass the compliance checklist below before merging.

---

### 📋 Summary

*A clear, concise description of what this PR does and why:*

**Related Issue(s):** Closes #

**Type of Change:**

- [ ] 🐛 Bug fix (non-breaking change that fixes an issue)
- [ ] ✨ New feature (non-breaking change that adds functionality)
- [ ] 📏 Rule update (modification to a Deerflow rule)
- [ ] 🤖 Agent support (new AI agent integration)
- [ ] 📖 Documentation (documentation changes only)
- [ ] 🔧 Refactoring (code changes that neither fix bugs nor add features)
- [ ] ⚡ Performance improvement
- [ ] 🧪 Test addition/modification
- [ ] ⬆️ Dependency update
- [ ] 💥 Breaking change (fix or feature that would cause existing functionality to change)

---

### 🔄 Changes Made

*Describe the specific changes made in this PR:*

| File | Change Type | Description |
|---|---|---|
| | [Added/Modified/Deleted] | |

---

### 🦌 Deerflow Compliance Checklist

> **All items must be checked for a PR to be merged.** This is non-negotiable.

#### Phase 1: 🧠 UNDERSTAND
- [ ] I fully understand the problem I'm solving
- [ ] I have read and understood the relevant Deerflow rules
- [ ] I have identified all files affected by this change

#### Phase 2: 📋 PLAN
- [ ] I have a clear, step-by-step plan for this change
- [ ] I have defined success criteria
- [ ] I have a test strategy

#### Phase 3: 🔍 VERIFY
- [ ] All existing tests pass (`npm test`)
- [ ] The project builds successfully (`npm run build`)
- [ ] There are no merge conflicts
- [ ] No unintended files are included in this PR

#### Phase 4: 💻 IMPLEMENT
- [ ] Code follows [`02-coding-standards.md`](../deerflow/rules/02-coding-standards.md)
- [ ] File operations follow [`01-file-safety-operations.md`](../deerflow/rules/01-file-safety-operations.md)
- [ ] Security checklist from [`05-security-checklist.md`](../deerflow/rules/05-security-checklist.md) is satisfied
- [ ] Error handling follows [`10-error-handling.md`](../deerflow/rules/10-error-handling.md)
- [ ] No hardcoded secrets, API keys, or credentials
- [ ] No `console.log` / `debugger` statements in production code

#### Phase 5: 🧪 TEST
- [ ] New features have corresponding tests
- [ ] Bug fixes have regression tests
- [ ] All tests pass (including new ones)
- [ ] Test coverage has not decreased
- [ ] Edge cases are covered

#### Phase 6: 👁️ REVIEW
- [ ] I have self-reviewed my code
- [ ] I have reviewed the git diff for unintended changes
- [ ] Documentation is updated (if applicable) per [`08-documentation-standards.md`](../deerflow/rules/08-documentation-standards.md)
- [ ] Commit messages follow conventional commit format
- [ ] Changes are atomic and can be reviewed independently

#### Phase 7: 🚀 DEPLOY
- [ ] Build passes with these changes
- [ ] Deployment checklist from [`workflows/deployment-checklist.md`](../deerflow/workflows/deployment-checklist.md) is satisfied (if applicable)
- [ ] No breaking changes without migration plan (if breaking)

---

### 📊 Quality Metrics

| Metric | Before | After | Status |
|---|---|---|---|
| **Test Coverage** | % | % | [ ] ✅ Maintained/Improved |
| **Test Count** | | | [ ] ✅ All passing |
| **Build Status** | | | [ ] ✅ Passing |
| **Bundle Size** | | | [ ] ✅ No significant increase |
| **Quality Score** | | | [ ] ✅ ≥ 85 |

---

### 🤖 AI Agent Usage

*If AI agents were used in creating this PR, complete this section:*

**Agent(s) Used:**
- [ ] Cursor [ ] Claude Code [ ] Windsurf [ ] Copilot [ ] Cline [ ] Continue [ ] Aider [ ] None

**Deerflow Configuration:**
- [ ] Deerflow rules were active during development
- [ ] All quality gates were followed
- [ ] No rule violations occurred during development

**AI Agent Notes:**
*Describe any noteworthy interactions with the AI agent during development:*

---

### 📸 Screenshots / Demos

*If applicable, add screenshots or demos of the changes:*

---

### 💬 Additional Notes

*Anything else reviewers should know:*

---

### 📝 Reviewer Checklist

*For reviewers — check after reviewing the PR:*

- [ ] Code follows Deerflow coding standards
- [ ] All compliance checklist items are satisfied
- [ ] Tests are adequate and passing
- [ ] Documentation is updated
- [ ] No security concerns
- [ ] No performance regressions
- [ ] Git history is clean

**Reviewer Approval:** [ ] Approved [ ] Changes Requested [ ] Comment

---

<div align="center">

**🦌 Deerflow says: "If it doesn't pass the checklist, it doesn't merge."**

</div>
