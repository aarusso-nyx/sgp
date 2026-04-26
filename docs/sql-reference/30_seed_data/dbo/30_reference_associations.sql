-- Generated from sql/00_inventory/seed_rows on 2026-04-21.
-- Source database inventoried: rhlinkcon (requested name was rhlinkcom).

-- Association/reference bridge seed data

-- dbo.cargo_atividade (1 row)
INSERT INTO dbo.cargo_atividade (cargo_id, atividade_id)
VALUES
  (1, 1);

-- dbo.cargo_verba (2 rows)
INSERT INTO dbo.cargo_verba (cargo_id, verba_id)
VALUES
  (1, 1),
  (1, 8);

-- dbo.cargo_vinculo (1 row)
INSERT INTO dbo.cargo_vinculo (cargo_id, vinculo_id)
VALUES
  (1, 1);
