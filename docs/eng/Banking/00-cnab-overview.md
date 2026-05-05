# CNAB 240 — Overview

**Type:** Banking standard reference.
**Authority:** FEBRABAN (Federação Brasileira de Bancos).
**Latest version:** CNAB 240 V 10.11 (updated Aug 2023).

---

## What is CNAB 240?

**CNAB** = **C**entro de **N**ormalização e **A**rbitagem (Clearing and Settlement Center).

CNAB 240 is the **standard file format for electronic bank-to-company and company-to-bank file exchange** in Brazil, maintained by FEBRABAN. It defines a fixed-record structure (240 bytes per line, ASCII) for transmitting payment instructions, fund transfers, and settlement notifications.

The "240" refers to the record width: each logical record is exactly 240 bytes, padded with blanks (alphanumeric fields, left-aligned) or zeros (numeric fields, right-aligned).

---

## Use Cases in SGP

CNAB 240 is used for:

1. **Payroll remittances (salários)** — Salary payments to employees via bank accounts
2. **FGTS deposits** — Severance Indemnity Fund for Employees (Fundo de Garantia do Tempo de Serviço)
3. **GPS contributions** — Guia de Previdência Social (social security contributions)
4. **Alimony payments (pensão alimenticia)** — Court-ordered alimony transfers
5. **Fiscal remittances** — Tax and regulatory payments

Return files (retorno) follow the same 240-byte structure but carry bank responses: acceptance confirmations, rejection codes, and settlement notifications.

---

## Structure Overview

A CNAB 240 file contains:

```
[File Header]           ← 1 record, identifies file and company
  [Batch Header]        ← 1 record per batch, identifies payment service/product
    [Detail A]          ← 1 record per payment, payer/beneficiary info
    [Detail B]          ← 1 record per payment, account and amount details
  [Batch Trailer]       ← 1 record per batch, totals and counts
[File Trailer]          ← 1 record, file-level totals
```

**Total records per single-batch payroll:** 2 (headers) + (N payments × 2 details) + 2 (trailers) = 2N + 4 records.

---

## Key Technical Facts

| Property            | Value                                                                    |
| ------------------- | ------------------------------------------------------------------------ |
| Record width        | 240 bytes                                                                |
| Format              | ASCII (7-bit), fixed-width                                               |
| Field alignment     | Alphanumeric: left + blanks; Numeric: right + zeros                      |
| Segments per detail | 2 (A and B), up to 4 per service type                                    |
| Batch numbering     | Header/Trailer use 0000/9999; data batches 0001–9998                     |
| Layout versions     | Multiple (V10.09, V10.11, V10.12, etc.)                                  |
| Bank variants       | Yes — each bank may define modalities, occurrence codes, optional fields |

---

## Regulatory Context

- **BACEN** (Banco Central do Brasil) recognizes CNAB 240 as the standard for batch-based clearing
- **SPB** (Sistema de Pagamentos Brasileiro) incorporates CNAB for file-based workflows
- **CIP** (Câmara Interbancária de Pagamentos) maintains related standards for instant payments (Pix)

CNAB 240 is NOT used for instant payments (Pix); it remains the standard for scheduled batch transfers (next-day settlement and beyond).

---

## Alternative Formats

| Format    | Bytes/Record | Use                           | Status in SGP      |
| --------- | ------------ | ----------------------------- | ------------------ |
| CNAB 400  | 400          | Legacy payroll, older systems | Not implemented    |
| CNAB 240  | 240          | Current standard, all banks   | **✅ Implemented** |
| Pix       | N/A (API)    | Instant payment (future)      | Deferred           |
| ACH (XML) | Variable     | International clearing        | Not applicable     |

---

## SGP Implementation

**Location:** `backend/src/integrations-worker/cnab240/`

- **Cnab240BuilderService** — Generates CNAB 240 remittance files
- **Cnab240EmitService** — Coordinates emission from payroll runs
- **Cnab240ReturnParserService** — Parses bank return files
- **BankStrategy** interface — Bank-specific modalities, occurrence codes, layouts
- **5 supported banks:** Banco do Brasil (001), Bradesco (237), Caixa (104), Itau (341), Santander (033)

**Golden fixtures:** `tests/backend/golden/cnab240/` covers BB, Bradesco,
Caixa, Itau, and Santander remittance examples.

---

## References

- [FEBRABAN Layout CNAB 240 — Official standard](https://portal.febraban.org.br/pagina/3053/33/pt-br/layout-240)
- [FEBRABAN CNAB 240 V 10.11 PDF](https://cmsarquivos.febraban.org.br/Arquivos/documentos/PDF/Layout%20padrao%20CNAB240%20V%2010%2011%20-%2021_08_2023.pdf)
- [TecnoSpeed CNAB 240 Explained](https://blog.tecnospeed.com.br/cnab-240/)
- Banco do Brasil: [Leiautes de arquivos](https://www.bb.com.br/site/pro-seu-negocio/aplicativos-leiautes-de-arquivos/)
