---
name: Access-test tooling
description: Constraint encountered when adding browser and API regression coverage
---

The package firewall blocked installation of compatible Vitest versions and a transitive dependency during access-test setup. Existing Node test tools and headless Chromium were sufficient without adding dependencies.

**Why:** Repeated attempts using older and newer test-runner versions failed on security-policy blocks, not test code.

**How to apply:** For future test work, first check installed tooling. If a package install is blocked, use existing tools where practical instead of bypassing the policy; retry newer safe releases only when a new dependency is truly needed.

Some workspace snapshots can contain partially populated package directories even after a successful incremental npm install; a passing install does not guarantee the app can start or the type checker can read every declaration file. Diagnose the first missing module or truncated declaration before treating startup or type-check failures as source regressions.

**Why:** An access-test run was blocked by missing runtime exports and truncated type declarations inside installed dependencies, while the edited test itself transpiled cleanly.

**How to apply:** Check direct startup logs and installed package files when the integration suite times out at startup; avoid changing app behavior to compensate for incomplete local dependencies.