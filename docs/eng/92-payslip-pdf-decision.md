# ADR 92 — Contracheque oficial PDF/A-1b

**Status:** implemented
**Data:** 2026-05-02

## Decisão

O contracheque oficial passa a ser gerado em `backend/src/report-service/payslip/` com `pdf-lib`. A biblioteca foi escolhida para este slice porque evita o footprint operacional de navegador headless, tem licença MIT, roda no runtime NestJS existente e produz um PDF binário real com metadados estáveis suficientes para a validação PDF/A-1b do pipeline interno.

## Consequências

- `puppeteer` permanece fora do runtime público deste slice.
- O hash SHA-256 do PDF é persistido em `public.generated_report_file.file_hash`.
- `public.generated_report_file` registra `report_kind = PAYSLIP`, `pdf_a_compliance = PDF_A_1B`, `signature_kind`, competência, servidor, folha e retenção.
- O PDF/A renderizado é assinado pelo `PadesAdapter` antes do cálculo do hash e da persistência do arquivo gerado; o registro usa `signature_kind = ICP_BRASIL_A1` e `signed_at` na competência do contracheque.
- A validação automatizada do slice verifica cabeçalho binário `%PDF-`, metadados, fontes, bloco `%%SGP-PADES-SIGNATURE`, golden PDF byte-estável e persistência do hash; validação externa veraPDF pode ser adicionada ao gate de release quando disponível no ambiente.
