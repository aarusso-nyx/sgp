CREATE TRIGGER block_generated_payroll_item_change BEFORE INSERT OR DELETE OR UPDATE ON payroll.employee_payroll_item FOR EACH ROW EXECUTE FUNCTION payroll.block_generated_payroll_item_change();

CREATE TRIGGER payment_remittance_detail_audit AFTER INSERT OR DELETE OR UPDATE ON payroll.payment_remittance_detail FOR EACH ROW EXECUTE FUNCTION payroll.sgp_payment_remittance_audit();

CREATE TRIGGER payment_remittance_file_audit AFTER INSERT OR DELETE OR UPDATE ON payroll.payment_remittance_file FOR EACH ROW EXECUTE FUNCTION payroll.sgp_payment_remittance_audit();

CREATE TRIGGER payment_return_detail_audit AFTER INSERT OR DELETE OR UPDATE ON payroll.payment_return_detail FOR EACH ROW EXECUTE FUNCTION payroll.sgp_payment_return_audit();

CREATE TRIGGER payment_return_file_audit AFTER INSERT OR DELETE OR UPDATE ON payroll.payment_return_file FOR EACH ROW EXECUTE FUNCTION payroll.sgp_payment_return_audit();

CREATE TRIGGER trg_compile_formula_expression BEFORE INSERT OR UPDATE OF code, formula_alias, formula_expression ON payroll.payroll_earning_deduction FOR EACH ROW WHEN (((new.formula_expression IS NOT NULL) AND (btrim(new.formula_expression) <> ''::text))) EXECUTE FUNCTION payroll_calc.compile_formula_expression();

CREATE TRIGGER trg_earning_after_delete AFTER DELETE ON payroll.payroll_earning_deduction FOR EACH ROW EXECUTE FUNCTION payroll_calc.on_earning_after_delete();

CREATE TRIGGER trg_earning_before_delete BEFORE DELETE ON payroll.payroll_earning_deduction FOR EACH ROW EXECUTE FUNCTION payroll_calc.on_earning_before_delete();

CREATE TRIGGER trg_earning_before_truncate BEFORE TRUNCATE ON payroll.payroll_earning_deduction FOR EACH STATEMENT EXECUTE FUNCTION payroll_calc.on_earning_before_truncate();

CREATE TRIGGER trg_earning_formula_cache_invalidate AFTER UPDATE ON payroll.payroll_earning_deduction FOR EACH ROW EXECUTE FUNCTION payroll_calc.on_earning_formula_cache_invalidate();

CREATE TRIGGER trg_earning_formula_cache_materialize AFTER INSERT OR UPDATE ON payroll.payroll_earning_deduction FOR EACH ROW EXECUTE FUNCTION payroll_calc.on_earning_formula_cache_materialize();
