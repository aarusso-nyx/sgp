COMMENT ON COLUMN payment.consignment_entity.cnpj IS 'pii=true;classification=organization_identifier;category=CNPJ;ropa_export=true;source=R2-204';
COMMENT ON COLUMN payment.dirf_payment_source.beneficiary_name IS 'pii=true;classification=personal_name;category=beneficiary_identity;ropa_export=true;source=R5-70';
COMMENT ON COLUMN fiscal.dirf_beneficiario.cpf_cnpj IS 'pii=true;classification=tax_identifier;category=CPF_CNPJ;ropa_export=true;source=R2-204';
COMMENT ON COLUMN fiscal.dirf_beneficiario.name IS 'pii=true;classification=personal_name;category=beneficiary_identity;ropa_export=true;source=R5-70';
COMMENT ON COLUMN fiscal.efd_reinf_item.beneficiary_name IS 'pii=true;classification=personal_name;category=beneficiary_identity;ropa_export=true;source=R5-70';
COMMENT ON COLUMN hr.branch.cnpj IS 'pii=true;classification=organization_identifier;category=CNPJ;ropa_export=true;source=R2-204';
COMMENT ON COLUMN hr.company.cnpj IS 'pii=true;classification=organization_identifier;category=CNPJ;ropa_export=true;source=R2-204';
COMMENT ON COLUMN hr.employee.name IS 'pii=true;classification=personal_name;category=identity;ropa_export=true;source=R2-204';
COMMENT ON COLUMN hr.employee.social_name IS 'pii=true;classification=personal_name;category=identity;ropa_export=true;source=R2-204';
COMMENT ON COLUMN hr.employee.cpf IS 'pii=true;classification=national_identifier;category=CPF;ropa_export=true;source=R2-204';
COMMENT ON COLUMN hr.employee.birth_date IS 'pii=true;classification=demographic;category=birth_date;ropa_export=true;source=R2-204';
COMMENT ON COLUMN hr.employee.email IS 'pii=true;classification=contact;category=email;ropa_export=true;source=R2-204';
COMMENT ON COLUMN hr.employee.phone IS 'pii=true;classification=contact;category=phone;ropa_export=true;source=R2-204';
COMMENT ON COLUMN hr.employee.bank_agency IS 'pii=true;classification=banking;category=bank_agency;ropa_export=true;source=R2-204';
COMMENT ON COLUMN hr.employee.bank_account IS 'pii=true;classification=banking;category=bank_account;ropa_export=true;source=R2-204';
COMMENT ON COLUMN hr.employee.pis_pasep IS 'pii=true;classification=social_program_identifier;category=PIS_PASEP;ropa_export=true;source=R2-204';
COMMENT ON COLUMN hr.employee.rg IS 'pii=true;classification=national_identifier;category=RG;ropa_export=true;source=R2-204';
COMMENT ON COLUMN hr.employee.rg_issuer IS 'pii=true;classification=document_metadata;category=RG_issuer;ropa_export=true;source=R5-70';
COMMENT ON COLUMN hr.employee.mother_name IS 'pii=true;classification=family_name;category=parent_name;ropa_export=true;source=R2-204';
COMMENT ON COLUMN hr.employee.father_name IS 'pii=true;classification=family_name;category=parent_name;ropa_export=true;source=R2-204';
COMMENT ON COLUMN hr.employee.birth_city_code IS 'pii=true;classification=demographic;category=birth_city;ropa_export=true;source=R5-70';
COMMENT ON COLUMN hr.employee.address IS 'pii=true;classification=address;category=address;ropa_export=true;source=R2-204';
COMMENT ON COLUMN hr.education_institution.cnpj IS 'pii=true;classification=organization_identifier;category=CNPJ;ropa_export=true;source=R2-204';
COMMENT ON COLUMN hr.education_institution.address IS 'pii=true;classification=address;category=address;ropa_export=true;source=R2-204';
COMMENT ON COLUMN hr.employee_alimony.beneficiary_cpf IS 'pii=true;classification=national_identifier;category=CPF;ropa_export=true;source=R2-204';
COMMENT ON COLUMN hr.employee_alimony.beneficiary_name IS 'pii=true;classification=personal_name;category=beneficiary_identity;ropa_export=true;source=R5-70';
COMMENT ON COLUMN hr.employee_alimony.judge_name IS 'pii=true;classification=personal_name;category=judicial_actor;ropa_export=true;source=R5-70';
COMMENT ON COLUMN hr.employee_bank_account.account_number IS 'pii=true;classification=banking;category=bank_account;ropa_export=true;source=R2-204';
COMMENT ON COLUMN hr.employee_bank_account.holder_cpf IS 'pii=true;classification=national_identifier;category=CPF;ropa_export=true;source=R2-204';
COMMENT ON COLUMN hr.employee_benefit_dependent.dependent_name IS 'pii=true;classification=personal_name;category=dependent_identity;ropa_export=true;source=R2-204';
COMMENT ON COLUMN hr.employee_benefit_dependent.dependent_cpf IS 'pii=true;classification=national_identifier;category=CPF;ropa_export=true;source=R2-204';
COMMENT ON COLUMN hr.employee_complement_data.rg IS 'pii=true;classification=national_identifier;category=RG;ropa_export=true;source=R2-204';
COMMENT ON COLUMN hr.employee_complement_data.pis_pasep IS 'pii=true;classification=social_program_identifier;category=PIS_PASEP;ropa_export=true;source=R2-204';
COMMENT ON COLUMN hr.employee_complement_data.voter_registration IS 'pii=true;classification=national_identifier;category=voter_registration;ropa_export=true;source=R2-204';
COMMENT ON COLUMN hr.employee_complement_data.address IS 'pii=true;classification=address;category=address;ropa_export=true;source=R2-204';
COMMENT ON COLUMN hr.employee_complement_data.emergency_contact IS 'pii=true;classification=contact;category=emergency_contact;ropa_export=true;source=R2-204';
COMMENT ON COLUMN hr.employee_dependent.name IS 'pii=true;classification=personal_name;category=dependent_identity;ropa_export=true;source=R2-204';
COMMENT ON COLUMN hr.employee_dependent.cpf IS 'pii=true;classification=national_identifier;category=CPF;ropa_export=true;source=R2-204';
COMMENT ON COLUMN hr.employee_dependent.birth_date IS 'pii=true;classification=demographic;category=birth_date;ropa_export=true;source=R2-204';
COMMENT ON COLUMN hr.internship_record.intern_cpf IS 'pii=true;classification=national_identifier;category=CPF;ropa_export=true;source=R2-204';
COMMENT ON COLUMN hr.internship_record.intern_name IS 'pii=true;classification=personal_name;category=intern_identity;ropa_export=true;source=R5-70';
COMMENT ON COLUMN hr.internship_record.supervisor_name IS 'pii=true;classification=personal_name;category=supervisor_identity;ropa_export=true;source=R5-70';
COMMENT ON COLUMN hr.legal_responsible.cpf IS 'pii=true;classification=national_identifier;category=CPF;ropa_export=true;source=R2-204';
COMMENT ON COLUMN hr.legal_responsible.name IS 'pii=true;classification=personal_name;category=legal_responsible_identity;ropa_export=true;source=R5-70';
COMMENT ON COLUMN hr.medical_appointment.contact_phone IS 'pii=true;classification=contact;category=phone;ropa_export=true;source=R2-204';
COMMENT ON COLUMN hr.pension_grant.beneficiary_cpf IS 'pii=true;classification=national_identifier;category=CPF;ropa_export=true;source=R2-204';
COMMENT ON COLUMN hr.pension_grant.beneficiary_name IS 'pii=true;classification=personal_name;category=beneficiary_identity;ropa_export=true;source=R5-70';
COMMENT ON COLUMN hr.recruitment_candidate.person_ref IS 'pii=true;classification=pseudonymous_identifier;category=recruitment_person_ref;ropa_export=true;source=R5-70';
COMMENT ON COLUMN hr.recruitment_candidate.curriculum_s3_key IS 'pii=true;classification=document_reference;category=curriculum;ropa_export=true;source=R5-70';
COMMENT ON COLUMN hr.service_provider.cpf_cnpj IS 'pii=true;classification=tax_identifier;category=CPF_CNPJ;ropa_export=true;source=R2-204';
COMMENT ON COLUMN hr.service_provider.name IS 'pii=true;classification=personal_name;category=service_provider_identity;ropa_export=true;source=R5-70';
COMMENT ON COLUMN hr.service_provider.email IS 'pii=true;classification=contact;category=email;ropa_export=true;source=R2-204';
COMMENT ON COLUMN hr.service_provider.phone IS 'pii=true;classification=contact;category=phone;ropa_export=true;source=R2-204';
COMMENT ON COLUMN hr.service_provider.address IS 'pii=true;classification=address;category=address;ropa_export=true;source=R2-204';
COMMENT ON COLUMN hr.service_taker.cnpj IS 'pii=true;classification=organization_identifier;category=CNPJ;ropa_export=true;source=R2-204';
COMMENT ON COLUMN hr.service_taker.contact IS 'pii=true;classification=representative_contact;category=service_taker_contact;ropa_export=true;source=R5-70';
COMMENT ON COLUMN hr.service_taker.address IS 'pii=true;classification=address;category=address;ropa_export=true;source=R2-204';
COMMENT ON COLUMN hr.union_entity.cnpj IS 'pii=true;classification=organization_identifier;category=CNPJ;ropa_export=true;source=R2-204';
COMMENT ON COLUMN public_data.lai_request.requester_name IS 'pii=true;classification=personal_name;category=lai_requester_identity;ropa_export=true;source=R5-70';
COMMENT ON COLUMN public_data.lai_request.requester_document_hash IS 'pii=true;classification=pseudonymous_identifier;category=requester_document_hash;ropa_export=true;source=R5-70';
COMMENT ON COLUMN public_data.lai_request.request_text IS 'pii=true;classification=request_free_text;category=public_information_request;ropa_export=true;source=R5-70';
COMMENT ON COLUMN public_data.transparency_payroll_snapshot.full_name IS 'pii=true;classification=personal_name;category=public_payroll_identity;ropa_export=true;source=R5-70';
COMMENT ON COLUMN public_data.transparency_payroll_snapshot.registration_number IS 'pii=true;classification=employee_identifier;category=public_payroll_registration;ropa_export=true;source=R5-70';
COMMENT ON COLUMN public.user_account.cpf IS 'pii=true;classification=national_identifier;category=CPF;ropa_export=true;source=R2-204';
COMMENT ON COLUMN public.user_account.name IS 'pii=true;classification=personal_name;category=user_identity;ropa_export=true;source=R5-70';
COMMENT ON COLUMN public.user_account.email IS 'pii=true;classification=contact;category=email;ropa_export=true;source=R2-204';
COMMENT ON COLUMN recrutamento.banca_membro.cpf IS 'pii=true;classification=national_identifier;category=CPF;ropa_export=true;source=R2-204';
COMMENT ON COLUMN recrutamento.banca_membro.full_name IS 'pii=true;classification=personal_name;category=selection_board_identity;ropa_export=true;source=R5-70';
COMMENT ON COLUMN recrutamento.candidato.cpf IS 'pii=true;classification=national_identifier;category=CPF;ropa_export=true;source=R2-204';
COMMENT ON COLUMN recrutamento.candidato.full_name IS 'pii=true;classification=personal_name;category=candidate_identity;ropa_export=true;source=R5-70';
COMMENT ON COLUMN recrutamento.candidato.birth_date IS 'pii=true;classification=demographic;category=birth_date;ropa_export=true;source=R5-70';
COMMENT ON COLUMN recrutamento.candidato.email IS 'pii=true;classification=contact;category=email;ropa_export=true;source=R2-204';
COMMENT ON COLUMN recrutamento.candidato.phone IS 'pii=true;classification=contact;category=phone;ropa_export=true;source=R2-204';
COMMENT ON COLUMN recrutamento.candidato.address IS 'pii=true;classification=address;category=address;ropa_export=true;source=R2-204';
COMMENT ON COLUMN recrutamento.candidato.curriculum_s3_key IS 'pii=true;classification=document_reference;category=curriculum;ropa_export=true;source=R3-025';
COMMENT ON COLUMN recrutamento.candidato.profile_summary IS 'pii=true;classification=profile;category=talent_pool;ropa_export=true;source=R3-025';
COMMENT ON COLUMN recrutamento.candidato.skills IS 'pii=true;classification=profile;category=talent_pool;ropa_export=true;source=R3-025';
COMMENT ON COLUMN saude.aso_record.doctor_crm IS 'pii=true;classification=professional_identifier;category=CRM;ropa_export=true;source=R5-70';
COMMENT ON COLUMN saude.aso_record.doctor_name IS 'pii=true;classification=personal_name;category=health_professional_identity;ropa_export=true;source=R5-70';
COMMENT ON COLUMN saude.cat_emission.doctor_crm IS 'pii=true;classification=professional_identifier;category=CRM;ropa_export=true;source=R5-70';
COMMENT ON COLUMN saude.cat_emission.doctor_name IS 'pii=true;classification=personal_name;category=health_professional_identity;ropa_export=true;source=R5-70';
COMMENT ON COLUMN saude.health_program.responsible_doctor_crm IS 'pii=true;classification=professional_identifier;category=CRM;ropa_export=true;source=R5-70';
COMMENT ON COLUMN saude.health_program.responsible_doctor_name IS 'pii=true;classification=personal_name;category=health_professional_identity;ropa_export=true;source=R5-70';

CREATE OR REPLACE FUNCTION public.sgp_apply_esocial_spool_pii_comments()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  IF to_regclass('public.esocial_spool') IS NULL THEN
    RETURN;
  END IF;

  COMMENT ON COLUMN public.esocial_spool.source_ref IS
    'pii=true;classification=pseudonymous_identifier;category=esocial_source_reference;ropa_export=true;source=R6-06';
  COMMENT ON COLUMN public.esocial_spool.payload IS
    'pii=true;classification=regulatory_payload;category=esocial_message_payload;ropa_export=true;source=R6-06';
  COMMENT ON COLUMN public.esocial_spool.response IS
    'pii=true;classification=regulatory_payload;category=esocial_message_response;ropa_export=true;source=R6-06';
  COMMENT ON COLUMN public.esocial_spool.error IS
    'pii=true;classification=operational_error;category=esocial_transport_error;ropa_export=true;source=R6-06';
  COMMENT ON COLUMN public.esocial_spool.actor_sub IS
    'pii=true;classification=pseudonymous_identifier;category=actor_subject;ropa_export=true;source=R6-06';
  COMMENT ON COLUMN public.esocial_spool.actor_login IS
    'pii=true;classification=login_identifier;category=actor_login;ropa_export=true;source=R6-06';
END;
$$;

CREATE VIEW lgpd.v_pii_column_catalog WITH (security_invoker='true') AS
SELECT
  namespace.nspname AS table_schema,
  class.relname AS table_name,
  attribute.attname AS column_name,
  description.description AS pii_comment,
  substring(description.description FROM 'classification=([^;]+)') AS classification,
  substring(description.description FROM 'category=([^;]+)') AS category,
  COALESCE(
    array_agg(DISTINCT rule.flow_key ORDER BY rule.flow_key) FILTER (WHERE rule.flow_key IS NOT NULL),
    ARRAY[]::text[]
  ) AS ropa_flow_keys
FROM pg_attribute attribute
JOIN pg_class class ON class.oid = attribute.attrelid
JOIN pg_namespace namespace ON namespace.oid = class.relnamespace
JOIN pg_description description
  ON description.objoid = attribute.attrelid
 AND description.objsubid = attribute.attnum
LEFT JOIN lgpd.legal_basis_rule rule
  ON rule.status = 'ACTIVE'
 AND (namespace.nspname || '.' || class.relname) = ANY (rule.source_tables)
WHERE attribute.attnum > 0
  AND NOT attribute.attisdropped
  AND description.description LIKE 'pii=true;%'
  AND description.description LIKE '%ropa_export=true%'
GROUP BY namespace.nspname, class.relname, attribute.attname, description.description;
