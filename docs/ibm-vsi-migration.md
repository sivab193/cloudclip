# Hosting on IBM instead of GCP

The deployment is provider-independent. Use [deployment.md](deployment.md) for the current runbook and [ARCHITECTURE.md](ARCHITECTURE.md) for the single-process constraint.

To move an existing backend, prepare the new VM with Docker, the same application release, fresh credentials and MongoDB network access. Verify it privately first. Lower the DNS TTL in advance, then move the API DNS record to the new host. Update the existing GitHub deployment-secret values (`GCE_HOST`, `GCE_USER`, `SSH_PRIVATE_KEY`); their names are historical.

Keep the old host and image available until auth, HTTPS and two-device sync succeed after cutover. Roll back by restoring the previous DNS target and container image. Retire old hosts and credentials only after the new deployment is verified.

This document does not establish that a migration has occurred or that either host currently exists.
