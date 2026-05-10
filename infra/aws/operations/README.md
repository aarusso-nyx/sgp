# AWS Operations Assets

These files are copied into the release artifact and used by the SGP AWS
artifact deployment flow. They do not create infrastructure.

- `pm2/ecosystem.config.cjs`: PM2 runtime declaration for the six SGP backend
  entrypoints.
- `cloudwatch-agent.json`: CloudWatch Agent log/host metric baseline. Replace
  `{env}` with `stage` or `prod` during host bootstrap.
- `deploy-artifact.sh`: host-side artifact activation script. It switches the
  `/opt/sgp/current` symlink and reloads PM2.
- `rollback-artifact.sh`: host-side rollback script. It switches back to the
  `/opt/sgp/previous` release and reloads PM2.
