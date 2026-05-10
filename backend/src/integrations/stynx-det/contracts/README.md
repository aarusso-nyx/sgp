# stynx-det contracts

This module is the SGP-side shape for a future private `stynx-det` service.
It mirrors the `stynx-esocial` boundary: SGP owns local product state and typed
requests, while the external service owns government communication.

SGP must not poll DET, hold DET certificate material, implement acknowledgement
protocol details, or publish external DET audit events. SGP stores only a
tenant-local inbox projection, operator annotations, and local acknowledgement
request state.
