CREATE TABLE public.idempotency_keys (
  tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL,
  key_hash text NOT NULL,
  request_hash text NOT NULL,
  response_snapshot jsonb,
  status text DEFAULT 'processing'::text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  ttl_at timestamp with time zone DEFAULT (now() + interval '24 hours') NOT NULL,
  CONSTRAINT idempotency_keys_pkey PRIMARY KEY (tenant_id, key_hash),
  CONSTRAINT idempotency_keys_key_hash_check CHECK (length(btrim(key_hash)) >= 32),
  CONSTRAINT idempotency_keys_request_hash_check CHECK (length(btrim(request_hash)) >= 32),
  CONSTRAINT idempotency_keys_status_check CHECK (
    status IN ('processing', 'completed', 'failed')
  ),
  CONSTRAINT idempotency_keys_completed_snapshot_check CHECK (
    status <> 'completed'
    OR response_snapshot IS NOT NULL
  )
);

ALTER TABLE ONLY public.idempotency_keys
  ADD CONSTRAINT idempotency_keys_tenant_fk
  FOREIGN KEY (tenant_id) REFERENCES public.tenant(id) ON UPDATE CASCADE ON DELETE CASCADE;

CREATE INDEX idempotency_keys_tenant_key_idx
  ON public.idempotency_keys (tenant_id, key_hash);

CREATE INDEX idempotency_keys_ttl_idx
  ON public.idempotency_keys (ttl_at);

ALTER TABLE public.idempotency_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.idempotency_keys FORCE ROW LEVEL SECURITY;

CREATE POLICY idempotency_keys_tenant_isolation ON public.idempotency_keys
  FOR ALL
  USING (
    public.sgp_bypass_rls()
    OR public.sgp_tenant_matches(tenant_id)
  )
  WITH CHECK (
    public.sgp_bypass_rls()
    OR public.sgp_tenant_matches(tenant_id)
  );
