DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type typ
    JOIN pg_namespace namespace ON namespace.oid = typ.typnamespace
    WHERE namespace.nspname = 'fiscal'
      AND typ.typname = 'det_message_status'
  ) THEN
    CREATE TYPE fiscal.det_message_status AS ENUM (
      'UNREAD',
      'READ',
      'ACK_REQUESTED',
      'ACKNOWLEDGED',
      'ARCHIVED',
      'ERROR'
    );
  END IF;
END
$$;

CREATE TABLE fiscal.det_message_projection (
  tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL,
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  external_message_id text NOT NULL,
  subject text NOT NULL,
  sender text,
  received_at timestamp with time zone NOT NULL,
  due_at timestamp with time zone,
  read_at timestamp with time zone,
  acknowledged_at timestamp with time zone,
  status fiscal.det_message_status DEFAULT 'UNREAD'::fiscal.det_message_status NOT NULL,
  source_payload jsonb DEFAULT '{}'::jsonb NOT NULL,
  latest_update_payload jsonb DEFAULT '{}'::jsonb NOT NULL,
  annotation text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT det_message_projection_pkey PRIMARY KEY (id),
  CONSTRAINT det_message_projection_tenant_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(id),
  CONSTRAINT det_message_projection_external_uidx UNIQUE (tenant_id, external_message_id),
  CONSTRAINT det_message_projection_ack_timestamp_chk CHECK (
    (status = 'ACKNOWLEDGED'::fiscal.det_message_status AND acknowledged_at IS NOT NULL)
    OR status <> 'ACKNOWLEDGED'::fiscal.det_message_status
  )
);

CREATE INDEX det_message_projection_tenant_status_received_idx
  ON fiscal.det_message_projection USING btree (tenant_id, status, received_at DESC);

CREATE INDEX det_message_projection_payload_gin_idx
  ON fiscal.det_message_projection USING gin (source_payload);

ALTER TABLE fiscal.det_message_projection ENABLE ROW LEVEL SECURITY;
ALTER TABLE fiscal.det_message_projection FORCE ROW LEVEL SECURITY;

CREATE POLICY det_message_projection_select ON fiscal.det_message_projection
  FOR SELECT
  USING (
    public.sgp_bypass_rls()
    OR (
      public.sgp_tenant_matches(tenant_id)
      AND public.sgp_has_any_permission(ARRAY[
        'det.message.read'::text,
        'det.message.write'::text
      ])
    )
  );

CREATE POLICY det_message_projection_write ON fiscal.det_message_projection
  USING (
    public.sgp_bypass_rls()
    OR (
      public.sgp_tenant_matches(tenant_id)
      AND public.sgp_has_any_permission(ARRAY['det.message.write'::text])
    )
  )
  WITH CHECK (
    public.sgp_bypass_rls()
    OR (
      public.sgp_tenant_matches(tenant_id)
      AND public.sgp_has_any_permission(ARRAY['det.message.write'::text])
    )
  );

COMMENT ON TABLE fiscal.det_message_projection IS
  'SGP-side projection of DET inbox messages. stynx-det owns polling, acknowledgement protocol, certificate handling, retries, and external audit publication; SGP stores operator-visible state only.';

COMMENT ON COLUMN fiscal.det_message_projection.source_payload IS
  'Raw normalized DET message payload received from stynx-det. SGP treats it as projection evidence, not as an external-service contract implementation.';
