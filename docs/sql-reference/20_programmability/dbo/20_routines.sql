-- PostgreSQL programmability translation for schema dbo.
-- Inventory found eight SQL Server routines, all belonging to the non-business
-- sysdiagrams support feature set. Under the frozen canonical rules these
-- routines are not implemented in PostgreSQL unless application-critical usage
-- is proven. See 90_programmability_gap_report.md for the explicit gap record.

DO $$
BEGIN
    RAISE NOTICE 'No PostgreSQL routines were created for schema dbo. Source routines were limited to the SQL Server sysdiagrams support set and were intentionally omitted under the frozen migration rules; see sql/20_programmability/dbo/90_programmability_gap_report.md.';
END
$$;
