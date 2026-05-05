-- Wave 1 / SGP CNAB 240 v2 — RLS for payroll.company_bank_account.
--
-- Read access: any actor with payroll.bank_config.read or payment.remittance.write
-- (the latter is required by the CNAB worker which dispatches remittances).
-- Write access: payroll.bank_config.write only.
-- Tenant isolation enforced via public.sgp_tenant_matches; sgp_bypass_rls
-- accommodates seeding/migration scripts.

ALTER TABLE payroll.company_bank_account ENABLE ROW LEVEL SECURITY;
ALTER TABLE ONLY payroll.company_bank_account FORCE ROW LEVEL SECURITY;

CREATE POLICY company_bank_account_select ON payroll.company_bank_account
    FOR SELECT
    USING (
        public.sgp_bypass_rls()
        OR (
            public.sgp_tenant_matches(tenant_id)
            AND public.sgp_has_any_permission(ARRAY[
                'payroll.bank_config.read'::text,
                'payroll.bank_config.write'::text,
                'payment.remittance.write'::text
            ])
        )
    );

CREATE POLICY company_bank_account_write ON payroll.company_bank_account
    USING (
        public.sgp_bypass_rls()
        OR (
            public.sgp_tenant_matches(tenant_id)
            AND public.sgp_has_any_permission(ARRAY['payroll.bank_config.write'::text])
        )
    )
    WITH CHECK (
        public.sgp_bypass_rls()
        OR (
            public.sgp_tenant_matches(tenant_id)
            AND public.sgp_has_any_permission(ARRAY['payroll.bank_config.write'::text])
        )
    );
