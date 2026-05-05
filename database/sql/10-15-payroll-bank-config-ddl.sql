-- Wave 1 / SGP CNAB 240 v2 — Per-company bank configuration.
--
-- Holds the company side of a CNAB 240 remittance: the bank account from which
-- payroll/FGTS/GPS/alimony funds are debited, plus the bank-issued agreement
-- identifiers (convenio, agency agreement, modality) and the relay endpoint
-- used to transmit files. One row per (tenant, bank, service form code) so a
-- single company can have e.g. salary and FGTS handled by separate convenios
-- with the same bank.
--
-- Designed to replace the hardcoded values currently embedded in
-- backend/src/integrations-worker/cnab240/banks/*.strategy.ts. See
-- docs/eng/Banking/02-cnab240-bank-variations.md for the field semantics and
-- docs/eng/Banking/05-sgp-implementation-matrix.md (Wave 1) for the rollout
-- contract.

CREATE TABLE payroll.company_bank_account (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL,
    bank_id uuid NOT NULL,
    bank_code smallint NOT NULL,
    branch text NOT NULL,
    branch_dv text,
    account text NOT NULL,
    account_dv text NOT NULL,
    convenio text NOT NULL,
    agency_agreement text NOT NULL,
    modality text NOT NULL,
    service_form_code text NOT NULL,
    purpose_code_default text,
    layout_version text NOT NULL DEFAULT 'CNAB240-FEBRABAN-10.11',
    relay_endpoint_url text,
    relay_credential_secret_ref text,
    relay_mode text NOT NULL DEFAULT 'mock',
    active boolean NOT NULL DEFAULT true,
    notes text,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT company_bank_account_pkey PRIMARY KEY (id),
    CONSTRAINT company_bank_account_bank_code_check CHECK ((bank_code BETWEEN 1 AND 999)),
    CONSTRAINT company_bank_account_service_form_check CHECK ((service_form_code ~ '^[0-9]{4}$')),
    CONSTRAINT company_bank_account_relay_mode_check CHECK ((relay_mode IN ('mock','http','sftp'))),
    CONSTRAINT company_bank_account_branch_nonempty_check CHECK ((char_length(branch) BETWEEN 1 AND 16)),
    CONSTRAINT company_bank_account_account_nonempty_check CHECK ((char_length(account) BETWEEN 1 AND 32)),
    CONSTRAINT company_bank_account_convenio_nonempty_check CHECK ((char_length(convenio) BETWEEN 1 AND 64)),
    CONSTRAINT company_bank_account_unique_routing UNIQUE (tenant_id, bank_code, service_form_code, convenio)
);

ALTER TABLE ONLY payroll.company_bank_account
    ADD CONSTRAINT company_bank_account_bank_id_fk
    FOREIGN KEY (bank_id) REFERENCES hr.bank (id);

CREATE INDEX idx_payroll_company_bank_account_tenant_id_idx
    ON payroll.company_bank_account (tenant_id);

CREATE INDEX idx_payroll_company_bank_account_bank_id_fk
    ON payroll.company_bank_account (bank_id);

CREATE INDEX idx_payroll_company_bank_account_lookup
    ON payroll.company_bank_account (tenant_id, bank_code, service_form_code)
    WHERE (active = true);

COMMENT ON TABLE payroll.company_bank_account IS
    'Per-tenant CNAB 240 sender configuration. One row per (tenant, bank, service form code). Replaces hardcoded BankStrategy fields. See docs/eng/Banking/02-cnab240-bank-variations.md.';

COMMENT ON COLUMN payroll.company_bank_account.convenio IS
    'Bank-issued payment agreement identifier (convenio). Specific to the contract between this tenant and the bank. PII: confidential, do not log.';

COMMENT ON COLUMN payroll.company_bank_account.agency_agreement IS
    'Bank-issued agency agreement code (agencia mutuante). Free-form per bank.';

COMMENT ON COLUMN payroll.company_bank_account.modality IS
    'Payment modality label (e.g. SALARIO, PAGFOR, CREDITO, FORNECEDOR). Bank-specific; see BankLayoutTemplate.';

COMMENT ON COLUMN payroll.company_bank_account.service_form_code IS
    'FEBRABAN service form code, 4 digits. 0401 = generic credit, 0404 = salary direct credit, 2201 = FGTS, 9801 = GPS.';

COMMENT ON COLUMN payroll.company_bank_account.layout_version IS
    'CNAB layout version label, including bank-specific suffix (e.g. CNAB240-FEBRABAN-10.11-BB).';

COMMENT ON COLUMN payroll.company_bank_account.relay_endpoint_url IS
    'HTTPS URL of the banking relay that will accept the remittance file. NULL when relay_mode = mock.';

COMMENT ON COLUMN payroll.company_bank_account.relay_credential_secret_ref IS
    'Opaque reference to the credential secret in KMS/Vault. Plaintext credentials must never be stored here.';

COMMENT ON COLUMN payroll.company_bank_account.relay_mode IS
    'Transport selector. mock = in-process BankingRelayMockResponder; http = real HTTPS relay; sftp = future, not yet implemented.';
