-- Seed/reference-data parity checks for the deterministic bootstrap dataset.
DO $$
DECLARE
  rec record;
  actual_count bigint;
BEGIN
  FOR rec IN
    SELECT *
    FROM (
      VALUES
        ('agencia', 1),
        ('atividade', 1),
        ('banco', 1),
        ('cargo', 1),
        ('cargo_atividade', 1),
        ('cargo_verba', 2),
        ('cargo_vinculo', 1),
        ('categoria_profissional', 1),
        ('cbo', 1),
        ('centro_custo', 2),
        ('cnae', 1),
        ('codigo_pagamento_gps', 2),
        ('conta_contabil', 2),
        ('empresa_filial', 3),
        ('funcao', 1),
        ('grupo_salarial', 1),
        ('menu', 99),
        ('municipio', 1),
        ('natureza_funcao', 1),
        ('papel', 1),
        ('processo_funcao', 1),
        ('referencia_salarial', 3),
        ('tipo_folha', 1),
        ('tipo_processamento', 1),
        ('turno', 1),
        ('unidade_federativa', 1),
        ('verba', 11),
        ('verba_formula', 11),
        ('vinculo', 1)
    ) AS t(table_name, expected_count)
  LOOP
    EXECUTE format('SELECT count(*) FROM dbo.%I', rec.table_name) INTO actual_count;
    IF actual_count <> rec.expected_count THEN
      RAISE EXCEPTION 'Seed smoke failure: expected % rows in dbo.%, found %', rec.expected_count, rec.table_name, actual_count;
    END IF;
  END LOOP;
END
$$;
