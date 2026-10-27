# Homelab deployment

Runtime flow: `Browser -> HTTPS proxy -> Frontend:5174 -> /api -> Backend:8080 -> PostgreSQL:5432`.

Production uses GHCR images built from one tested `main` commit. The host does not build source. PostgreSQL has no published port; Frontend binds to host loopback by default.

## GitHub setup

Protect `main` with `Backend gate`, `Frontend gate`, and `Login, refresh, and Finance through Next proxy`. Create the `production` environment with required reviewers.

- Repository variable `DEPLOY_PATH`: absolute runner-host directory, such as `/srv/freelanceflow/deploy`.
- Repository variable `BACKUP_PATH`: absolute backup directory on persistent storage.
- Environment variable `APP_ORIGIN`: public HTTPS origin, such as `https://freelance.example.com`.

Publishing uses the scoped `GITHUB_TOKEN`. Deployment runs only on a trusted self-hosted runner labelled `freelanceflow-production`; never use that runner for pull request jobs. Private GHCR packages must grant this repository/runner read access.

## Host setup

1. Install Docker Engine with Compose v2. Create `DEPLOY_PATH`, the PostgreSQL data path, and backup path on persistent storage.
2. Copy [`.env.example`](.env.example) to `DEPLOY_PATH/.env`, fill real values on the host, and run `chmod 600 .env`. Do not commit it.
3. Register the trusted runner. Its account needs Docker access and write access to the deployment and backup paths.
4. Configure the existing reverse proxy to send the app domain to `127.0.0.1:5174`, preserve `Host` and `X-Forwarded-*`, and terminate HTTPS. A containerized proxy may instead require an existing shared Docker network or a bind address reachable from its container.
5. Set DNS and verify the certificate before first login.

Host secrets are `POSTGRES_PASSWORD` and `JWT_SECRET`. Non-secret settings include image names, `APP_ORIGIN`, storage paths, bind address, and port. CI embeds `BACKEND_ORIGIN=http://backend:8080` in the Frontend image.

## First deployment and updates

Merge to `main`. `Publish production images` reruns Backend, Finance PostgreSQL, Frontend, and build checks, then publishes both images with the same full SHA. `Deploy homelab` starts only after that run succeeds. It holds one concurrency slot through backup, pull, Flyway startup, health, and smoke checks.

The job backs up PostgreSQL and runs:

```bash
IMAGE_TAG=<full-commit-sha> docker compose --env-file .env -f compose.prod.yml pull
IMAGE_TAG=<full-commit-sha> docker compose --env-file .env -f compose.prod.yml up -d --wait
IMAGE_TAG=<full-commit-sha> ./smoke.sh
```

Production uses the immutable SHA. Retain at least the prior SHA and its backup.

## Backup, restore, and recovery

Run `./backup.sh` before migrations and on a schedule. Copy backups to the chosen off-host destination; the repository cannot select it until the homelab target is supplied. Test restores in a separate database.

To restore, stop Frontend and Backend, create a new empty PostgreSQL database or volume, and run `pg_restore --clean --if-exists --no-owner`. Start Backend, wait for health, start Frontend, then run `smoke.sh`.

For an app rollback, set `IMAGE_TAG` to the prior SHA and run Compose. Image rollback does not undo Flyway. Use an older Backend only when it supports the migrated schema; otherwise restore the pre-deploy database backup with the prior images.

Troubleshooting:

- Frontend unhealthy: inspect `docker compose logs frontend`; internal port is 3000.
- `/api` fails: inspect Backend health and confirm the Frontend image used `http://backend:8080`.
- Backend startup fails: inspect Flyway errors; never edit an applied migration.
- Refresh fails: confirm HTTPS, secure cookies, proxy host headers, and `/api/auth` cookie path.
- PostgreSQL fails: confirm host-path ownership and the private `app` network.
