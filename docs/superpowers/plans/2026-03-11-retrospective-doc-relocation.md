# Retrospective Document Relocation Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the phase-1 retrospective document out of the `docs` root and place it under a dedicated retrospective subdirectory without leaving stale references behind.

**Architecture:** Keep the change narrow. Introduce a focused `docs/retrospectives` location for retrospective documents, move the existing phase-1 writeup there, then update any in-repo references that still point at the old root-level path.

**Tech Stack:** Markdown documentation, Git

---

## Chunk 1: Relocation

### Task 1: Move the retrospective document into a dedicated subdirectory

**Files:**
- Create: `docs/retrospectives/phase-1-foundation-retrospective.md`
- Delete: `docs/phase-1-foundation-retrospective.md`

- [ ] **Step 1: Create the destination path**

Place the retrospective under `docs/retrospectives/` so root-level `docs` remains reserved for top-level project documents.

- [ ] **Step 2: Remove the old root-level copy**

Ensure the content exists only in the new location.

## Chunk 2: Reference Repair

### Task 2: Update in-repo references

**Files:**
- Modify: `docs/superpowers/plans/2026-03-11-phase1-doc-retrospective.md`
- Modify: Other files only if they reference the old path

- [ ] **Step 1: Search for references to the old path**

Run a repository search for `phase-1-foundation-retrospective`.

- [ ] **Step 2: Update each stale reference**

Point all matches at `docs/retrospectives/phase-1-foundation-retrospective.md`.

## Chunk 3: Verification

### Task 3: Verify the relocation result

**Files:**
- Modify: None

- [ ] **Step 1: Check targeted status**

Run: `git status --short --branch -- docs/phase-1-foundation-retrospective.md docs/retrospectives/phase-1-foundation-retrospective.md docs/superpowers/plans/2026-03-11-phase1-doc-retrospective.md docs/superpowers/plans/2026-03-11-retrospective-doc-relocation.md`
Expected: the old root path is gone, the new subdirectory file is present, and only planned documentation files appear.

- [ ] **Step 2: Re-scan for stale references**

Run: `Get-ChildItem -Recurse docs | Select-String -Pattern 'phase-1-foundation-retrospective'`
Expected: only the new path appears.
