CREATE TRIGGER audit_event_immutable BEFORE DELETE OR UPDATE ON public.audit_event FOR EACH ROW EXECUTE FUNCTION public.sgp_audit_event_immutable();

CREATE TRIGGER trg_generated_report_file_audit AFTER INSERT OR DELETE OR UPDATE ON public.generated_report_file FOR EACH ROW EXECUTE FUNCTION public.audit_report_file_mutation();

CREATE TRIGGER trg_payslip_batch_audit AFTER INSERT OR DELETE OR UPDATE ON public.payslip_batch FOR EACH ROW EXECUTE FUNCTION public.audit_payslip_batch_mutation();
