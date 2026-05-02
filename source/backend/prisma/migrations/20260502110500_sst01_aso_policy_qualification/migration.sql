DROP POLICY IF EXISTS aso_record_select ON saude.aso_record;
CREATE POLICY aso_record_select ON saude.aso_record
  FOR SELECT
  USING (
    public.sgp_tenant_matches(saude.aso_record.tenant_id)
    AND (
      public.sgp_has_any_permission(ARRAY['saude.aso.read', 'saude.aso.write'])
      OR (
        public.sgp_has_any_permission(ARRAY['saude.aso.self_read'])
        AND saude.aso_record.employee_id = public.sgp_current_employee_id()
      )
    )
  );

DROP POLICY IF EXISTS aso_record_write ON saude.aso_record;
CREATE POLICY aso_record_write ON saude.aso_record
  FOR ALL
  USING (
    public.sgp_tenant_matches(saude.aso_record.tenant_id)
    AND public.sgp_has_any_permission(ARRAY['saude.aso.write'])
  )
  WITH CHECK (
    public.sgp_tenant_matches(saude.aso_record.tenant_id)
    AND public.sgp_has_any_permission(ARRAY['saude.aso.write'])
  );

DROP POLICY IF EXISTS aso_exam_item_select ON saude.aso_exam_item;
CREATE POLICY aso_exam_item_select ON saude.aso_exam_item
  FOR SELECT
  USING (
    public.sgp_tenant_matches(saude.aso_exam_item.tenant_id)
    AND (
      public.sgp_has_any_permission(ARRAY['saude.aso.read', 'saude.aso.write'])
      OR (
        public.sgp_has_any_permission(ARRAY['saude.aso.self_read'])
        AND EXISTS (
          SELECT 1 FROM saude.aso_record ar
          WHERE ar.id = saude.aso_exam_item.aso_record_id
            AND ar.tenant_id = saude.aso_exam_item.tenant_id
            AND ar.employee_id = public.sgp_current_employee_id()
        )
      )
    )
  );

DROP POLICY IF EXISTS aso_exam_item_write ON saude.aso_exam_item;
CREATE POLICY aso_exam_item_write ON saude.aso_exam_item
  FOR ALL
  USING (
    public.sgp_tenant_matches(saude.aso_exam_item.tenant_id)
    AND public.sgp_has_any_permission(ARRAY['saude.aso.write'])
  )
  WITH CHECK (
    public.sgp_tenant_matches(saude.aso_exam_item.tenant_id)
    AND public.sgp_has_any_permission(ARRAY['saude.aso.write'])
  );

DROP POLICY IF EXISTS aso_attachment_select ON saude.aso_attachment;
CREATE POLICY aso_attachment_select ON saude.aso_attachment
  FOR SELECT
  USING (
    public.sgp_tenant_matches(saude.aso_attachment.tenant_id)
    AND (
      public.sgp_has_any_permission(ARRAY['saude.aso.read', 'saude.aso.write'])
      OR (
        public.sgp_has_any_permission(ARRAY['saude.aso.self_read'])
        AND EXISTS (
          SELECT 1 FROM saude.aso_record ar
          WHERE ar.id = saude.aso_attachment.aso_record_id
            AND ar.tenant_id = saude.aso_attachment.tenant_id
            AND ar.employee_id = public.sgp_current_employee_id()
        )
      )
    )
  );

DROP POLICY IF EXISTS aso_attachment_write ON saude.aso_attachment;
CREATE POLICY aso_attachment_write ON saude.aso_attachment
  FOR ALL
  USING (
    public.sgp_tenant_matches(saude.aso_attachment.tenant_id)
    AND public.sgp_has_any_permission(ARRAY['saude.aso.write'])
  )
  WITH CHECK (
    public.sgp_tenant_matches(saude.aso_attachment.tenant_id)
    AND public.sgp_has_any_permission(ARRAY['saude.aso.write'])
  );
