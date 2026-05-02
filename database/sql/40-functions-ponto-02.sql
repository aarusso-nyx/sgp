CREATE FUNCTION ponto.ponto10_face_audit_row() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_row record;
  v_action text;
  v_resource_id text;
  v_metadata jsonb;
BEGIN
  v_row := COALESCE(NEW, OLD);
  v_action := CASE TG_OP WHEN 'INSERT' THEN 'CREATE' WHEN 'UPDATE' THEN 'UPDATE' ELSE 'DELETE' END;
  v_resource_id := COALESCE((to_jsonb(v_row) ->> 'id'), v_row.tenant_id::text);
  v_metadata := jsonb_build_object(
    'tenantId', v_row.tenant_id::text,
    'operation', TG_OP
  );

  IF TG_TABLE_NAME = 'employee_face_template' THEN
    v_metadata := v_metadata || jsonb_build_object(
      'employeeId', v_row.employee_id::text,
      'status', v_row.status::text,
      'modelId', v_row.model_id,
      'modelVersion', v_row.model_version,
      'embeddingEncrypted', true,
      'kmsKeyIdPresent', NULLIF(v_row.embedding_kms_key_id, '') IS NOT NULL
    );
  ELSIF TG_TABLE_NAME = 'face_match' THEN
    v_metadata := v_metadata || jsonb_build_object(
      'employeeId', v_row.employee_id::text,
      'timeRecordId', v_row.time_record_id::text,
      'score', v_row.score::text,
      'threshold', v_row.threshold::text,
      'livenessPassed', v_row.liveness_passed,
      'decision', v_row.decision::text,
      'deviceIdPresent', NULLIF(v_row.device_id, '') IS NOT NULL
    );
  ELSIF TG_TABLE_NAME = 'face_threshold_config' THEN
    v_metadata := v_metadata || jsonb_build_object(
      'threshold', v_row.threshold::text,
      'livenessRequired', v_row.liveness_required
    );
  ELSIF TG_TABLE_NAME = 'face_consent' THEN
    v_metadata := v_metadata || jsonb_build_object(
      'employeeId', v_row.employee_id::text,
      'consentVersion', v_row.consent_version,
      'withdrawn', v_row.withdrawn_at IS NOT NULL
    );
  END IF;

  PERFORM public.sgp_append_audit_event(
    v_action,
    TG_TABLE_SCHEMA || '.' || TG_TABLE_NAME,
    v_resource_id,
    NULL::uuid,
    NULLIF(current_setting('app.current_user_sub', true), ''),
    NULLIF(current_setting('app.current_login', true), ''),
    TG_TABLE_SCHEMA || '.' || TG_TABLE_NAME,
    NULLIF(current_setting('app.request_id', true), ''),
    v_metadata,
    NULL::text,
    NULL::text,
    NULL::text
  );
  RETURN v_row;
END;
$$;

CREATE FUNCTION ponto.ponto10_face_touch_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
