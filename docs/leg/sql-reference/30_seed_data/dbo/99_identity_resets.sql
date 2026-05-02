-- Align identity sequences with explicitly inserted seed values.

SELECT setval(pg_get_serial_sequence('dbo.agencia', 'id'),
              COALESCE((SELECT MAX(id) FROM dbo.agencia), 1),
              true);

SELECT setval(pg_get_serial_sequence('dbo.atividade', 'id'),
              COALESCE((SELECT MAX(id) FROM dbo.atividade), 1),
              true);

SELECT setval(pg_get_serial_sequence('dbo.banco', 'id'),
              COALESCE((SELECT MAX(id) FROM dbo.banco), 1),
              true);

SELECT setval(pg_get_serial_sequence('dbo.cargo', 'id'),
              COALESCE((SELECT MAX(id) FROM dbo.cargo), 1),
              true);

SELECT setval(pg_get_serial_sequence('dbo.categoria_profissional', 'id'),
              COALESCE((SELECT MAX(id) FROM dbo.categoria_profissional), 1),
              true);

SELECT setval(pg_get_serial_sequence('dbo.cbo', 'id'),
              COALESCE((SELECT MAX(id) FROM dbo.cbo), 1),
              true);

SELECT setval(pg_get_serial_sequence('dbo.centro_custo', 'id'),
              COALESCE((SELECT MAX(id) FROM dbo.centro_custo), 1),
              true);

SELECT setval(pg_get_serial_sequence('dbo.cnae', 'id'),
              COALESCE((SELECT MAX(id) FROM dbo.cnae), 1),
              true);

SELECT setval(pg_get_serial_sequence('dbo.codigo_pagamento_gps', 'id'),
              COALESCE((SELECT MAX(id) FROM dbo.codigo_pagamento_gps), 1),
              true);

SELECT setval(pg_get_serial_sequence('dbo.conta_contabil', 'id'),
              COALESCE((SELECT MAX(id) FROM dbo.conta_contabil), 1),
              true);

SELECT setval(pg_get_serial_sequence('dbo.empresa_filial', 'id'),
              COALESCE((SELECT MAX(id) FROM dbo.empresa_filial), 1),
              true);

SELECT setval(pg_get_serial_sequence('dbo.funcao', 'id'),
              COALESCE((SELECT MAX(id) FROM dbo.funcao), 1),
              true);

SELECT setval(pg_get_serial_sequence('dbo.grupo_salarial', 'id'),
              COALESCE((SELECT MAX(id) FROM dbo.grupo_salarial), 1),
              true);

SELECT setval(pg_get_serial_sequence('dbo.menu', 'id'),
              COALESCE((SELECT MAX(id) FROM dbo.menu), 1),
              true);

SELECT setval(pg_get_serial_sequence('dbo.municipio', 'id'),
              COALESCE((SELECT MAX(id) FROM dbo.municipio), 1),
              true);

SELECT setval(pg_get_serial_sequence('dbo.natureza_funcao', 'id'),
              COALESCE((SELECT MAX(id) FROM dbo.natureza_funcao), 1),
              true);

SELECT setval(pg_get_serial_sequence('dbo.papel', 'id'),
              COALESCE((SELECT MAX(id) FROM dbo.papel), 1),
              true);

SELECT setval(pg_get_serial_sequence('dbo.processo_funcao', 'id'),
              COALESCE((SELECT MAX(id) FROM dbo.processo_funcao), 1),
              true);

SELECT setval(pg_get_serial_sequence('dbo.referencia_salarial', 'id'),
              COALESCE((SELECT MAX(id) FROM dbo.referencia_salarial), 1),
              true);

SELECT setval(pg_get_serial_sequence('dbo.tipo_folha', 'id'),
              COALESCE((SELECT MAX(id) FROM dbo.tipo_folha), 1),
              true);

SELECT setval(pg_get_serial_sequence('dbo.tipo_processamento', 'id'),
              COALESCE((SELECT MAX(id) FROM dbo.tipo_processamento), 1),
              true);

SELECT setval(pg_get_serial_sequence('dbo.turno', 'id'),
              COALESCE((SELECT MAX(id) FROM dbo.turno), 1),
              true);

SELECT setval(pg_get_serial_sequence('dbo.unidade_federativa', 'id'),
              COALESCE((SELECT MAX(id) FROM dbo.unidade_federativa), 1),
              true);

SELECT setval(pg_get_serial_sequence('dbo.verba', 'id'),
              COALESCE((SELECT MAX(id) FROM dbo.verba), 1),
              true);

SELECT setval(pg_get_serial_sequence('dbo.verba_formula', 'id'),
              COALESCE((SELECT MAX(id) FROM dbo.verba_formula), 1),
              true);

SELECT setval(pg_get_serial_sequence('dbo.vinculo', 'id'),
              COALESCE((SELECT MAX(id) FROM dbo.vinculo), 1),
              true);
