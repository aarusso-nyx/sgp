CREATE TYPE lgpd.international_transfer_mechanism AS ENUM (
    'ADEQUACY_DECISION',
    'STANDARD_CONTRACTUAL_CLAUSES',
    'SPECIFIC_CONTRACTUAL_CLAUSES',
    'GLOBAL_CORPORATE_RULES',
    'LEGAL_COOPERATION',
    'PUBLIC_POLICY',
    'CONSENT',
    'CONTRACT_EXECUTION',
    'LEGAL_CLAIM',
    'VITAL_INTEREST',
    'ANPD_AUTHORIZATION'
);

CREATE TYPE lgpd.international_transfer_status AS ENUM (
    'DRAFT',
    'DPO_REVIEW',
    'ACTIVE',
    'CLOSED',
    'REJECTED'
);

CREATE TABLE lgpd.international_transfer_country_adequacy (
    country_code text NOT NULL,
    country_name text NOT NULL,
    recognized_by_anpd boolean DEFAULT false NOT NULL,
    adequacy_decision_ref text,
    default_mechanism lgpd.international_transfer_mechanism DEFAULT 'STANDARD_CONTRACTUAL_CLAUSES'::lgpd.international_transfer_mechanism NOT NULL,
    notes text,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT international_transfer_country_adequacy_pkey PRIMARY KEY (country_code),
    CONSTRAINT international_transfer_country_code_check CHECK (country_code ~ '^[A-Z0-9]{2,3}$')
);

CREATE TABLE lgpd.international_transfer (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL,
    ropa_entry_id uuid,
    flow_key text NOT NULL,
    origin_country text DEFAULT 'BR'::text NOT NULL,
    origin_region text,
    destination_country text NOT NULL,
    destination_region text,
    processor_name text NOT NULL,
    purpose text NOT NULL,
    data_categories text[] DEFAULT ARRAY[]::text[] NOT NULL,
    mechanism lgpd.international_transfer_mechanism NOT NULL,
    mechanism_reference text NOT NULL,
    safeguards text[] DEFAULT ARRAY[]::text[] NOT NULL,
    dpo_approval_ref text,
    status lgpd.international_transfer_status DEFAULT 'DRAFT'::lgpd.international_transfer_status NOT NULL,
    starts_at date,
    ends_at date,
    review_due_at date,
    legal_citation text DEFAULT 'Lei 13.709/2018 art. 33; Resolução CD/ANPD 19/2024'::text NOT NULL,
    notes text,
    created_by_ref text,
    reviewed_by_ref text,
    activated_by_ref text,
    closed_by_ref text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT international_transfer_pkey PRIMARY KEY (id),
    CONSTRAINT international_transfer_country_fk FOREIGN KEY (destination_country) REFERENCES lgpd.international_transfer_country_adequacy(country_code) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT international_transfer_ropa_entry_fk FOREIGN KEY (ropa_entry_id) REFERENCES lgpd.ropa_entry(id) ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT international_transfer_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.tenant(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT international_transfer_required_text_check CHECK (
        length(btrim(flow_key)) > 0
        AND length(btrim(destination_country)) > 0
        AND length(btrim(processor_name)) > 0
        AND length(btrim(purpose)) > 0
        AND length(btrim(mechanism_reference)) > 0
    ),
    CONSTRAINT international_transfer_date_check CHECK (ends_at IS NULL OR starts_at IS NULL OR ends_at >= starts_at),
    CONSTRAINT international_transfer_active_check CHECK (
        status <> 'ACTIVE'::lgpd.international_transfer_status
        OR (dpo_approval_ref IS NOT NULL AND starts_at IS NOT NULL)
    ),
    CONSTRAINT international_transfer_closed_check CHECK (
        status <> 'CLOSED'::lgpd.international_transfer_status
        OR ends_at IS NOT NULL
    )
);

CREATE TABLE lgpd.international_transfer_event (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL,
    international_transfer_id uuid NOT NULL,
    flow_key text NOT NULL,
    processor_name text NOT NULL,
    destination_country text NOT NULL,
    destination_region text,
    request_path text,
    resource_type text,
    resource_id text,
    data_categories text[] DEFAULT ARRAY[]::text[] NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    detected_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT international_transfer_event_pkey PRIMARY KEY (id),
    CONSTRAINT international_transfer_event_transfer_fk FOREIGN KEY (international_transfer_id) REFERENCES lgpd.international_transfer(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT international_transfer_event_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.tenant(id) ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE INDEX international_transfer_tenant_status_idx ON lgpd.international_transfer USING btree (tenant_id, status, review_due_at ASC NULLS LAST);
CREATE INDEX international_transfer_flow_idx ON lgpd.international_transfer USING btree (tenant_id, flow_key, processor_name);
CREATE INDEX international_transfer_destination_idx ON lgpd.international_transfer USING btree (destination_country, destination_region);
CREATE INDEX international_transfer_event_transfer_idx ON lgpd.international_transfer_event USING btree (tenant_id, international_transfer_id, detected_at DESC);

CREATE TRIGGER international_transfer_touch_updated_at BEFORE UPDATE ON lgpd.international_transfer FOR EACH ROW EXECUTE FUNCTION lgpd.sgp_lgpd_touch_updated_at();

ALTER TABLE lgpd.international_transfer ENABLE ROW LEVEL SECURITY;
ALTER TABLE lgpd.international_transfer FORCE ROW LEVEL SECURITY;
ALTER TABLE lgpd.international_transfer_event ENABLE ROW LEVEL SECURITY;
ALTER TABLE lgpd.international_transfer_event FORCE ROW LEVEL SECURITY;

CREATE POLICY international_transfer_select ON lgpd.international_transfer FOR SELECT USING (
    public.sgp_tenant_matches(tenant_id)
    AND public.sgp_has_any_permission(ARRAY['auditoria.read'::text, 'gestao.read'::text, 'gestao.write'::text])
);

CREATE POLICY international_transfer_write ON lgpd.international_transfer USING (
    public.sgp_tenant_matches(tenant_id)
    AND public.sgp_has_any_permission(ARRAY['gestao.write'::text])
) WITH CHECK (
    public.sgp_tenant_matches(tenant_id)
    AND public.sgp_has_any_permission(ARRAY['gestao.write'::text])
);

CREATE POLICY international_transfer_event_select ON lgpd.international_transfer_event FOR SELECT USING (
    public.sgp_tenant_matches(tenant_id)
    AND public.sgp_has_any_permission(ARRAY['auditoria.read'::text, 'gestao.read'::text, 'gestao.write'::text])
);

CREATE POLICY international_transfer_event_insert ON lgpd.international_transfer_event FOR INSERT WITH CHECK (
    public.sgp_tenant_matches(tenant_id)
    AND public.sgp_is_authenticated()
);

INSERT INTO lgpd.international_transfer_country_adequacy (
    country_code,
    country_name,
    recognized_by_anpd,
    adequacy_decision_ref,
    default_mechanism,
    notes
) VALUES
    ('EU', 'European Union', true, 'Resolução CD/ANPD 32/2026', 'ADEQUACY_DECISION', 'ANPD adequacy recognition for the European Union as an international organization.'),
    ('AT', 'Austria', true, 'Resolução CD/ANPD 32/2026', 'ADEQUACY_DECISION', 'EU member state.'),
    ('BE', 'Belgium', true, 'Resolução CD/ANPD 32/2026', 'ADEQUACY_DECISION', 'EU member state.'),
    ('BG', 'Bulgaria', true, 'Resolução CD/ANPD 32/2026', 'ADEQUACY_DECISION', 'EU member state.'),
    ('HR', 'Croatia', true, 'Resolução CD/ANPD 32/2026', 'ADEQUACY_DECISION', 'EU member state.'),
    ('CY', 'Cyprus', true, 'Resolução CD/ANPD 32/2026', 'ADEQUACY_DECISION', 'EU member state.'),
    ('CZ', 'Czechia', true, 'Resolução CD/ANPD 32/2026', 'ADEQUACY_DECISION', 'EU member state.'),
    ('DK', 'Denmark', true, 'Resolução CD/ANPD 32/2026', 'ADEQUACY_DECISION', 'EU member state.'),
    ('EE', 'Estonia', true, 'Resolução CD/ANPD 32/2026', 'ADEQUACY_DECISION', 'EU member state.'),
    ('FI', 'Finland', true, 'Resolução CD/ANPD 32/2026', 'ADEQUACY_DECISION', 'EU member state.'),
    ('FR', 'France', true, 'Resolução CD/ANPD 32/2026', 'ADEQUACY_DECISION', 'EU member state.'),
    ('DE', 'Germany', true, 'Resolução CD/ANPD 32/2026', 'ADEQUACY_DECISION', 'EU member state.'),
    ('GR', 'Greece', true, 'Resolução CD/ANPD 32/2026', 'ADEQUACY_DECISION', 'EU member state.'),
    ('HU', 'Hungary', true, 'Resolução CD/ANPD 32/2026', 'ADEQUACY_DECISION', 'EU member state.'),
    ('IE', 'Ireland', true, 'Resolução CD/ANPD 32/2026', 'ADEQUACY_DECISION', 'EU member state.'),
    ('IT', 'Italy', true, 'Resolução CD/ANPD 32/2026', 'ADEQUACY_DECISION', 'EU member state.'),
    ('LV', 'Latvia', true, 'Resolução CD/ANPD 32/2026', 'ADEQUACY_DECISION', 'EU member state.'),
    ('LT', 'Lithuania', true, 'Resolução CD/ANPD 32/2026', 'ADEQUACY_DECISION', 'EU member state.'),
    ('LU', 'Luxembourg', true, 'Resolução CD/ANPD 32/2026', 'ADEQUACY_DECISION', 'EU member state.'),
    ('MT', 'Malta', true, 'Resolução CD/ANPD 32/2026', 'ADEQUACY_DECISION', 'EU member state.'),
    ('NL', 'Netherlands', true, 'Resolução CD/ANPD 32/2026', 'ADEQUACY_DECISION', 'EU member state.'),
    ('PL', 'Poland', true, 'Resolução CD/ANPD 32/2026', 'ADEQUACY_DECISION', 'EU member state.'),
    ('PT', 'Portugal', true, 'Resolução CD/ANPD 32/2026', 'ADEQUACY_DECISION', 'EU member state.'),
    ('RO', 'Romania', true, 'Resolução CD/ANPD 32/2026', 'ADEQUACY_DECISION', 'EU member state.'),
    ('SK', 'Slovakia', true, 'Resolução CD/ANPD 32/2026', 'ADEQUACY_DECISION', 'EU member state.'),
    ('SI', 'Slovenia', true, 'Resolução CD/ANPD 32/2026', 'ADEQUACY_DECISION', 'EU member state.'),
    ('ES', 'Spain', true, 'Resolução CD/ANPD 32/2026', 'ADEQUACY_DECISION', 'EU member state.'),
    ('SE', 'Sweden', true, 'Resolução CD/ANPD 32/2026', 'ADEQUACY_DECISION', 'EU member state.'),
    ('IS', 'Iceland', false, null, 'STANDARD_CONTRACTUAL_CLAUSES', 'EEA state; add ANPD adequacy reference if separately recognized.'),
    ('LI', 'Liechtenstein', false, null, 'STANDARD_CONTRACTUAL_CLAUSES', 'EEA state; add ANPD adequacy reference if separately recognized.'),
    ('NO', 'Norway', false, null, 'STANDARD_CONTRACTUAL_CLAUSES', 'EEA state; add ANPD adequacy reference if separately recognized.')
ON CONFLICT (country_code) DO UPDATE
SET
    country_name = EXCLUDED.country_name,
    recognized_by_anpd = EXCLUDED.recognized_by_anpd,
    adequacy_decision_ref = EXCLUDED.adequacy_decision_ref,
    default_mechanism = EXCLUDED.default_mechanism,
    notes = EXCLUDED.notes,
    updated_at = CURRENT_TIMESTAMP;

COMMENT ON TABLE lgpd.international_transfer_country_adequacy IS 'P.12 reference table for ANPD adequacy decisions and default transfer mechanisms.';
COMMENT ON TABLE lgpd.international_transfer IS 'P.12 tenant international personal-data transfer mechanism register under LGPD art. 33 and Resolução CD/ANPD 19/2024.';
COMMENT ON TABLE lgpd.international_transfer_event IS 'P.12 detected cross-border or cross-region transfer events linked to active approved mechanisms.';
