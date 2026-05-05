DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type typ
    JOIN pg_namespace namespace ON namespace.oid = typ.typnamespace
    WHERE namespace.nspname = 'public'
      AND typ.typname = 'esocial_events_status'
  ) THEN
    CREATE TYPE public.esocial_events_status AS ENUM (
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

CREATE TABLE public.esocial_events (
  message_id uuid DEFAULT gen_random_uuid() NOT NULL,
  tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL,
  kind text NOT NULL,
  event_class text NOT NULL,
  source_ref jsonb DEFAULT '{}'::jsonb NOT NULL,
  payload jsonb NOT NULL,
  payload_hash text NOT NULL,
  response jsonb,
  response_hash text,
  status public.esocial_events_status DEFAULT 'PENDING'::public.esocial_events_status NOT NULL,
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
  CONSTRAINT esocial_events_pkey PRIMARY KEY (message_id),
  CONSTRAINT esocial_events_tenant_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(id),
  CONSTRAINT esocial_events_kind_check CHECK (
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
  CONSTRAINT esocial_events_attempt_check CHECK (attempt >= 0),
  CONSTRAINT esocial_events_max_attempts_check CHECK (max_attempts > 0),
  CONSTRAINT esocial_events_payload_hash_check CHECK (payload_hash ~ '^[a-f0-9]{64}$'),
  CONSTRAINT esocial_events_response_hash_check CHECK (
    response_hash IS NULL OR response_hash ~ '^[a-f0-9]{64}$'
  ),
  CONSTRAINT esocial_events_terminal_timestamp_check CHECK (
    (status IN ('ACCEPTED', 'REJECTED', 'DLQ') AND tstamp_terminal IS NOT NULL)
    OR (status NOT IN ('ACCEPTED', 'REJECTED', 'DLQ'))
  ),
  CONSTRAINT esocial_events_response_timestamp_check CHECK (
    (status IN ('RECEIVED', 'ACCEPTED') AND tstamp_recv IS NOT NULL)
    OR (status NOT IN ('RECEIVED', 'ACCEPTED'))
  )
);

CREATE INDEX esocial_events_tenant_status_created_idx
  ON public.esocial_events USING btree (tenant_id, status, tstamp_created DESC);

CREATE INDEX esocial_events_kind_event_created_idx
  ON public.esocial_events USING btree (kind, event_class, tstamp_created DESC);

CREATE INDEX esocial_events_source_ref_gin_idx
  ON public.esocial_events USING gin (source_ref);

CREATE UNIQUE INDEX esocial_events_active_payload_hash_uidx
  ON public.esocial_events USING btree (tenant_id, kind, event_class, payload_hash)
  WHERE status NOT IN (
    'REJECTED'::public.esocial_events_status,
    'DLQ'::public.esocial_events_status
  );

ALTER TABLE public.esocial_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.esocial_events FORCE ROW LEVEL SECURITY;

CREATE POLICY esocial_events_tenant_isolation ON public.esocial_events
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

CREATE POLICY esocial_events_insert ON public.esocial_events
  FOR INSERT
  WITH CHECK (
    public.sgp_bypass_rls()
    OR (
      public.sgp_tenant_matches(tenant_id)
      AND public.sgp_has_any_permission(ARRAY['esocial.event.write'::text])
    )
  );

CREATE POLICY esocial_events_update ON public.esocial_events
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

COMMENT ON TABLE public.esocial_events IS
  'R6-06 canonical SGP-side eSocial spool. stynx-esocial owns its isolated DB; SGP receipts and reports read this table only. Retention is pg_partman-ready by monthly tstamp_created partitions, with 5+ year receipt retention before owner-approved archival.';

SELECT public.sgp_apply_esocial_events_pii_comments();
