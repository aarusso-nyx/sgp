DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type typ
    JOIN pg_namespace namespace ON namespace.oid = typ.typnamespace
    WHERE namespace.nspname = 'public'
      AND typ.typname = 'esocial_spool_status'
  ) THEN
    CREATE TYPE public.esocial_spool_status AS ENUM (
      'PENDING',
      'SENT',
      'RECEIVED',
      'ACCEPTED',
      'REJECTED',
      'RETRY',
      'DLQ'
    );
  END IF;
END
$$;

CREATE TABLE public.esocial_spool (
  message_id uuid DEFAULT gen_random_uuid() NOT NULL,
  tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL,
  kind text NOT NULL,
  event_class text NOT NULL,
  source_ref jsonb DEFAULT '{}'::jsonb NOT NULL,
  payload jsonb NOT NULL,
  payload_hash text NOT NULL,
  response jsonb,
  response_hash text,
  status public.esocial_spool_status DEFAULT 'PENDING'::public.esocial_spool_status NOT NULL,
  attempt integer DEFAULT 0 NOT NULL,
  max_attempts integer DEFAULT 3 NOT NULL,
  error jsonb,
  tstamp_created timestamp with time zone DEFAULT now() NOT NULL,
  tstamp_sent timestamp with time zone,
  tstamp_recv timestamp with time zone,
  tstamp_terminal timestamp with time zone,
  actor_sub text,
  actor_login text,
  request_id text,
  CONSTRAINT esocial_spool_pkey PRIMARY KEY (message_id),
  CONSTRAINT esocial_spool_tenant_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(id),
  CONSTRAINT esocial_spool_kind_check CHECK (
    kind = ANY (
      ARRAY[
        'submit',
        'tabelas',
        'trabalhador',
        'folha',
        'fechamento',
        'exclusao',
        'retorno',
        'certificado'
      ]::text[]
    )
  ),
  CONSTRAINT esocial_spool_attempt_check CHECK (attempt >= 0),
  CONSTRAINT esocial_spool_max_attempts_check CHECK (max_attempts > 0),
  CONSTRAINT esocial_spool_payload_hash_check CHECK (payload_hash ~ '^[a-f0-9]{64}$'),
  CONSTRAINT esocial_spool_response_hash_check CHECK (
    response_hash IS NULL OR response_hash ~ '^[a-f0-9]{64}$'
  ),
  CONSTRAINT esocial_spool_terminal_timestamp_check CHECK (
    (status IN ('ACCEPTED', 'REJECTED', 'DLQ') AND tstamp_terminal IS NOT NULL)
    OR (status NOT IN ('ACCEPTED', 'REJECTED', 'DLQ'))
  ),
  CONSTRAINT esocial_spool_response_timestamp_check CHECK (
    (status IN ('RECEIVED', 'ACCEPTED') AND tstamp_recv IS NOT NULL)
    OR (status NOT IN ('RECEIVED', 'ACCEPTED'))
  )
);

CREATE INDEX esocial_spool_tenant_status_created_idx
  ON public.esocial_spool USING btree (tenant_id, status, tstamp_created DESC);

CREATE INDEX esocial_spool_kind_event_created_idx
  ON public.esocial_spool USING btree (kind, event_class, tstamp_created DESC);

CREATE INDEX esocial_spool_source_ref_gin_idx
  ON public.esocial_spool USING gin (source_ref);

CREATE UNIQUE INDEX esocial_spool_active_payload_hash_uidx
  ON public.esocial_spool USING btree (tenant_id, kind, event_class, payload_hash)
  WHERE status NOT IN (
    'REJECTED'::public.esocial_spool_status,
    'DLQ'::public.esocial_spool_status
  );

ALTER TABLE public.esocial_spool ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.esocial_spool FORCE ROW LEVEL SECURITY;

CREATE POLICY esocial_spool_tenant_isolation ON public.esocial_spool
  FOR SELECT
  USING (
    public.sgp_bypass_rls()
    OR (
      public.sgp_tenant_matches(tenant_id)
      AND public.sgp_has_any_permission(ARRAY[
        'esocial.event.read'::text,
        'esocial.event.write'::text
      ])
    )
  );

CREATE POLICY esocial_spool_insert ON public.esocial_spool
  FOR INSERT
  WITH CHECK (
    public.sgp_bypass_rls()
    OR (
      public.sgp_tenant_matches(tenant_id)
      AND public.sgp_has_any_permission(ARRAY['esocial.event.write'::text])
    )
  );

CREATE POLICY esocial_spool_update ON public.esocial_spool
  FOR UPDATE
  USING (
    public.sgp_bypass_rls()
    OR (
      public.sgp_tenant_matches(tenant_id)
      AND public.sgp_has_any_permission(ARRAY['esocial.event.write'::text])
    )
  )
  WITH CHECK (
    public.sgp_bypass_rls()
    OR (
      public.sgp_tenant_matches(tenant_id)
      AND public.sgp_has_any_permission(ARRAY['esocial.event.write'::text])
    )
  );

COMMENT ON TABLE public.esocial_spool IS
  'R6-06 canonical SGP-side eSocial spool. stynx-esocial owns its isolated DB; SGP receipts and reports read this table only. Retention is pg_partman-ready by monthly tstamp_created partitions, with 5+ year receipt retention before owner-approved archival.';

SELECT public.sgp_apply_esocial_spool_pii_comments();
