# TS-V - Alteração Contratual S-2306

O ES-11 implementa a alteração contratual de trabalhador sem vínculo de emprego/estatutário (TS-V) pelo evento eSocial S-2306. O cadastro inicial permanece no S-2300; este corte cobre somente mudanças posteriores de contrato, como função, bolsa mensal, jornada, lotação, supervisor e dados de estágio.

As categorias TS-V seguem o MOS eSocial, incluindo estagiários regidos pela Lei 11.788/2008, conselheiros tutelares, agentes políticos sem vínculo CLT/RPPS e demais trabalhadores sem vínculo enquadráveis no RET. Para estagiários, o contrato registra instituição de ensino e URI do plano de atividades, mas a validação semântica do TCE fica fora deste corte.

O modelo físico novo fica em `hr.tsv_contract` e `hr.tsv_contract_change`. A alteração administrativa usa `PATCH /api/v1/admin/hr/tsv-contracts/:id`, exige `hr.employment.write`, valida `effectiveDate >= start_date` e rejeita patches sem mudança real. `fields_changed`, `previous_values` e `new_values` são JSONB com apenas os campos que diferem do snapshot atual; campos ausentes no patch não entram no delta.

O builder `backend/src/esocial-worker/s2306` lê o delta e gera `evtTSVAltContr` com somente os grupos afetados. Alteração de `monthly_amount` emite `remuneracao/vrSalFx`; alteração de `role` emite `cargoFuncao`; alteração de dados de estágio emite `infoEstagiario`; alteração de `workplace_id` emite `localTrabGeral`. O XML é validado contra `evtTSVAltContr.xsd` do bundle oficial S-1.3 antes da transmissão pelo hub ES-07.

As tabelas são tenant-scoped, forçam RLS por `sgp_tenant_matches(tenant_id)` e permissões `hr.employment.read`, `hr.employment.write`, `esocial.event.read` e `esocial.event.write`. Toda mutação dispara `public.sgp_append_audit_event(...)`; valores monetários usam `numeric(14,2)`, jornadas usam `numeric(18,6)` e o código não usa `Math.round` para valores monetários.
