---
name: AI Agent Violation Report
about: Report when an AI agent violates Deerflow rules
title: "[VIOLATION] "
labels: violation, investigation
assignees: ""
---

## 🚨 AI Agent Violation Report

**Deerflow Agent Framework** — AI Agent Violation Report

> Use this template to report when an AI coding agent violates Deerflow rules. This helps us improve rule enforcement and prevent future violations.

---

### ⚡ Severity Assessment

| Level | Name | Select if... |
|---|---|---|
| 🟢 **L1** | Warning | Minor rule violation, no lasting impact |
| 🟡 **L2** | Blocking | Medium violation that should have been blocked |
| 🟠 **L3** | Rejection | Major violation, agent should have been stopped |
| 🔴 **L4** | Quarantine | Repeated violations, systemic failure |
| 🟣 **L5** | Escalation | Critical violation, data loss or security breach |

**Reported Severity:** [ ] L1 [ ] L2 [ ] L3 [ ] L4 [ ] L5

---

### 🤖 Agent Information

| Field | Value |
|---|---|
| **AI Agent** | [ ] Cursor [ ] Claude Code [ ] Windsurf [ ] Copilot [ ] Cline [ ] Continue [ ] Aider [ ] Other: ___ |
| **Agent Version** | |
| **Model** | (e.g., GPT-4, Claude 3.5, etc.) |
| **Session Context** | (New session / Continuing / Long-running) |

---

### 📏 Violated Rule(s)

*Which Deerflow rule(s) were violated?*

- [ ] `00-fundamental-principles` — Section:
- [ ] `01-file-safety-operations` — Section:
- [ ] `02-coding-standards` — Section:
- [ ] `03-dependency-management` — Section:
- [ ] `04-testing-protocol` — Section:
- [ ] `05-security-checklist` — Section:
- [ ] `06-build-requirements` — Section:
- [ ] `07-ui-ux-standards` — Section:
- [ ] `08-documentation-standards` — Section:
- [ ] `09-context-management` — Section:
- [ ] `10-error-handling` — Section:
- [ ] Quality gate violation — Phase:
- [ ] MCP integration failure
- [ ] Other: 

---

### 📋 Violation Details

**What was the agent supposed to do?**

*Describe the intended task:*

**What did the agent actually do?**

*Describe the violation in detail:*

**What was the user prompt/instruction?**

*Paste the prompt that led to the violation (if applicable):*

---

### 💥 Impact Assessment

| Category | Impact | Details |
|---|---|---|
| **Files Affected** | Count: | List: |
| **Data Loss** | [ ] Yes [ ] No | |
| **Build Broken** | [ ] Yes [ ] No | |
| **Tests Failed** | [ ] Yes [ ] No | |
| **Security Risk** | [ ] Yes [ ] No | |
| **Production Impact** | [ ] Yes [ ] No | |
| **Time to Fix** | Estimate: | |

---

### 🔄 Steps to Reproduce

1. 
2. 
3. 
4. 

---

### 🛠️ Remediation Actions Taken

*What actions did you take to fix the violation?*

- [ ] Reverted changes using git
- [ ] Restored files from backup
- [ ] Manually fixed the code
- [ ] Restarted the agent session
- [ ] Updated Deerflow configuration
- [ ] Reported to agent vendor
- [ ] Other:

**Description of remediation:**

---

### 🔍 Root Cause Analysis

*Why do you think the violation occurred?*

- [ ] Agent ignored the rules file
- [ ] Rule was unclear or ambiguous
- [ ] Constraint engine didn't catch it
- [ ] Quality gate was bypassed
- [ ] MCP integration failure
- [ ] Git hooks not installed
- [ ] Configuration error
- [ ] Agent limitation / bug
- [ ] Unknown

**Additional context on root cause:**

---

### 📊 Deerflow Configuration at Time of Violation

*Please paste the relevant parts of your `deerflow.config.yaml`:*

```yaml
# Paste relevant config here
```

**Constraint engine mode:** `strict` / `warn` / `permissive`

**Quality gates enabled:** [ ] Yes [ ] No

**Penalty system enabled:** [ ] Yes [ ] No

---

### 📝 Logs & Evidence

*Please paste any relevant logs, screenshots, or evidence:*

```
# Paste logs here
```

*If applicable, include the diff of the violating changes:*

```diff
# Paste diff here
```

---

### 💡 Suggestions for Prevention

*How could Deerflow prevent this type of violation in the future?*

- [ ] Strengthen the specific rule
- [ ] Add a new quality gate check
- [ ] Improve constraint engine detection
- [ ] Add MCP tool for this scenario
- [ ] Update agent-specific rules
- [ ] Add a new penalty level
- [ ] Improve documentation
- [ ] Other:

**Detailed suggestion:**

---

### ✅ Checklist

- [ ] I have searched existing issues for similar violations
- [ ] I have provided the agent and version information
- [ ] I have identified the violated rule(s)
- [ ] I have described the impact and remediation
- [ ] I have included steps to reproduce
- [ ] I have provided logs or evidence
- [ ] I have suggested prevention measures
