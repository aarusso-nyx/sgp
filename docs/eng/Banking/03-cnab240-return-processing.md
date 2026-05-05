# CNAB 240 — Return Processing and Reconciliation

**Type:** Return-file operations reference.
**Authority:** FEBRABAN standard, SGP implementation.
**Last validated:** 2026-05-04.

---

## Return Files Overview

After SGP submits a CNAB 240 remittance file to a bank, the bank processes the payments and returns a **return file (retorno)** with status updates.

**Key differences: Remittance vs. Return**

| Aspect               | Remittance (Remessa)                            | Return (Retorno)                              |
| -------------------- | ----------------------------------------------- | --------------------------------------------- |
| **Direction**        | Company → Bank                                  | Bank → Company                                |
| **Content**          | Payment instructions                            | Status confirmations                          |
| **Record structure** | 240 bytes, same as standard                     | 240 bytes, same as standard                   |
| **Timeline**         | T (submission day)                              | T+1 to T+3 (bank processing)                  |
| **Occurrence codes** | Not used (remittance only carries payment data) | 3-digit codes indicating acceptance/rejection |

---

## Return File Structure

A return file has the **same 240-byte record structure** as a remittance, but:

1. **File Header** and **File Trailer** carry the same metadata (file count, date, company)
2. **Batch Header** and **Batch Trailer** carry aggregate status (counts, sum of amounts)
3. **Detail records** (A and B) carry the **occurrence code** indicating the outcome of each payment

---

## Occurrence Codes — Bank-Specific Status Indicators

Each Detail A or B record in a return file includes an **occurrence code** (3 characters, numeric or alphanumeric) that indicates:

- Whether the payment was accepted and credited
- Why it was rejected or returned (if applicable)
- Bank-specific internal processing status

### Default Occurrence Code Table (All Banks)

| Code | SGP Internal Status         | Meaning                                                  | Action                                                    |
| ---- | --------------------------- | -------------------------------------------------------- | --------------------------------------------------------- |
| `00` | ACCEPTED                    | Crédito confirmado pelo banco                            | Mark payment as PAID                                      |
| `BD` | REJECTED_INVALID_ACCOUNT    | Conta do favorecido inválida                             | Investigate account; retry with corrected data            |
| `BE` | REJECTED_INVALID_ACCOUNT    | Agência ou conta inexistente                             | Account does not exist; require manual review             |
| `BI` | REJECTED_INSUFFICIENT_FUNDS | Saldo insuficiente para efetivar o pagamento             | Insufficient funds in remitter account; retry later       |
| `RJ` | RETURNED_OTHER              | Pagamento devolvido ou rejeitado por ocorrência bancária | Bank rejection reason unknown; investigate return details |

### Bank-Specific Occurrence Codes

**Banco do Brasil (bank code 001):** Adds

| Code | SGP Internal Status | Meaning                             |
| ---- | ------------------- | ----------------------------------- |
| `AA` | ACCEPTED            | Arquivo aceito pelo Banco do Brasil |

**Caixa (bank code 104):** Overrides

| Code | SGP Internal Status      | Meaning                                   |
| ---- | ------------------------ | ----------------------------------------- |
| `01` | ACCEPTED                 | Crédito confirmado pela Caixa (preferred) |
| `03` | REJECTED_INVALID_ACCOUNT | Conta inválida na Caixa                   |

(Caixa uses `01` and `03` instead of `00` and `BD`; SGP's OccurrenceMapperService handles the mapping.)

### Unmapped Occurrence Codes

If SGP receives an occurrence code not in the mapping table, it:

1. Logs the code as unmapped
2. Returns status = RETURNED_OTHER
3. Escalates to manual review (recorded in audit logs)

Example: Code `ZZ` (hypothetical) → RETURNED_OTHER, pending investigation.

---

## SGP Return Processing Flow

```
1. Bank submits return file (retorno_<BANKCODE>_<SEQUENCE>.ret)
2. BankingCnab240ReturnParserService reads file (240-byte records)
3. Parser extracts occurrence codes per Detail record
4. OccurrenceMapperService maps codes to internal statuses
5. BankingCnab240ReturnProcessService updates payment statuses
6. PaymentRemittanceDetail records updated with:
   - occurrence_code (e.g., "00", "BD", "AA")
   - last_internal_status (e.g., "ACCEPTED", "REJECTED_INVALID_ACCOUNT")
   - last_settled_at (timestamp)
7. Notifications sent to HR/Finance (if applicable)
```

---

## Return File Detail Records

The **Detail A and B segments in a return file** carry the occurrence code and reconciliation data.

### Detail A — Segment A in Return File

Same structure as remittance Detail A, but focus is on:

| Position | Length | Field               | Remittance         | Return                                  |
| -------- | ------ | ------------------- | ------------------ | --------------------------------------- |
| 109–123  | 15     | Actual debit amount | What SGP requested | What bank actually debited              |
| 139–152  | 14     | Occurrence code     | (not used)         | **Bank status code (e.g., "00", "BD")** |
| 153–161  | 9      | Credit date         | Settlement target  | Bank's actual credit date               |

### Detail B — Segment B in Return File

Same structure as remittance Detail B, but:

| Position | Length | Field               | Remittance       | Return                                                     |
| -------- | ------ | ------------------- | ---------------- | ---------------------------------------------------------- |
| 81–93    | 13     | Days notice         | 0 (unused)       | Occurrence code / reason code (bank-specific)              |
| 124–138  | 15     | Actual debit amount | Requested amount | **Actual debited amount** (may differ if partial/adjusted) |

---

## Reconciliation Logic in SGP

### Match Criteria

SGP matches a return Detail record to a sent remittance Detail record by:

1. **Sequence number** (Detail A/B position 7–13): Must match exactly
2. **Beneficiary account** (Detail B positions 23–48): Must match bank + branch + account
3. **Amount** (Detail B position 124–138): Should match (±tolerance for rounding, interest, discounts)

### Status Updates

Once matched, SGP updates the payment record:

```typescript
// Example: payment_remittance_detail
{
  file_id: "REM-2026-04-001",
  sequence: 1,
  employee_id: "EMP-12345",
  amount: "825.04",  // Requested
  occurrence_code: "00",  // From return
  last_internal_status: "ACCEPTED",
  last_settled_at: "2026-04-26T10:30:00Z"
}
```

### Partial Payments & Adjustments

If a bank credits a different amount than requested:

- **Amount debited** < **Amount requested:** Partial acceptance; last_internal_status = PARTIAL
- **Amount debited** > **Amount requested:** Bank added interest/adjustments; last_internal_status = ACCEPTED (with note)
- **Occurrence code = rejection:** No debit; last*internal_status = REJECTED*\*

---

## Return File Parsing

**Location:** `backend/src/integrations-worker/cnab240/return/cnab240-return-parser.service.ts`

The parser:

1. **Reads 240-byte records** from the return file
2. **Identifies record types** (0, 1, 3, 5, 9)
3. **Extracts occurrence codes** from Detail A/B segments (position varies by bank)
4. **Builds ParsedCnab240Return** structure:

```typescript
{
  fileHeader: { bankCode, companyRegistration, ... },
  batchHeader: { ... },
  details: [
    {
      sequence: 1,
      employeeId: "EMP-12345",
      occurrenceCode: "00",  // <-- Key field
      actualAmount: "825.04",
      creditDate: "2026-04-26"
    },
    ...
  ],
  batchTrailer: { recordCount, totalAmount, ... },
  fileTrailer: { ... }
}
```

---

## Occurrence Code Extraction by Bank

Different banks place occurrence codes in different field positions. SGP's parser and OccurrenceMapperService handle the variation:

| Bank                | Position in Detail    | Field Name                      | Example      |
| ------------------- | --------------------- | ------------------------------- | ------------ |
| **Banco do Brasil** | Detail A, pos 139–142 | Occurrence field                | `00` or `AA` |
| **Bradesco**        | Detail A, pos 139–142 | Occurrence field                | `00` or `BD` |
| **Caixa**           | Detail A, pos 139–142 | Occurrence field (Caixa-mapped) | `01` or `03` |
| **Itau**            | Detail A, pos 139–142 | Occurrence field                | `00` or `BD` |
| **Santander**       | Detail A, pos 139–142 | Occurrence field                | `00` or `RJ` |

---

## Known Return Delays and Timelines

**Standard processing (T = submission day):**

| Bank                | Return Timing           | Notes                                 |
| ------------------- | ----------------------- | ------------------------------------- |
| **Banco do Brasil** | T+1 (next business day) | Often same-day for salary transfers   |
| **Bradesco**        | T+1 to T+2              | Depends on batch size and time of day |
| **Caixa**           | T+1 to T+2              | May delay if processing issues        |
| **Itau**            | T+1                     | Usually reliable next-day return      |
| **Santander**       | T+2 to T+3              | Slower than other banks               |

**Deferred/Held Returns:** If a bank encounters validation errors, it may hold the return for manual review (T+3 to T+5).

---

## Common Return Scenarios

### Scenario 1: Full Acceptance (Occurrence `00`)

```
Remittance: EMPLOYEE-001, account 001-12345, amount 825.04
Return: occurrence_code="00", amount=825.04, creditDate="2026-04-26"
Outcome: last_internal_status="ACCEPTED", payment marked as PAID
```

### Scenario 2: Account Does Not Exist (Occurrence `BE`)

```
Remittance: EMPLOYEE-002, account 002-99999, amount 1500.00
Return: occurrence_code="BE", amount=0, creditDate="0000-00-00"
Outcome: last_internal_status="REJECTED_INVALID_ACCOUNT"
Action: HR to verify correct account number; resubmit in next batch
```

### Scenario 3: Insufficient Funds (Occurrence `BI`)

```
Remittance: 10 payments, total 10,000.00
Return: 1 payment with occurrence_code="BI", amount=0
Outcome: last_internal_status="REJECTED_INSUFFICIENT_FUNDS"
Action: Retry when account balance is replenished
```

### Scenario 4: Bank Rejection (Occurrence `RJ`)

```
Remittance: EMPLOYEE-004, valid account, amount 500.00
Return: occurrence_code="RJ" (generic rejection)
Outcome: last_internal_status="RETURNED_OTHER"
Action: Contact bank to investigate reason; may be duplicate, frozen account, etc.
```

---

## Reconciliation Troubleshooting

### Missing Return Record

If SGP sent a Detail A/B pair but the return contains no matching sequence:

- **Likely cause:** Bank batched the payment but hasn't returned yet (within T+1 to T+3 window)
- **Action:** Wait; re-query bank return file in 2–4 hours

### Amount Mismatch (Debited ≠ Requested)

If actual_amount ≠ request_amount:

- **Check 1:** Is the occurrence_code `00` (accepted) or `RJ` (partial)?
- **Check 2:** Did the bank apply fees, discounts, or rounding?
- **Check 3:** Is the difference ≤ 0.05 BRL (acceptable rounding tolerance)?

If differences exceed tolerance:

- Contact bank and request detailed return explanation
- Review payment instruction for typos (account number, amount)

### Unmapped Occurrence Code

If an occurrence code is not in the table:

- SGP logs: `Unsupported CNAB return occurrence {code} for bank {bankCode}`
- Status marked: RETURNED_OTHER
- Action: File a ticket with the bank to add the code to SGP's mapping

---

## Return File Example

**File:** `retorno_001_000001.ret` (Banco do Brasil return for remittance #1)

**Contents:** Same structure as remittance, but Detail A records carry occurrence codes in position 139–142.

```
[File Header: 240 bytes]
[Batch Header: 240 bytes]
[Detail A: sequence 1, occurrence "00": 240 bytes]
[Detail B: sequence 2, account details: 240 bytes]
[Detail A: sequence 3, occurrence "BD": 240 bytes]
[Detail B: sequence 4, account details: 240 bytes]
[Batch Trailer: 240 bytes]
[File Trailer: 240 bytes]
```

---

## Database Recording

**Table:** `payroll.payment_remittance_detail`

After parsing and reconciliation:

```sql
UPDATE payroll.payment_remittance_detail
SET
  occurrence_code = '00',
  last_internal_status = 'ACCEPTED',
  last_settled_at = NOW()
WHERE file_id = 'REM-2026-04-001' AND sequence = 1;
```

---

## References

- SGP return parser: `backend/src/integrations-worker/cnab240/return/cnab240-return-parser.service.ts`
- SGP occurrence mapper: `backend/src/integrations-worker/cnab240/return/occurrence-mapper.service.ts`
- SGP return processor: `backend/src/integrations-worker/cnab240/return/cnab240-return-process.service.ts`
- Return test fixtures: `tests/backend/golden/cnab240/return/` covers BB,
  Bradesco, Caixa, Itau, and Santander examples.
- [FEBRABAN Return Standard](https://cmsarquivos.febraban.org.br/Arquivos/documentos/PDF/Layout%20padrao%20CNAB240%20V%2010%2011%20-%2021_08_2023.pdf)
