# Portal self-service operations

## Document requests

The employee portal route `/documentos/solicitar` creates a tenant-scoped
document request through `POST /api/v1/portal/documentos/solicitacoes`.
The request is tracked in `public.document_request`; official files remain in
the document attachment module and are linked by HR when fulfilled.

Operators should review open requests by age, update the document workflow in
the back-office document module, and attach the fulfilled file before marking a
request ready.

## Manager approval queue

Managers use `/minha-equipe` or `/aprovacoes` to review pending leave and
vacation requests for their organizational context. Approval actions call the
existing HR transitions for `hr.leave_record` and `hr.vacation_record`.

If a manager cannot see expected rows, verify that the actor has both
`rh.leave.approve` and `rh.vacation.approve`, and that their employee profile
has branch, work-location, or cost-center context.
