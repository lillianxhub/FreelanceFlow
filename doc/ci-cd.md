# CI, image publishing, and deployment

GitHub-hosted pull request checks stay separate from production access:

- `backend.yml`: Maven verify, fresh Flyway validation, Finance PostgreSQL fresh/upgrade/concurrency tests, image runtime smoke, and one gate.
- `frontend-ci.yml`: clean install, lint, typecheck, unit tests, production build, and one gate.
- `proxy-integration.yml`: isolated PostgreSQL, Backend, production Next, and Playwright login/refresh/Finance flows through `/api`.

`release.yml` runs only on a push to `main`. It repeats release checks for that exact SHA and publishes Frontend and Backend to GHCR with the same immutable SHA tag. Pull requests cannot publish.

`deploy.yml` accepts a successful publish run on `main`, or a manual full SHA already in GHCR. It uses the GitHub `production` environment and a trusted self-hosted runner. `cancel-in-progress: false` prevents interruption during backup, migration, or service replacement.

Production Frontend uses Next standalone output and `BACKEND_ORIGIN=http://backend:8080`; browsers call `/api`. Backend containers use port 8080. Local direct Spring runs may keep default port 8081.

Next.js is pinned to 16.4.3 after 16.4.0 triggered the security build gate. Keep later patch upgrades reviewable with the lockfile, production build, and browser integration results. Do not deploy canary builds.

Production database and JWT secrets stay in `DEPLOY_PATH/.env` or the host secret store. See [the homelab runbook](../deploy/README.md) for setup, backup, restore, rollback, and troubleshooting.
