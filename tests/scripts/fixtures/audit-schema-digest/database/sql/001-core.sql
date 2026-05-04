create table hr.person (
  id uuid primary key,
  tenant_id uuid not null,
  name text not null,
  document_number text default 'unknown',
  department_id uuid references hr.department(id),
  constraint person_name_unique unique (tenant_id, name)
);

create table hr.department (
  id uuid primary key,
  name text not null
);

alter table hr.person enable row level security;
create policy person_tenant_policy on hr.person using (tenant_id = current_setting('app.current_tenant_id')::uuid);
create index person_name_idx on hr.person (tenant_id, name);
create trigger person_audit before update on hr.person for each row execute function audit_touch();
comment on column hr.person.document_number is 'pii=true;classification=restricted;category=document';
