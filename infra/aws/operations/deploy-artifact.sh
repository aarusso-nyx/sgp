#!/usr/bin/env bash
set -euo pipefail

artifact_uri="${1:?artifact S3 URI is required}"
release_id="${2:?release id is required}"
target="${3:?stage or prod target is required}"

if [[ "${target}" != "stage" && "${target}" != "prod" ]]; then
  echo "target must be stage or prod" >&2
  exit 2
fi

release_dir="/opt/sgp/releases/${release_id}"
previous_link="/opt/sgp/previous"
current_link="/opt/sgp/current"
archive_path="/tmp/sgp-${release_id}.tar.gz"

aws s3 cp "${artifact_uri}" "${archive_path}"
install -d -o ec2-user -g ec2-user "${release_dir}"
tar -xzf "${archive_path}" -C "${release_dir}"
chown -R ec2-user:ec2-user "${release_dir}"

if [[ -L "${current_link}" ]]; then
  ln -sfn "$(readlink "${current_link}")" "${previous_link}"
fi
ln -sfn "${release_dir}" "${current_link}"

if [[ -f "${current_link}/infra/aws/operations/pm2/ecosystem.config.cjs" ]]; then
  cp "${current_link}/infra/aws/operations/pm2/ecosystem.config.cjs" \
    /opt/sgp/shared/ecosystem.config.cjs
fi

runuser -u ec2-user -- pm2 startOrReload /opt/sgp/shared/ecosystem.config.cjs --update-env
runuser -u ec2-user -- pm2 save

echo "${release_id}" >/opt/sgp/shared/current-release
echo "deployed ${release_id} from ${artifact_uri} to ${target}"
