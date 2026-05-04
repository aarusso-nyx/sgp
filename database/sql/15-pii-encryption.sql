ALTER TABLE hr.employee
    ADD COLUMN bank_account_cipher bytea,
    ADD COLUMN bank_account_cipher_key_id text,
    ADD COLUMN pis_pasep_cipher bytea,
    ADD COLUMN pis_pasep_cipher_key_id text,
    ADD COLUMN cpf_cipher bytea,
    ADD COLUMN cpf_cipher_key_id text,
    ADD COLUMN rg_cipher bytea,
    ADD COLUMN rg_cipher_key_id text,
    ADD COLUMN bank_agency_cipher bytea,
    ADD COLUMN bank_agency_cipher_key_id text,
    ADD COLUMN email_cipher bytea,
    ADD COLUMN email_cipher_key_id text,
    ADD COLUMN phone_cipher bytea,
    ADD COLUMN phone_cipher_key_id text;

ALTER TABLE hr.employee_complement_data
    ADD COLUMN pis_pasep_cipher bytea,
    ADD COLUMN pis_pasep_cipher_key_id text,
    ADD COLUMN rg_cipher bytea,
    ADD COLUMN rg_cipher_key_id text,
    ADD COLUMN voter_registration_cipher bytea,
    ADD COLUMN voter_registration_cipher_key_id text,
    ADD COLUMN emergency_contact_cipher bytea,
    ADD COLUMN emergency_contact_cipher_key_id text;

ALTER TABLE hr.employee_bank_account
    ADD COLUMN account_number_cipher bytea,
    ADD COLUMN account_number_cipher_key_id text,
    ADD COLUMN holder_cpf_cipher bytea,
    ADD COLUMN holder_cpf_cipher_key_id text;

ALTER TABLE hr.employee_dependent
    ADD COLUMN cpf_cipher bytea,
    ADD COLUMN cpf_cipher_key_id text;

ALTER TABLE fiscal.dirf_beneficiario
    ADD COLUMN cpf_cnpj_cipher bytea,
    ADD COLUMN cpf_cnpj_cipher_key_id text;

ALTER TABLE hr.employee_alimony
    ADD COLUMN beneficiary_cpf_cipher bytea,
    ADD COLUMN beneficiary_cpf_cipher_key_id text;

ALTER TABLE hr.employee_benefit_dependent
    ADD COLUMN dependent_cpf_cipher bytea,
    ADD COLUMN dependent_cpf_cipher_key_id text;

ALTER TABLE hr.internship_record
    ADD COLUMN intern_cpf_cipher bytea,
    ADD COLUMN intern_cpf_cipher_key_id text;

ALTER TABLE hr.legal_responsible
    ADD COLUMN cpf_cipher bytea,
    ADD COLUMN cpf_cipher_key_id text;

ALTER TABLE hr.medical_appointment
    ADD COLUMN contact_phone_cipher bytea,
    ADD COLUMN contact_phone_cipher_key_id text;

ALTER TABLE hr.pension_grant
    ADD COLUMN beneficiary_cpf_cipher bytea,
    ADD COLUMN beneficiary_cpf_cipher_key_id text;

ALTER TABLE hr.service_provider
    ADD COLUMN cpf_cnpj_cipher bytea,
    ADD COLUMN cpf_cnpj_cipher_key_id text,
    ADD COLUMN email_cipher bytea,
    ADD COLUMN email_cipher_key_id text,
    ADD COLUMN phone_cipher bytea,
    ADD COLUMN phone_cipher_key_id text;

ALTER TABLE public.user_account
    ADD COLUMN cpf_cipher bytea,
    ADD COLUMN cpf_cipher_key_id text,
    ADD COLUMN email_cipher bytea,
    ADD COLUMN email_cipher_key_id text;

ALTER TABLE recrutamento.banca_membro
    ADD COLUMN cpf_cipher bytea,
    ADD COLUMN cpf_cipher_key_id text;

ALTER TABLE recrutamento.candidato
    ADD COLUMN cpf_cipher bytea,
    ADD COLUMN cpf_cipher_key_id text,
    ADD COLUMN email_cipher bytea,
    ADD COLUMN email_cipher_key_id text,
    ADD COLUMN phone_cipher bytea,
    ADD COLUMN phone_cipher_key_id text;

COMMENT ON COLUMN hr.employee.bank_account_cipher IS 'encrypted_personal_data=true;classification=banking;source=R2-206';
COMMENT ON COLUMN hr.employee.pis_pasep_cipher IS 'encrypted_personal_data=true;classification=social_program_identifier;source=R2-206';
COMMENT ON COLUMN hr.employee.cpf_cipher IS 'encrypted_personal_data=true;classification=national_identifier;source=R3-032';
COMMENT ON COLUMN hr.employee.rg_cipher IS 'encrypted_personal_data=true;classification=national_identifier;source=R3-032';
COMMENT ON COLUMN hr.employee.bank_agency_cipher IS 'encrypted_personal_data=true;classification=banking;source=R3-032';
COMMENT ON COLUMN hr.employee.email_cipher IS 'encrypted_personal_data=true;classification=contact;source=R4-20';
COMMENT ON COLUMN hr.employee.phone_cipher IS 'encrypted_personal_data=true;classification=contact;source=R4-20';
COMMENT ON COLUMN hr.employee_complement_data.pis_pasep_cipher IS 'encrypted_personal_data=true;classification=social_program_identifier;source=R2-206';
COMMENT ON COLUMN hr.employee_complement_data.rg_cipher IS 'encrypted_personal_data=true;classification=national_identifier;source=R3-032';
COMMENT ON COLUMN hr.employee_complement_data.voter_registration_cipher IS 'encrypted_personal_data=true;classification=national_identifier;source=R3-032';
COMMENT ON COLUMN hr.employee_complement_data.emergency_contact_cipher IS 'encrypted_personal_data=true;classification=contact;source=R4-20';
COMMENT ON COLUMN hr.employee_bank_account.account_number_cipher IS 'encrypted_personal_data=true;classification=banking;source=R2-206';
COMMENT ON COLUMN hr.employee_bank_account.holder_cpf_cipher IS 'encrypted_personal_data=true;classification=national_identifier;source=R3-032';
COMMENT ON COLUMN hr.employee_dependent.cpf_cipher IS 'encrypted_personal_data=true;classification=national_identifier;source=R3-032';
COMMENT ON COLUMN fiscal.dirf_beneficiario.cpf_cnpj_cipher IS 'encrypted_personal_data=true;classification=tax_identifier;source=R4-20';
COMMENT ON COLUMN hr.employee_alimony.beneficiary_cpf_cipher IS 'encrypted_personal_data=true;classification=national_identifier;source=R4-20';
COMMENT ON COLUMN hr.employee_benefit_dependent.dependent_cpf_cipher IS 'encrypted_personal_data=true;classification=national_identifier;source=R4-20';
COMMENT ON COLUMN hr.internship_record.intern_cpf_cipher IS 'encrypted_personal_data=true;classification=national_identifier;source=R4-20';
COMMENT ON COLUMN hr.legal_responsible.cpf_cipher IS 'encrypted_personal_data=true;classification=national_identifier;source=R4-20';
COMMENT ON COLUMN hr.medical_appointment.contact_phone_cipher IS 'encrypted_personal_data=true;classification=contact;source=R4-20';
COMMENT ON COLUMN hr.pension_grant.beneficiary_cpf_cipher IS 'encrypted_personal_data=true;classification=national_identifier;source=R4-20';
COMMENT ON COLUMN hr.service_provider.cpf_cnpj_cipher IS 'encrypted_personal_data=true;classification=tax_identifier;source=R4-20';
COMMENT ON COLUMN hr.service_provider.email_cipher IS 'encrypted_personal_data=true;classification=contact;source=R4-20';
COMMENT ON COLUMN hr.service_provider.phone_cipher IS 'encrypted_personal_data=true;classification=contact;source=R4-20';
COMMENT ON COLUMN public.user_account.cpf_cipher IS 'encrypted_personal_data=true;classification=national_identifier;source=R4-20';
COMMENT ON COLUMN public.user_account.email_cipher IS 'encrypted_personal_data=true;classification=contact;source=R4-20';
COMMENT ON COLUMN recrutamento.banca_membro.cpf_cipher IS 'encrypted_personal_data=true;classification=national_identifier;source=R4-20';
COMMENT ON COLUMN recrutamento.candidato.cpf_cipher IS 'encrypted_personal_data=true;classification=national_identifier;source=R4-20';
COMMENT ON COLUMN recrutamento.candidato.email_cipher IS 'encrypted_personal_data=true;classification=contact;source=R4-20';
COMMENT ON COLUMN recrutamento.candidato.phone_cipher IS 'encrypted_personal_data=true;classification=contact;source=R4-20';

CREATE FUNCTION hr.sgp_pii_encryption_key() RETURNS text
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_key text;
BEGIN
  v_key := public.sgp_current_setting_text('app.pii_encryption_key');
  IF v_key IS NULL THEN
    RAISE EXCEPTION 'app.pii_encryption_key is required for R2-206 PII encryption'
      USING ERRCODE = '22023';
  END IF;
  RETURN v_key;
END;
$$;

CREATE FUNCTION hr.sgp_pii_encryption_key_id() RETURNS text
    LANGUAGE sql
    STABLE
    AS $$
  SELECT COALESCE(public.sgp_current_setting_text('app.pii_encryption_key_id'), 'session-key')
$$;

CREATE FUNCTION hr.sgp_encrypt_pii_text(p_plaintext text) RETURNS bytea
    LANGUAGE sql
    AS $$
  SELECT CASE
    WHEN p_plaintext IS NULL THEN NULL
    ELSE pgp_sym_encrypt(p_plaintext, hr.sgp_pii_encryption_key(), 'cipher-algo=aes256, compress-algo=0')
  END
$$;

CREATE FUNCTION hr.sgp_try_encrypt_pii_text(p_plaintext text) RETURNS bytea
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_key text;
BEGIN
  IF p_plaintext IS NULL THEN
    RETURN NULL;
  END IF;

  v_key := public.sgp_current_setting_text('app.pii_encryption_key');
  IF v_key IS NULL THEN
    RETURN NULL;
  END IF;

  RETURN pgp_sym_encrypt(p_plaintext, v_key, 'cipher-algo=aes256, compress-algo=0');
END;
$$;

CREATE FUNCTION hr.sgp_decrypt_pii_text(
  p_cipher bytea,
  p_plaintext_fallback text,
  p_resource_type text,
  p_resource_id text,
  p_column_name text
) RETURNS text
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_plaintext text;
BEGIN
  IF p_cipher IS NULL THEN
    RETURN p_plaintext_fallback;
  END IF;

  v_plaintext := pgp_sym_decrypt(p_cipher, hr.sgp_pii_encryption_key());

  PERFORM public.sgp_append_audit_event(
    'PII_DECRYPT',
    p_resource_type,
    p_resource_id,
    NULL,
    public.sgp_current_user_sub(),
    public.sgp_current_setting_text('app.current_login'),
    p_resource_type,
    public.sgp_current_setting_text('app.request_id'),
    jsonb_build_object(
      'column', p_column_name,
      'encrypted_at_rest', true,
      'source', 'R2-206,R3-032,R4-20'
    )
  );

  RETURN v_plaintext;
END;
$$;

CREATE FUNCTION hr.sgp_encrypt_employee_pii() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.bank_account IS NOT NULL
     AND (TG_OP = 'INSERT' OR NEW.bank_account IS DISTINCT FROM OLD.bank_account OR NEW.bank_account_cipher IS NULL) THEN
    NEW.bank_account_cipher := hr.sgp_encrypt_pii_text(NEW.bank_account);
    NEW.bank_account_cipher_key_id := hr.sgp_pii_encryption_key_id();
    NEW.bank_account := NULL;
  END IF;

  IF NEW.pis_pasep IS NOT NULL
     AND (TG_OP = 'INSERT' OR NEW.pis_pasep IS DISTINCT FROM OLD.pis_pasep OR NEW.pis_pasep_cipher IS NULL) THEN
    NEW.pis_pasep_cipher := hr.sgp_encrypt_pii_text(NEW.pis_pasep);
    NEW.pis_pasep_cipher_key_id := hr.sgp_pii_encryption_key_id();
    NEW.pis_pasep := NULL;
  END IF;

  IF NEW.cpf IS NOT NULL
     AND (TG_OP = 'INSERT' OR NEW.cpf IS DISTINCT FROM OLD.cpf OR NEW.cpf_cipher IS NULL) THEN
    NEW.cpf_cipher := hr.sgp_try_encrypt_pii_text(NEW.cpf);
    NEW.cpf_cipher_key_id := CASE WHEN NEW.cpf_cipher IS NULL THEN NULL ELSE hr.sgp_pii_encryption_key_id() END;
  END IF;

  IF NEW.rg IS NOT NULL
     AND (TG_OP = 'INSERT' OR NEW.rg IS DISTINCT FROM OLD.rg OR NEW.rg_cipher IS NULL) THEN
    NEW.rg_cipher := hr.sgp_try_encrypt_pii_text(NEW.rg);
    NEW.rg_cipher_key_id := CASE WHEN NEW.rg_cipher IS NULL THEN NULL ELSE hr.sgp_pii_encryption_key_id() END;
  END IF;

  IF NEW.bank_agency IS NOT NULL
     AND (TG_OP = 'INSERT' OR NEW.bank_agency IS DISTINCT FROM OLD.bank_agency OR NEW.bank_agency_cipher IS NULL) THEN
    NEW.bank_agency_cipher := hr.sgp_try_encrypt_pii_text(NEW.bank_agency);
    NEW.bank_agency_cipher_key_id := CASE WHEN NEW.bank_agency_cipher IS NULL THEN NULL ELSE hr.sgp_pii_encryption_key_id() END;
  END IF;

  IF NEW.email IS NOT NULL
     AND (TG_OP = 'INSERT' OR NEW.email IS DISTINCT FROM OLD.email OR NEW.email_cipher IS NULL) THEN
    NEW.email_cipher := hr.sgp_try_encrypt_pii_text(NEW.email);
    NEW.email_cipher_key_id := CASE WHEN NEW.email_cipher IS NULL THEN NULL ELSE hr.sgp_pii_encryption_key_id() END;
  END IF;

  IF NEW.phone IS NOT NULL
     AND (TG_OP = 'INSERT' OR NEW.phone IS DISTINCT FROM OLD.phone OR NEW.phone_cipher IS NULL) THEN
    NEW.phone_cipher := hr.sgp_try_encrypt_pii_text(NEW.phone);
    NEW.phone_cipher_key_id := CASE WHEN NEW.phone_cipher IS NULL THEN NULL ELSE hr.sgp_pii_encryption_key_id() END;
  END IF;

  RETURN NEW;
END;
$$;

CREATE FUNCTION hr.sgp_encrypt_employee_complement_pii() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.pis_pasep IS NOT NULL
     AND (TG_OP = 'INSERT' OR NEW.pis_pasep IS DISTINCT FROM OLD.pis_pasep OR NEW.pis_pasep_cipher IS NULL) THEN
    NEW.pis_pasep_cipher := hr.sgp_encrypt_pii_text(NEW.pis_pasep);
    NEW.pis_pasep_cipher_key_id := hr.sgp_pii_encryption_key_id();
    NEW.pis_pasep := NULL;
  END IF;

  IF NEW.rg IS NOT NULL
     AND (TG_OP = 'INSERT' OR NEW.rg IS DISTINCT FROM OLD.rg OR NEW.rg_cipher IS NULL) THEN
    NEW.rg_cipher := hr.sgp_try_encrypt_pii_text(NEW.rg);
    NEW.rg_cipher_key_id := CASE WHEN NEW.rg_cipher IS NULL THEN NULL ELSE hr.sgp_pii_encryption_key_id() END;
  END IF;

  IF NEW.voter_registration IS NOT NULL
     AND (TG_OP = 'INSERT' OR NEW.voter_registration IS DISTINCT FROM OLD.voter_registration OR NEW.voter_registration_cipher IS NULL) THEN
    NEW.voter_registration_cipher := hr.sgp_try_encrypt_pii_text(NEW.voter_registration);
    NEW.voter_registration_cipher_key_id := CASE WHEN NEW.voter_registration_cipher IS NULL THEN NULL ELSE hr.sgp_pii_encryption_key_id() END;
  END IF;

  IF NEW.emergency_contact IS NOT NULL
     AND (TG_OP = 'INSERT' OR NEW.emergency_contact IS DISTINCT FROM OLD.emergency_contact OR NEW.emergency_contact_cipher IS NULL) THEN
    NEW.emergency_contact_cipher := hr.sgp_try_encrypt_pii_text(NEW.emergency_contact::text);
    NEW.emergency_contact_cipher_key_id := CASE WHEN NEW.emergency_contact_cipher IS NULL THEN NULL ELSE hr.sgp_pii_encryption_key_id() END;
  END IF;

  RETURN NEW;
END;
$$;

CREATE FUNCTION hr.sgp_encrypt_employee_bank_account_pii() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.account_number IS NOT NULL
     AND NEW.account_number <> '[encrypted]'
     AND (TG_OP = 'INSERT' OR NEW.account_number IS DISTINCT FROM OLD.account_number OR NEW.account_number_cipher IS NULL) THEN
    NEW.account_number_cipher := hr.sgp_encrypt_pii_text(NEW.account_number);
    NEW.account_number_cipher_key_id := hr.sgp_pii_encryption_key_id();
    NEW.account_number := '[encrypted]';
  END IF;

  IF NEW.holder_cpf IS NOT NULL
     AND (TG_OP = 'INSERT' OR NEW.holder_cpf IS DISTINCT FROM OLD.holder_cpf OR NEW.holder_cpf_cipher IS NULL) THEN
    NEW.holder_cpf_cipher := hr.sgp_try_encrypt_pii_text(NEW.holder_cpf);
    NEW.holder_cpf_cipher_key_id := CASE WHEN NEW.holder_cpf_cipher IS NULL THEN NULL ELSE hr.sgp_pii_encryption_key_id() END;
  END IF;

  RETURN NEW;
END;
$$;

CREATE FUNCTION hr.sgp_encrypt_employee_dependent_pii() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.cpf IS NOT NULL
     AND (TG_OP = 'INSERT' OR NEW.cpf IS DISTINCT FROM OLD.cpf OR NEW.cpf_cipher IS NULL) THEN
    NEW.cpf_cipher := hr.sgp_try_encrypt_pii_text(NEW.cpf);
    NEW.cpf_cipher_key_id := CASE WHEN NEW.cpf_cipher IS NULL THEN NULL ELSE hr.sgp_pii_encryption_key_id() END;
  END IF;

  RETURN NEW;
END;
$$;

CREATE FUNCTION hr.sgp_encrypt_fiscal_dirf_beneficiario_pii() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.cpf_cnpj IS NOT NULL
     AND (TG_OP = 'INSERT' OR NEW.cpf_cnpj IS DISTINCT FROM OLD.cpf_cnpj OR NEW.cpf_cnpj_cipher IS NULL) THEN
    NEW.cpf_cnpj_cipher := hr.sgp_try_encrypt_pii_text(NEW.cpf_cnpj);
    NEW.cpf_cnpj_cipher_key_id := CASE WHEN NEW.cpf_cnpj_cipher IS NULL THEN NULL ELSE hr.sgp_pii_encryption_key_id() END;
  END IF;

  RETURN NEW;
END;
$$;

CREATE FUNCTION hr.sgp_encrypt_employee_alimony_pii() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.beneficiary_cpf IS NOT NULL
     AND (TG_OP = 'INSERT' OR NEW.beneficiary_cpf IS DISTINCT FROM OLD.beneficiary_cpf OR NEW.beneficiary_cpf_cipher IS NULL) THEN
    NEW.beneficiary_cpf_cipher := hr.sgp_try_encrypt_pii_text(NEW.beneficiary_cpf);
    NEW.beneficiary_cpf_cipher_key_id := CASE WHEN NEW.beneficiary_cpf_cipher IS NULL THEN NULL ELSE hr.sgp_pii_encryption_key_id() END;
  END IF;

  RETURN NEW;
END;
$$;

CREATE FUNCTION hr.sgp_encrypt_employee_benefit_dependent_pii() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.dependent_cpf IS NOT NULL
     AND (TG_OP = 'INSERT' OR NEW.dependent_cpf IS DISTINCT FROM OLD.dependent_cpf OR NEW.dependent_cpf_cipher IS NULL) THEN
    NEW.dependent_cpf_cipher := hr.sgp_try_encrypt_pii_text(NEW.dependent_cpf);
    NEW.dependent_cpf_cipher_key_id := CASE WHEN NEW.dependent_cpf_cipher IS NULL THEN NULL ELSE hr.sgp_pii_encryption_key_id() END;
  END IF;

  RETURN NEW;
END;
$$;

CREATE FUNCTION hr.sgp_encrypt_internship_record_pii() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.intern_cpf IS NOT NULL
     AND (TG_OP = 'INSERT' OR NEW.intern_cpf IS DISTINCT FROM OLD.intern_cpf OR NEW.intern_cpf_cipher IS NULL) THEN
    NEW.intern_cpf_cipher := hr.sgp_try_encrypt_pii_text(NEW.intern_cpf);
    NEW.intern_cpf_cipher_key_id := CASE WHEN NEW.intern_cpf_cipher IS NULL THEN NULL ELSE hr.sgp_pii_encryption_key_id() END;
  END IF;

  RETURN NEW;
END;
$$;

CREATE FUNCTION hr.sgp_encrypt_legal_responsible_pii() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.cpf IS NOT NULL
     AND (TG_OP = 'INSERT' OR NEW.cpf IS DISTINCT FROM OLD.cpf OR NEW.cpf_cipher IS NULL) THEN
    NEW.cpf_cipher := hr.sgp_try_encrypt_pii_text(NEW.cpf);
    NEW.cpf_cipher_key_id := CASE WHEN NEW.cpf_cipher IS NULL THEN NULL ELSE hr.sgp_pii_encryption_key_id() END;
  END IF;

  RETURN NEW;
END;
$$;

CREATE FUNCTION hr.sgp_encrypt_medical_appointment_pii() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.contact_phone IS NOT NULL
     AND (TG_OP = 'INSERT' OR NEW.contact_phone IS DISTINCT FROM OLD.contact_phone OR NEW.contact_phone_cipher IS NULL) THEN
    NEW.contact_phone_cipher := hr.sgp_try_encrypt_pii_text(NEW.contact_phone);
    NEW.contact_phone_cipher_key_id := CASE WHEN NEW.contact_phone_cipher IS NULL THEN NULL ELSE hr.sgp_pii_encryption_key_id() END;
  END IF;

  RETURN NEW;
END;
$$;

CREATE FUNCTION hr.sgp_encrypt_pension_grant_pii() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.beneficiary_cpf IS NOT NULL
     AND (TG_OP = 'INSERT' OR NEW.beneficiary_cpf IS DISTINCT FROM OLD.beneficiary_cpf OR NEW.beneficiary_cpf_cipher IS NULL) THEN
    NEW.beneficiary_cpf_cipher := hr.sgp_try_encrypt_pii_text(NEW.beneficiary_cpf);
    NEW.beneficiary_cpf_cipher_key_id := CASE WHEN NEW.beneficiary_cpf_cipher IS NULL THEN NULL ELSE hr.sgp_pii_encryption_key_id() END;
  END IF;

  RETURN NEW;
END;
$$;

CREATE FUNCTION hr.sgp_encrypt_service_provider_pii() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.cpf_cnpj IS NOT NULL
     AND (TG_OP = 'INSERT' OR NEW.cpf_cnpj IS DISTINCT FROM OLD.cpf_cnpj OR NEW.cpf_cnpj_cipher IS NULL) THEN
    NEW.cpf_cnpj_cipher := hr.sgp_try_encrypt_pii_text(NEW.cpf_cnpj);
    NEW.cpf_cnpj_cipher_key_id := CASE WHEN NEW.cpf_cnpj_cipher IS NULL THEN NULL ELSE hr.sgp_pii_encryption_key_id() END;
  END IF;

  IF NEW.email IS NOT NULL
     AND (TG_OP = 'INSERT' OR NEW.email IS DISTINCT FROM OLD.email OR NEW.email_cipher IS NULL) THEN
    NEW.email_cipher := hr.sgp_try_encrypt_pii_text(NEW.email);
    NEW.email_cipher_key_id := CASE WHEN NEW.email_cipher IS NULL THEN NULL ELSE hr.sgp_pii_encryption_key_id() END;
  END IF;

  IF NEW.phone IS NOT NULL
     AND (TG_OP = 'INSERT' OR NEW.phone IS DISTINCT FROM OLD.phone OR NEW.phone_cipher IS NULL) THEN
    NEW.phone_cipher := hr.sgp_try_encrypt_pii_text(NEW.phone);
    NEW.phone_cipher_key_id := CASE WHEN NEW.phone_cipher IS NULL THEN NULL ELSE hr.sgp_pii_encryption_key_id() END;
  END IF;

  RETURN NEW;
END;
$$;

CREATE FUNCTION hr.sgp_encrypt_user_account_pii() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.cpf IS NOT NULL
     AND (TG_OP = 'INSERT' OR NEW.cpf IS DISTINCT FROM OLD.cpf OR NEW.cpf_cipher IS NULL) THEN
    NEW.cpf_cipher := hr.sgp_try_encrypt_pii_text(NEW.cpf);
    NEW.cpf_cipher_key_id := CASE WHEN NEW.cpf_cipher IS NULL THEN NULL ELSE hr.sgp_pii_encryption_key_id() END;
  END IF;

  IF NEW.email IS NOT NULL
     AND (TG_OP = 'INSERT' OR NEW.email IS DISTINCT FROM OLD.email OR NEW.email_cipher IS NULL) THEN
    NEW.email_cipher := hr.sgp_try_encrypt_pii_text(NEW.email);
    NEW.email_cipher_key_id := CASE WHEN NEW.email_cipher IS NULL THEN NULL ELSE hr.sgp_pii_encryption_key_id() END;
  END IF;

  RETURN NEW;
END;
$$;

CREATE FUNCTION hr.sgp_encrypt_recrutamento_banca_membro_pii() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.cpf IS NOT NULL
     AND (TG_OP = 'INSERT' OR NEW.cpf IS DISTINCT FROM OLD.cpf OR NEW.cpf_cipher IS NULL) THEN
    NEW.cpf_cipher := hr.sgp_try_encrypt_pii_text(NEW.cpf);
    NEW.cpf_cipher_key_id := CASE WHEN NEW.cpf_cipher IS NULL THEN NULL ELSE hr.sgp_pii_encryption_key_id() END;
  END IF;

  RETURN NEW;
END;
$$;

CREATE FUNCTION hr.sgp_encrypt_recrutamento_candidato_pii() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.cpf IS NOT NULL
     AND (TG_OP = 'INSERT' OR NEW.cpf IS DISTINCT FROM OLD.cpf OR NEW.cpf_cipher IS NULL) THEN
    NEW.cpf_cipher := hr.sgp_try_encrypt_pii_text(NEW.cpf);
    NEW.cpf_cipher_key_id := CASE WHEN NEW.cpf_cipher IS NULL THEN NULL ELSE hr.sgp_pii_encryption_key_id() END;
  END IF;

  IF NEW.email IS NOT NULL
     AND (TG_OP = 'INSERT' OR NEW.email IS DISTINCT FROM OLD.email OR NEW.email_cipher IS NULL) THEN
    NEW.email_cipher := hr.sgp_try_encrypt_pii_text(NEW.email);
    NEW.email_cipher_key_id := CASE WHEN NEW.email_cipher IS NULL THEN NULL ELSE hr.sgp_pii_encryption_key_id() END;
  END IF;

  IF NEW.phone IS NOT NULL
     AND (TG_OP = 'INSERT' OR NEW.phone IS DISTINCT FROM OLD.phone OR NEW.phone_cipher IS NULL) THEN
    NEW.phone_cipher := hr.sgp_try_encrypt_pii_text(NEW.phone);
    NEW.phone_cipher_key_id := CASE WHEN NEW.phone_cipher IS NULL THEN NULL ELSE hr.sgp_pii_encryption_key_id() END;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER employee_pii_encrypt
    BEFORE INSERT OR UPDATE OF bank_account, pis_pasep, cpf, rg, bank_agency, email, phone ON hr.employee
    FOR EACH ROW EXECUTE FUNCTION hr.sgp_encrypt_employee_pii();

CREATE TRIGGER employee_complement_pii_encrypt
    BEFORE INSERT OR UPDATE OF pis_pasep, rg, voter_registration, emergency_contact ON hr.employee_complement_data
    FOR EACH ROW EXECUTE FUNCTION hr.sgp_encrypt_employee_complement_pii();

CREATE TRIGGER employee_bank_account_pii_encrypt
    BEFORE INSERT OR UPDATE OF account_number, holder_cpf ON hr.employee_bank_account
    FOR EACH ROW EXECUTE FUNCTION hr.sgp_encrypt_employee_bank_account_pii();

CREATE TRIGGER employee_dependent_pii_encrypt
    BEFORE INSERT OR UPDATE OF cpf ON hr.employee_dependent
    FOR EACH ROW EXECUTE FUNCTION hr.sgp_encrypt_employee_dependent_pii();

CREATE TRIGGER fiscal_dirf_beneficiario_pii_encrypt
    BEFORE INSERT OR UPDATE OF cpf_cnpj ON fiscal.dirf_beneficiario
    FOR EACH ROW EXECUTE FUNCTION hr.sgp_encrypt_fiscal_dirf_beneficiario_pii();

CREATE TRIGGER employee_alimony_pii_encrypt
    BEFORE INSERT OR UPDATE OF beneficiary_cpf ON hr.employee_alimony
    FOR EACH ROW EXECUTE FUNCTION hr.sgp_encrypt_employee_alimony_pii();

CREATE TRIGGER employee_benefit_dependent_pii_encrypt
    BEFORE INSERT OR UPDATE OF dependent_cpf ON hr.employee_benefit_dependent
    FOR EACH ROW EXECUTE FUNCTION hr.sgp_encrypt_employee_benefit_dependent_pii();

CREATE TRIGGER internship_record_pii_encrypt
    BEFORE INSERT OR UPDATE OF intern_cpf ON hr.internship_record
    FOR EACH ROW EXECUTE FUNCTION hr.sgp_encrypt_internship_record_pii();

CREATE TRIGGER legal_responsible_pii_encrypt
    BEFORE INSERT OR UPDATE OF cpf ON hr.legal_responsible
    FOR EACH ROW EXECUTE FUNCTION hr.sgp_encrypt_legal_responsible_pii();

CREATE TRIGGER medical_appointment_pii_encrypt
    BEFORE INSERT OR UPDATE OF contact_phone ON hr.medical_appointment
    FOR EACH ROW EXECUTE FUNCTION hr.sgp_encrypt_medical_appointment_pii();

CREATE TRIGGER pension_grant_pii_encrypt
    BEFORE INSERT OR UPDATE OF beneficiary_cpf ON hr.pension_grant
    FOR EACH ROW EXECUTE FUNCTION hr.sgp_encrypt_pension_grant_pii();

CREATE TRIGGER service_provider_pii_encrypt
    BEFORE INSERT OR UPDATE OF cpf_cnpj, email, phone ON hr.service_provider
    FOR EACH ROW EXECUTE FUNCTION hr.sgp_encrypt_service_provider_pii();

CREATE TRIGGER user_account_pii_encrypt
    BEFORE INSERT OR UPDATE OF cpf, email ON public.user_account
    FOR EACH ROW EXECUTE FUNCTION hr.sgp_encrypt_user_account_pii();

CREATE TRIGGER recrutamento_banca_membro_pii_encrypt
    BEFORE INSERT OR UPDATE OF cpf ON recrutamento.banca_membro
    FOR EACH ROW EXECUTE FUNCTION hr.sgp_encrypt_recrutamento_banca_membro_pii();

CREATE TRIGGER recrutamento_candidato_pii_encrypt
    BEFORE INSERT OR UPDATE OF cpf, email, phone ON recrutamento.candidato
    FOR EACH ROW EXECUTE FUNCTION hr.sgp_encrypt_recrutamento_candidato_pii();

CREATE VIEW hr.v_employee_pii_decrypted WITH (security_invoker='true') AS
SELECT
  employee.id,
  employee.registration,
  employee.name,
  employee.social_name,
  hr.sgp_decrypt_pii_text(employee.cpf_cipher, employee.cpf, 'hr.employee', employee.id::text, 'cpf') AS cpf,
  employee.birth_date,
  employee.gender,
  employee.email,
  employee.phone,
  employee.branch_id,
  employee.work_location_id,
  employee.cost_center_id,
  employee.job_position_id,
  employee.job_function_id,
  employee.salary_reference_id,
  employee.salary_range_level_id,
  employee.functional_status_id,
  employee.employment_link_id,
  employee.contract_type_id,
  employee.shift_id,
  employee.union_id,
  employee.bank_id,
  hr.sgp_decrypt_pii_text(employee.bank_agency_cipher, employee.bank_agency, 'hr.employee', employee.id::text, 'bank_agency') AS bank_agency,
  hr.sgp_decrypt_pii_text(employee.bank_account_cipher, employee.bank_account, 'hr.employee', employee.id::text, 'bank_account') AS bank_account,
  employee.hired_on,
  employee.terminated_on,
  employee.termination_reason_id,
  employee.lifecycle_status,
  employee.version,
  employee.created_at,
  employee.updated_at,
  employee.tenant_id,
  hr.sgp_decrypt_pii_text(employee.pis_pasep_cipher, employee.pis_pasep, 'hr.employee', employee.id::text, 'pis_pasep') AS pis_pasep,
  hr.sgp_decrypt_pii_text(employee.rg_cipher, employee.rg, 'hr.employee', employee.id::text, 'rg') AS rg,
  employee.rg_issuer,
  employee.mother_name,
  employee.father_name,
  employee.nationality_code,
  employee.birth_city_code,
  employee.address,
  employee.abono_permanencia_ativo,
  employee.abono_permanencia_inicio,
  employee.abono_permanencia_fundamento,
  employee.marital_status,
  employee.education_level,
  employee.recruitment_concurso_id,
  employee.recruitment_nomeacao_id
FROM hr.employee employee;

CREATE VIEW hr.v_employee_complement_data_pii_decrypted WITH (security_invoker='true') AS
SELECT
  complement.id,
  complement.employee_id,
  hr.sgp_decrypt_pii_text(complement.rg_cipher, complement.rg, 'hr.employee_complement_data', complement.id::text, 'rg') AS rg,
  complement.rg_issuer,
  hr.sgp_decrypt_pii_text(complement.pis_pasep_cipher, complement.pis_pasep, 'hr.employee_complement_data', complement.id::text, 'pis_pasep') AS pis_pasep,
  hr.sgp_decrypt_pii_text(complement.voter_registration_cipher, complement.voter_registration, 'hr.employee_complement_data', complement.id::text, 'voter_registration') AS voter_registration,
  complement.address,
  complement.emergency_contact,
  complement.created_at,
  complement.updated_at,
  complement.tenant_id
FROM hr.employee_complement_data complement;

CREATE VIEW hr.v_employee_bank_account_pii_decrypted WITH (security_invoker='true') AS
SELECT
  account.id,
  account.tenant_id,
  account.employee_id,
  account.bank_id,
  account.agency,
  account.agency_digit,
  hr.sgp_decrypt_pii_text(account.account_number_cipher, account.account_number, 'hr.employee_bank_account', account.id::text, 'account_number') AS account_number,
  account.account_digit,
  account.holder_kind,
  hr.sgp_decrypt_pii_text(account.holder_cpf_cipher, account.holder_cpf, 'hr.employee_bank_account', account.id::text, 'holder_cpf') AS holder_cpf,
  account.dependent_id,
  account.validation_status,
  account.validation_error_code,
  account.validated_at,
  account.validated_by,
  account.created_at,
  account.updated_at
FROM hr.employee_bank_account account;
