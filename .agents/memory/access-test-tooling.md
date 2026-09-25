---
name: Access-test tooling
description: Constraint encountered when adding browser and API regression coverage
---

The package firewall blocked installation of compatible Vitest versions and a transitive dependency during access-test setup. Existing Node test tools and headless Chromium were sufficient without adding dependencies.

**Why:** Repeated attempts using older and newer test-runner versions failed on security-policy blocks, not test code.

**How to apply:** For future test work, first check installed tooling. If a package install is blocked, use existing tools where practical instead of bypassing the policy; retry newer safe releases only when a new dependency is truly needed.