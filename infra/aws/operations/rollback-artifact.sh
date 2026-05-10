#!/usr/bin/env bash
set -euo pipefail

previous_link="/opt/sgp/previous"
current_link="/opt/sgp/current"

if [[ ! -L "${previous_link}" ]]; then
  echo "No previous SGP release symlink exists on this host." >&2
  exit 2
fi

rollback_target="$(readlink "${previous_link}")"
if [[ ! -d "${rollback_target}" ]]; then
  echo "Previous release target does not exist: ${rollback_target}" >&2
  exit 2
fi

ln -sfn "$(readlink "${current_link}")" "${previous_link}.tmp"
ln -sfn "${rollback_target}" "${current_link}"
mv -Tf "${previous_link}.tmp" "${previous_link}"

runuser -u ec2-user -- pm2 startOrReload /opt/sgp/shared/ecosystem.config.cjs --update-env
runuser -u ec2-user -- pm2 save

basename "${rollback_target}" >/opt/sgp/shared/current-release
echo "rolled back to $(basename "${rollback_target}")"
