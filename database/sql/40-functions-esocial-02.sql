CREATE FUNCTION esocial.trg_employee_dependent_s2205_pending() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  row_after hr.employee_dependent;
  row_before hr.employee_dependent;
BEGIN
  row_after := NEW;
  row_before := OLD;
  PERFORM esocial.enqueue_s2205_pending_alteration(
    COALESCE(row_after.tenant_id, row_before.tenant_id),
    COALESCE(row_after.employee_id, row_before.employee_id),
    'dependent.*',
    'hr.employee_dependent',
    COALESCE(row_after.id, row_before.id),
    CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(row_before) END,
    CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(row_after) END
  );
  RETURN COALESCE(NEW, OLD);
END
$$;

CREATE FUNCTION esocial.trg_employee_s2205_pending() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  old_zip text;
  new_zip text;
  old_street text;
  new_street text;
BEGIN
  old_zip := COALESCE(OLD.address->>'zip', OLD.address->>'cep');
  new_zip := COALESCE(NEW.address->>'zip', NEW.address->>'cep');
  old_street := COALESCE(OLD.address->>'street', OLD.address->>'dscLograd');
  new_street := COALESCE(NEW.address->>'street', NEW.address->>'dscLograd');

  IF old_zip IS DISTINCT FROM new_zip THEN
    PERFORM esocial.enqueue_s2205_pending_alteration(
      NEW.tenant_id, NEW.id, 'address.zip', 'hr.employee', NEW.id,
      jsonb_build_object('zip', old_zip),
      jsonb_build_object('zip', new_zip)
    );
  END IF;
  IF old_street IS DISTINCT FROM new_street THEN
    PERFORM esocial.enqueue_s2205_pending_alteration(
      NEW.tenant_id, NEW.id, 'address.street', 'hr.employee', NEW.id,
      jsonb_build_object('street', old_street),
      jsonb_build_object('street', new_street)
    );
  END IF;
  IF OLD.email IS DISTINCT FROM NEW.email THEN
    PERFORM esocial.enqueue_s2205_pending_alteration(
      NEW.tenant_id, NEW.id, 'contact.email', 'hr.employee', NEW.id,
      jsonb_build_object('email', OLD.email),
      jsonb_build_object('email', NEW.email)
    );
  END IF;
  IF OLD.phone IS DISTINCT FROM NEW.phone THEN
    PERFORM esocial.enqueue_s2205_pending_alteration(
      NEW.tenant_id, NEW.id, 'contact.phone', 'hr.employee', NEW.id,
      jsonb_build_object('phone', OLD.phone),
      jsonb_build_object('phone', NEW.phone)
    );
  END IF;
  IF OLD.marital_status IS DISTINCT FROM NEW.marital_status THEN
    PERFORM esocial.enqueue_s2205_pending_alteration(
      NEW.tenant_id, NEW.id, 'marital_status', 'hr.employee', NEW.id,
      jsonb_build_object('maritalStatus', OLD.marital_status),
      jsonb_build_object('maritalStatus', NEW.marital_status)
    );
  END IF;
  IF OLD.education_level IS DISTINCT FROM NEW.education_level THEN
    PERFORM esocial.enqueue_s2205_pending_alteration(
      NEW.tenant_id, NEW.id, 'education_level', 'hr.employee', NEW.id,
      jsonb_build_object('educationLevel', OLD.education_level),
      jsonb_build_object('educationLevel', NEW.education_level)
    );
  END IF;

  RETURN NEW;
END
$$;
