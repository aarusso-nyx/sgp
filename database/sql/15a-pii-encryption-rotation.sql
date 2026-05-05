CREATE FUNCTION hr.sgp_rotate_pii_cipher(
  p_cipher bytea,
  p_from_key text,
  p_to_key text
) RETURNS bytea
    LANGUAGE sql
    AS $$
  SELECT CASE
    WHEN p_cipher IS NULL THEN NULL
    ELSE pgp_sym_encrypt(
      pgp_sym_decrypt(p_cipher, p_from_key),
      p_to_key,
      'cipher-algo=aes256, compress-algo=0'
    )
  END
$$;

CREATE FUNCTION hr.sgp_pii_cipher_rotation_manifest() RETURNS TABLE (
  schema_name text,
  table_name text,
  plaintext_column text,
  cipher_column text,
  key_id_column text
)
    LANGUAGE sql
    STABLE
    AS $$
  VALUES
    ('fiscal', 'dirf_beneficiario', 'cpf_cnpj', 'cpf_cnpj_cipher', 'cpf_cnpj_cipher_key_id'),
    ('hr', 'employee', 'bank_account', 'bank_account_cipher', 'bank_account_cipher_key_id'),
    ('hr', 'employee', 'bank_agency', 'bank_agency_cipher', 'bank_agency_cipher_key_id'),
    ('hr', 'employee', 'cpf', 'cpf_cipher', 'cpf_cipher_key_id'),
    ('hr', 'employee', 'email', 'email_cipher', 'email_cipher_key_id'),
    ('hr', 'employee', 'phone', 'phone_cipher', 'phone_cipher_key_id'),
    ('hr', 'employee', 'pis_pasep', 'pis_pasep_cipher', 'pis_pasep_cipher_key_id'),
    ('hr', 'employee', 'rg', 'rg_cipher', 'rg_cipher_key_id'),
    ('hr', 'employee_alimony', 'beneficiary_cpf', 'beneficiary_cpf_cipher', 'beneficiary_cpf_cipher_key_id'),
    ('hr', 'employee_bank_account', 'account_number', 'account_number_cipher', 'account_number_cipher_key_id'),
    ('hr', 'employee_bank_account', 'holder_cpf', 'holder_cpf_cipher', 'holder_cpf_cipher_key_id'),
    ('hr', 'employee_benefit_dependent', 'dependent_cpf', 'dependent_cpf_cipher', 'dependent_cpf_cipher_key_id'),
    ('hr', 'employee_complement_data', 'emergency_contact', 'emergency_contact_cipher', 'emergency_contact_cipher_key_id'),
    ('hr', 'employee_complement_data', 'pis_pasep', 'pis_pasep_cipher', 'pis_pasep_cipher_key_id'),
    ('hr', 'employee_complement_data', 'rg', 'rg_cipher', 'rg_cipher_key_id'),
    ('hr', 'employee_complement_data', 'voter_registration', 'voter_registration_cipher', 'voter_registration_cipher_key_id'),
    ('hr', 'employee_dependent', 'cpf', 'cpf_cipher', 'cpf_cipher_key_id'),
    ('hr', 'internship_record', 'intern_cpf', 'intern_cpf_cipher', 'intern_cpf_cipher_key_id'),
    ('hr', 'legal_responsible', 'cpf', 'cpf_cipher', 'cpf_cipher_key_id'),
    ('hr', 'medical_appointment', 'contact_phone', 'contact_phone_cipher', 'contact_phone_cipher_key_id'),
    ('hr', 'pension_grant', 'beneficiary_cpf', 'beneficiary_cpf_cipher', 'beneficiary_cpf_cipher_key_id'),
    ('hr', 'service_provider', 'cpf_cnpj', 'cpf_cnpj_cipher', 'cpf_cnpj_cipher_key_id'),
    ('hr', 'service_provider', 'email', 'email_cipher', 'email_cipher_key_id'),
    ('hr', 'service_provider', 'phone', 'phone_cipher', 'phone_cipher_key_id'),
    ('public', 'user_account', 'cpf', 'cpf_cipher', 'cpf_cipher_key_id'),
    ('public', 'user_account', 'email', 'email_cipher', 'email_cipher_key_id'),
    ('recrutamento', 'banca_membro', 'cpf', 'cpf_cipher', 'cpf_cipher_key_id'),
    ('recrutamento', 'candidato', 'cpf', 'cpf_cipher', 'cpf_cipher_key_id'),
    ('recrutamento', 'candidato', 'email', 'email_cipher', 'email_cipher_key_id'),
    ('recrutamento', 'candidato', 'phone', 'phone_cipher', 'phone_cipher_key_id')
$$;
