# CNAB 240 — Bank-Specific Variations

**Type:** Bank integration reference.
**Authority:** Bank layouts + FEBRABAN standard.
**Coverage:** Banco do Brasil, Bradesco, Caixa, Itau, Santander.
**Last validated:** 2026-05-04.

---

## Overview

While all banks use the CNAB 240 standard, each bank implements variations in:

1. **Convenio (agreement code):** Bank-specific payment agreement identifier
2. **Agency agreement (agência mutuante):** Bank-specific agency routing code
3. **Modality (modalidade de crédito):** Payment method/form code (SALARIO, PAGFOR, etc.)
4. **Occurrence codes (retorno):** Bank-specific 3-digit codes for return file statuses
5. **Service form codes:** Bank-specific service type identifiers
6. **Layout versions:** Some banks support multiple CNAB 240 versions

The variations below reflect SGP's current implementation and test fixtures.

---

## 1. Banco do Brasil (Bank Code 001)

| Property              | Value                            |
| --------------------- | -------------------------------- |
| **Bank code**         | `001`                            |
| **Legal name**        | BANCO DO BRASIL S.A.             |
| **SGP convenio**      | `SGPBBPAGAMENTO`                 |
| **Agency agreement**  | `00001`                          |
| **Modality**          | `SALARIO`                        |
| **Layout version**    | CNAB240-FEBRABAN-10.11-BB        |
| **Service form code** | `0401` (salary transfer, MOD=04) |

### Banco do Brasil — Field Specifics

**Remittance (Remessa):**

- Uses standard CNAB 240 Detail A/B structure
- Convenio field (position 26–37 in Batch Header) = `SGPBBPAGAMENTO` (left-aligned, blank-padded to 12 chars)
- Bank/branch routing (Detail B, position 18–27) = BB branch + account routing
- Account format: 12-digit account number with 2-digit check digit
- Modality: "SALARIO" or "PAGAMENTO" depending on payment type

**Return (Retorno):**

- Returns follow same 240-byte structure
- Occurrence code table (Detail A/B position varies by service type):

| Code | Internal Status             | Meaning                                                  |
| ---- | --------------------------- | -------------------------------------------------------- |
| `00` | ACCEPTED                    | Crédito confirmado pelo banco do Brasil                  |
| `AA` | ACCEPTED                    | Arquivo aceito pelo Banco do Brasil                      |
| `BD` | REJECTED_INVALID_ACCOUNT    | Conta do favorecido inválida                             |
| `BE` | REJECTED_INVALID_ACCOUNT    | Agência ou conta inexistente                             |
| `BI` | REJECTED_INSUFFICIENT_FUNDS | Saldo insuficiente para efetivar o pagamento             |
| `RJ` | RETURNED_OTHER              | Pagamento devolvido ou rejeitado por ocorrência bancária |

**Example:** `remessa_001_000001.rem` (Banco do Brasil remittance #1)

---

## 2. Bradesco (Bank Code 237)

| Property              | Value                                   |
| --------------------- | --------------------------------------- |
| **Bank code**         | `237`                                   |
| **Legal name**        | BANCO BRADESCO S.A.                     |
| **SGP convenio**      | `SGPBRADESCO`                           |
| **Agency agreement**  | `00001`                                 |
| **Modality**          | `PAGFOR` (supplier/third-party payment) |
| **Layout version**    | CNAB240-FEBRABAN-10.11-BRADESCO         |
| **Service form code** | `0401` (generic payment, MOD=04)        |

### Bradesco — Field Specifics

**Remittance (Remessa):**

- Convenio field = `SGPBRADESCO` (11 chars, blank-padded)
- Uses Detail A segment code `A`, Detail B segment code `B` (standard)
- Account format: 12-digit account + 1-digit check digit (Bradesco uses single DV)
- Modality: "PAGFOR" preferred for payroll (though "SALARIO" also accepted in some layouts)
- Service form: `0401` (payment modality code 04)

**Return (Retorno):**

- Same occurrence code table as default (shared with Itau, Santander)

| Code | Internal Status             | Meaning                          |
| ---- | --------------------------- | -------------------------------- |
| `00` | ACCEPTED                    | Crédito confirmado pelo banco    |
| `BD` | REJECTED_INVALID_ACCOUNT    | Conta do favorecido inválida     |
| `BE` | REJECTED_INVALID_ACCOUNT    | Agência ou conta inexistente     |
| `BI` | REJECTED_INSUFFICIENT_FUNDS | Saldo insuficiente               |
| `RJ` | RETURNED_OTHER              | Pagamento devolvido ou rejeitado |

**Example:** `remessa_237_000001.rem` (Bradesco remittance #1)

---

## 3. Caixa Econômica (Bank Code 104)

| Property              | Value                             |
| --------------------- | --------------------------------- |
| **Bank code**         | `104`                             |
| **Legal name**        | CAIXA ECONÔMICA FEDERAL           |
| **SGP convenio**      | `SGPCAIXAFOLHA`                   |
| **Agency agreement**  | `00001`                           |
| **Modality**          | `CREDITO` (credit transfer)       |
| **Layout version**    | CNAB240-FEBRABAN-10.11-CAIXA      |
| **Service form code** | `0404` (salary via direct credit) |

### Caixa — Field Specifics

**Remittance (Remessa):**

- Convenio field = `SGPCAIXAFOLHA` (13 chars, blank-padded to 12 max, left-aligned)
- Account format: 13-digit account (Caixa uses longer account numbers)
- Modality: "CREDITO" (differs from salary-focused banks)
- Service form: Often `0404` for payroll (vs. generic `0401`)
- Branch/agency routing: Caixa branches have specific conventions (e.g., `0001`)

**Return (Retorno):**

- Extended occurrence code table (Caixa has bank-specific codes):

| Code | Internal Status             | Meaning                          |
| ---- | --------------------------- | -------------------------------- |
| `00` | ACCEPTED                    | (not used by Caixa; see `01`)    |
| `01` | ACCEPTED                    | Crédito confirmado pela Caixa    |
| `03` | REJECTED_INVALID_ACCOUNT    | Conta inválida na Caixa          |
| `BD` | REJECTED_INVALID_ACCOUNT    | Conta do favorecido inválida     |
| `BE` | REJECTED_INVALID_ACCOUNT    | Agência ou conta inexistente     |
| `BI` | REJECTED_INSUFFICIENT_FUNDS | Saldo insuficiente               |
| `RJ` | RETURNED_OTHER              | Pagamento devolvido ou rejeitado |

**Example:** `remessa_104_000001.rem` (Caixa remittance #1)

---

## 4. Itau (Bank Code 341)

| Property              | Value                                   |
| --------------------- | --------------------------------------- |
| **Bank code**         | `341`                                   |
| **Legal name**        | BANCO ITAU S.A.                         |
| **SGP convenio**      | `SGPITAUPAGFOR`                         |
| **Agency agreement**  | `00001`                                 |
| **Modality**          | `PAGFOR` (supplier/third-party payment) |
| **Layout version**    | CNAB240-FEBRABAN-10.11-ITAU             |
| **Service form code** | `0401`                                  |

### Itau — Field Specifics

**Remittance (Remessa):**

- Convenio field = `SGPITAUPAGFOR` (13 chars)
- Account format: 5-digit branch + 12-digit account + 1-digit check digit (Itau standard)
- Modality: "PAGFOR" (preferred for payroll to third parties)
- Account DV: Itau uses a single check digit (position 69–70 in Detail A)
- Service form: `0401`

**Return (Retorno):**

- Uses default occurrence code table (same as Bradesco, Santander)

| Code | Internal Status             | Meaning                          |
| ---- | --------------------------- | -------------------------------- |
| `00` | ACCEPTED                    | Crédito confirmado pelo banco    |
| `BD` | REJECTED_INVALID_ACCOUNT    | Conta do favorecido inválida     |
| `BE` | REJECTED_INVALID_ACCOUNT    | Agência ou conta inexistente     |
| `BI` | REJECTED_INSUFFICIENT_FUNDS | Saldo insuficiente               |
| `RJ` | RETURNED_OTHER              | Pagamento devolvido ou rejeitado |

**Example:** `remessa_341_000001.rem` (Itau remittance #1)

---

## 5. Santander (Bank Code 033)

| Property              | Value                                  |
| --------------------- | -------------------------------------- |
| **Bank code**         | `033`                                  |
| **Legal name**        | BANCO SANTANDER S.A.                   |
| **SGP convenio**      | `SGPSANTANDER`                         |
| **Agency agreement**  | `00001`                                |
| **Modality**          | `FORNECEDOR` (supplier/vendor payment) |
| **Layout version**    | CNAB240-FEBRABAN-10.11-SANTANDER       |
| **Service form code** | `0401`                                 |

### Santander — Field Specifics

**Remittance (Remessa):**

- Convenio field = `SGPSANTANDER` (12 chars exactly, or blank-padded if shorter)
- Account format: 8-digit branch + 9-digit account + 1-digit check digit (Santander standard)
- Modality: "FORNECEDOR" (vendor payment; also accepts "SALARIO" in some scenarios)
- Service form: `0401`
- Santander has strict field width and padding requirements

**Return (Retorno):**

- Uses default occurrence code table

| Code | Internal Status             | Meaning                          |
| ---- | --------------------------- | -------------------------------- |
| `00` | ACCEPTED                    | Crédito confirmado pelo banco    |
| `BD` | REJECTED_INVALID_ACCOUNT    | Conta do favorecido inválida     |
| `BE` | REJECTED_INVALID_ACCOUNT    | Agência ou conta inexistente     |
| `BI` | REJECTED_INSUFFICIENT_FUNDS | Saldo insuficiente               |
| `RJ` | RETURNED_OTHER              | Pagamento devolvido ou rejeitado |

**Example:** `remessa_033_000001.rem` (Santander remittance #1)

---

## Comparison Table

| Bank                | Code | Convenio       | Modality   | Account Format | Unique Codes?           |
| ------------------- | ---- | -------------- | ---------- | -------------- | ----------------------- |
| **Banco do Brasil** | 001  | SGPBBPAGAMENTO | SALARIO    | 12+2 DV        | AA (Archivo accepted)   |
| **Bradesco**        | 237  | SGPBRADESCO    | PAGFOR     | 12+1 DV        | (default)               |
| **Caixa**           | 104  | SGPCAIXAFOLHA  | CREDITO    | 13 (longer)    | 01, 03 (Caixa-specific) |
| **Itau**            | 341  | SGPITAUPAGFOR  | PAGFOR     | 5+12+1 DV      | (default)               |
| **Santander**       | 033  | SGPSANTANDER   | FORNECEDOR | 8+9+1 DV       | (default)               |

---

## Layout Versions Supported

All SGP implementations use **CNAB 240 V 10.11** (released Aug 2023). Some banks support multiple versions:

- **Banco do Brasil:** V10.09, V10.11, V10.12
- **Bradesco:** V10.09, V10.11
- **Caixa:** V10.11 (primary), V10.09 (legacy)
- **Itau:** V10.11 (primary)
- **Santander:** V10.11 (primary), V10.12

SGP defaults to **V10.11** for all banks. Future versions may be configured per bank via `layout_version` field in `payment_remittance_file` table.

---

## Payment Modality Codes

| Code         | Meaning                      | Used By                   |
| ------------ | ---------------------------- | ------------------------- |
| `SALARIO`    | Salary/payroll               | Banco do Brasil, Bradesco |
| `PAGFOR`     | Supplier/third-party payment | Bradesco, Itau            |
| `CREDITO`    | Direct credit transfer       | Caixa                     |
| `FORNECEDOR` | Vendor/supplier payment      | Santander                 |

---

## Service Form Codes (Detail A, Field "Purpose Code")

| Code         | Meaning                      | SGP Use                          |
| ------------ | ---------------------------- | -------------------------------- |
| `SALARIO`    | Salary payment               | Banco do Brasil                  |
| `PAGFOR`     | Supplier/service payment     | Bradesco, Itau                   |
| `CREDITO`    | Credit transfer              | Caixa                            |
| `FORNECEDOR` | Vendor payment               | Santander                        |
| `PENSAO`     | Alimony (pensão alimenticia) | All banks (for alimony payments) |

---

## How Bank-Specific Variations Are Applied in SGP

**Location:** `backend/src/integrations-worker/cnab240/banks/`

Each bank has a `*.strategy.ts` file that injects its variation:

```typescript
// Example: Banco do Brasil
export const bbStrategy: BankStrategy = {
  bankCode: '001',
  bankName: 'BANCO DO BRASIL',
  layoutVersion: 'CNAB240-FEBRABAN-10.11-BB',
  fields: {
    convenio: 'SGPBBPAGAMENTO',
    agencyAgreement: '00001',
    modality: 'SALARIO',
  },
};
```

The **Cnab240BuilderService** selects the appropriate strategy and applies field values during file generation. Return occurrence codes are mapped in **OccurrenceMapperService** based on bank code.

---

## Adding a New Bank

To add a sixth bank (e.g., Banco da Amazônia, code 003):

1. Create the AMA bank strategy under
   `backend/src/integrations-worker/cnab240/banks/`
2. Define the BankStrategy interface with correct convenio, modality, layoutVersion
3. Add occurrence code mappings to OccurrenceMapperService
4. Create golden fixtures in `tests/backend/golden/cnab240/ama/{input.json, expected.rem}`
5. Update 00-snapshot.md and `docs/gov/evidence/implementation-status.md`

---

## References

- [FEBRABAN Standard](https://portal.febraban.org.br/pagina/3053/33/pt-br/layout-240)
- SGP strategies: `backend/src/integrations-worker/cnab240/banks/*.strategy.ts`
- Occurrence mapper: `backend/src/integrations-worker/cnab240/return/occurrence-mapper.service.ts`
- Test fixtures: `tests/backend/golden/cnab240/` covers BB, Bradesco,
  Caixa, Itau, and Santander remittance examples.
- Bank official layouts:
  - [Banco do Brasil](https://www.bb.com.br/site/pro-seu-negocio/aplicativos-leiautes-de-arquivos/)
  - Bradesco: Internal documentation
  - Caixa: Internal documentation
  - Itau: Internal documentation
  - Santander: Internal documentation
