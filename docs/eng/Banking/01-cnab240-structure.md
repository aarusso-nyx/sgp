# CNAB 240 — Record Structure and Field Definitions

**Type:** Technical reference.
**Authority:** FEBRABAN standard, SGP implementation.
**Last validated:** 2026-05-04.

---

## Record Structure Overview

Each CNAB 240 file consists of 240-byte ASCII records in the following sequence:

```
FILE HEADER (0)     — File identification, date, company, counts
BATCH HEADER (1)    — Batch service type, payment form, dates
DETAIL A (3)        — Payer/beneficiary identification, document, names
DETAIL B (3)        — Account, branch, routing, amount, dates
[repeat DETAIL A+B for each payment]
BATCH TRAILER (5)   — Record count, amount total per batch
FILE TRAILER (9)    — File-level record count, batch count
```

**Record type code** (position 1, 1 byte):

- `0` = File Header
- `1` = Batch Header
- `3` = Detail (followed by segment code in position 14)
- `5` = Batch Trailer
- `9` = File Trailer

**Segment code** (detail records only, position 14, 1 byte):

- `A` = Detail A (account owner and beneficiary)
- `B` = Detail B (bank account and payment details)
- `J`, `O`, etc. — Other segments for specialized services (not used in SGP payroll)

---

## File Header (Record Type 0)

Identifies the file, company, and transmission date.

| Position | Length | Format       | Field                | Example           | Notes                                        |
| -------- | ------ | ------------ | -------------------- | ----------------- | -------------------------------------------- |
| 1        | 1      | Numeric      | Record type          | `0`               | Always 0                                     |
| 2–8      | 7      | Numeric      | Reserved             | `0000000`         | Fill with zeros                              |
| 9–11     | 3      | Numeric      | Bank code            | `001`             | Banco do Brasil                              |
| 12–20    | 9      | Numeric      | Lot number           | `000000000`       | Use 0000 for file header                     |
| 21       | 1      | Numeric      | Record type 2        | `0`               | Always 0                                     |
| 22–29    | 8      | Alphanumeric | Reserved             | ` ` (blanks)      | Fill with spaces                             |
| 30–37    | 8      | Numeric      | Company registration | `12345678`        | CNPJ without separators                      |
| 38–57    | 20     | Alphanumeric | Company name         | `MUNICIPIO TESTE` | Left-aligned, blank-padded                   |
| 58–71    | 14     | Numeric      | Bank name            | `BANCO DO BRASIL` | (some use spaces, see bank-specific)         |
| 72–75    | 4      | Numeric      | Year/month (YYMMDD)  | `2604`            | Transmission date (YY=26, MM=04)             |
| 76–79    | 4      | Numeric      | Time (HHMMSS)        | `2026`            | Transmission time                            |
| 80–87    | 8      | Numeric      | File number/sequence | `12345678`        | Remittance number with padding               |
| 88–94    | 7      | Numeric      | Record count         | `0000102`         | Total records in file (filled on completion) |
| 95–101   | 7      | Numeric      | Reserved             | `0000000`         | Future use                                   |
| 102–105  | 4      | Alphanumeric | Currency code        | ` ` (blanks)      | Usually blank for BRL                        |
| 106–240  | 135    | Alphanumeric | Reserved             | ` ` (blanks)      | Fill with spaces                             |

---

## Batch Header (Record Type 1)

Identifies the service/product type and payment form within this batch.

| Position | Length | Format       | Field                 | Example           | Notes                                |
| -------- | ------ | ------------ | --------------------- | ----------------- | ------------------------------------ |
| 1        | 1      | Numeric      | Record type           | `1`               | Always 1                             |
| 2        | 1      | Numeric      | Lot number            | `0`               | Batch number (001–999)               |
| 3–8      | 6      | Numeric      | Lot number (expanded) | `000001`          | Batch 1 = 000001                     |
| 9        | 1      | Numeric      | Record type 2         | `1`               | Always 1                             |
| 10–13    | 4      | Alphanumeric | Service type code     | `C001`            | C=Cobrança; varies by bank           |
| 14       | 1      | Numeric      | Service form          | `0`               | Remittance type (04=salary transfer) |
| 15–16    | 2      | Numeric      | Layout version        | `10`              | CNAB 240 version (10 or 11)          |
| 17       | 1      | Numeric      | Reserved              | `0`               | Fill with 0                          |
| 18–25    | 8      | Numeric      | Company registration  | `12345678`        | CNPJ                                 |
| 26–37    | 12     | Alphanumeric | Company bank code     | `000000`          | Bank agreement code (convenio)       |
| 38–57    | 20     | Alphanumeric | Company name          | `MUNICIPIO TESTE` | Left-aligned, blank-padded           |
| 58–73    | 16     | Alphanumeric | Bank name             | `BANCO DO BRASIL` | Left-aligned, blank-padded           |
| 74–81    | 8      | Numeric      | Generation date       | `26042026`        | DDMMYYYY format                      |
| 82–89    | 8      | Numeric      | Generation time       | `12345600`        | HHMMSSNN (NN = hundredths of second) |
| 90–95    | 6      | Numeric      | File number           | `000001`          | Sequence number                      |
| 96–100   | 5      | Numeric      | Max records           | `99999`           | Max allowed records (future)         |
| 101–106  | 6      | Numeric      | Density               | `000000`          | Density code (unused)                |
| 107–113  | 7      | Numeric      | Nature of service     | `0000001`         | Service type in numeric form         |
| 114–119  | 6      | Numeric      | Experimentation flag  | `000000`          | 0=Production, 1=Test (rarely used)   |
| 120–240  | 121    | Alphanumeric | Reserved              | ` ` (blanks)      | Fill with spaces                     |

---

## Detail A — Segment A (Record Type 3, Segment A)

Account owner and beneficiary identification.

| Position | Length | Format       | Field                         | Example                 | Notes                                           |
| -------- | ------ | ------------ | ----------------------------- | ----------------------- | ----------------------------------------------- |
| 1        | 1      | Numeric      | Record type                   | `3`                     | Always 3 (detail)                               |
| 2–5      | 4      | Numeric      | Lot number                    | `0001`                  | Batch 1                                         |
| 6        | 1      | Numeric      | Record type 2                 | `3`                     | Always 3                                        |
| 7–13     | 7      | Numeric      | Sequence                      | `0000001`               | Detail line number (1, 3, 5, ... for A records) |
| 14       | 1      | Alphanumeric | Segment code                  | `A`                     | Always A                                        |
| 15       | 1      | Numeric      | Movement type                 | `0`                     | 0=Normal entry, 2=Cancellation                  |
| 16–18    | 3      | Numeric      | Movement code                 | `010`                   | Specific to service type                        |
| 19–32    | 14     | Numeric      | Bank account origin           | `00000001234567`        | Payer (remitter) bank account                   |
| 33–37    | 5      | Alphanumeric | DV (digit verificador)        | `00000`                 | Account verification digits                     |
| 38–42    | 5      | Numeric      | Bank (beneficiary)            | `00001`                 | Beneficiary bank code                           |
| 43–47    | 5      | Numeric      | Bank branch                   | `00001`                 | Beneficiary branch code                         |
| 48–68    | 21     | Alphanumeric | Beneficiary account           | `000000000000000000000` | Beneficiary account number                      |
| 69–70    | 2      | Alphanumeric | Account DV                    | `00`                    | Account verification digit                      |
| 71–100   | 30     | Alphanumeric | Beneficiary name              | `SERVIDOR 01`           | Name (left-aligned, blank-padded)               |
| 101–143  | 43     | Alphanumeric | Document number (beneficiary) | `12345000000`           | CPF/CNPJ of beneficiary                         |
| 144–151  | 8      | Numeric      | Due date                      | `25042026`              | Payment date (DDMMYYYY)                         |
| 152–166  | 15     | Numeric      | Nominal value                 | `000000000000825`       | Amount × 100 (825.04 BRL = 082504)              |
| 167–181  | 15     | Numeric      | Real value                    | `000000000000000`       | Usually zeros (overrides nominal if filled)     |
| 182–191  | 10     | Numeric      | Document number (remitter)    | `0000000000`            | CPF/CNPJ of remitter                            |
| 192      | 1      | Numeric      | Document type (beneficiary)   | `1`                     | 1=CPF, 2=CNPJ                                   |
| 193–210  | 18     | Alphanumeric | Reference number              | `SALARIO`               | User-defined reference                          |
| 211–220  | 10     | Alphanumeric | Purpose code                  | `SALARIO`               | Payment purpose (salary, etc.)                  |
| 221–230  | 10     | Numeric      | Due date (return)             | `0000000000`            | Optional return date (usually zeros)            |
| 231–240  | 10     | Numeric      | Reserved                      | `0000000000`            | Fill with zeros                                 |

---

## Detail B — Segment B (Record Type 3, Segment B)

Bank account and payment amount details.

| Position | Length | Format       | Field                          | Example                 | Notes                                                   |
| -------- | ------ | ------------ | ------------------------------ | ----------------------- | ------------------------------------------------------- |
| 1        | 1      | Numeric      | Record type                    | `3`                     | Always 3 (detail)                                       |
| 2–5      | 4      | Numeric      | Lot number                     | `0001`                  | Batch 1                                                 |
| 6        | 1      | Numeric      | Record type 2                  | `3`                     | Always 3                                                |
| 7–13     | 7      | Numeric      | Sequence                       | `0000002`               | Detail line number (2, 4, 6, ... for B records)         |
| 14       | 1      | Alphanumeric | Segment code                   | `B`                     | Always B                                                |
| 15–17    | 3      | Numeric      | Code                           | `000`                   | Specific to movement type                               |
| 18–22    | 5      | Numeric      | Bank code (beneficiary)        | `00341`                 | Bank code (341 = Itau, 237 = Bradesco, etc.)            |
| 23–27    | 5      | Numeric      | Bank branch (beneficiary)      | `00001`                 | Branch code                                             |
| 28–48    | 21     | Alphanumeric | Bank account (beneficiary)     | `000000000000000000000` | Account number (left-aligned or right-aligned per bank) |
| 49–50    | 2      | Alphanumeric | Account DV                     | `00`                    | Account check digit(s)                                  |
| 51–65    | 15     | Numeric      | Amount for discount            | `000000000000000`       | Discount amount (rarely used)                           |
| 66–80    | 15     | Numeric      | Amount for additional charges  | `000000000000000`       | Additional charges (rarely used)                        |
| 81–93    | 13     | Numeric      | Days notice (advance notice)   | `0000000000000`         | Days in advance (usually zero)                          |
| 94–108   | 15     | Numeric      | Amount IOF (tax)               | `000000000000000`       | IOF insurance tax (usually zero)                        |
| 109–123  | 15     | Numeric      | Amount abated                  | `000000000000000`       | Discount on amount (rarely used)                        |
| 124–138  | 15     | Numeric      | Actual debit amount            | `000000000000825`       | Amount actually debited from account                    |
| 139–142  | 4      | Numeric      | Reserved                       | `0000`                  | Future use                                              |
| 143–152  | 10     | Numeric      | Payment date                   | `25042026`              | Settlement date (DDMMYYYY, right-padded)                |
| 153–161  | 9      | Numeric      | Credit date                    | `000000000`             | Credit to beneficiary (usually zeros)                   |
| 162–175  | 14     | Numeric      | FCR number (financial control) | `00000000000000`        | Bank-specific financial control reference               |
| 176–190  | 15     | Numeric      | Order value (complementary)    | `000000000000000`       | Complementary payment amount                            |
| 191      | 1      | Alphanumeric | Payment form (currency)        | ``                      | Usually blank                                           |
| 192      | 1      | Numeric      | Payment form code              | `0`                     | 0=BRL (nominal), 1=USD, etc.                            |
| 193–194  | 2      | Numeric      | Reserved                       | `00`                    | Fill with zeros                                         |
| 195–240  | 46     | Alphanumeric | Reserved                       | ` ` (blanks)            | Fill with spaces                                        |

---

## Batch Trailer (Record Type 5)

Summary totals and record count for this batch.

| Position | Length | Format       | Field           | Example           | Notes                                               |
| -------- | ------ | ------------ | --------------- | ----------------- | --------------------------------------------------- |
| 1        | 1      | Numeric      | Record type     | `5`               | Always 5                                            |
| 2–5      | 4      | Numeric      | Lot number      | `0001`            | Batch number                                        |
| 6        | 1      | Numeric      | Record type 2   | `5`               | Always 5                                            |
| 7–12     | 6      | Numeric      | Reserved        | `000000`          | Fill with zeros                                     |
| 13       | 1      | Numeric      | Movement code   | `0`               | Batch summary code                                  |
| 14–20    | 7      | Numeric      | Record count    | `0000102`         | Number of records in batch (incl. headers/trailers) |
| 21–35    | 15     | Numeric      | Amount total    | `000000000823250` | Sum of all Detail B amounts                         |
| 36–50    | 15     | Numeric      | Amount average  | `000000000082325` | Average per payment (informational)                 |
| 51–65    | 15     | Numeric      | Amount largest  | `000000000412500` | Largest individual payment                          |
| 66–80    | 15     | Numeric      | Amount smallest | `000000000410750` | Smallest individual payment                         |
| 81–87    | 7      | Numeric      | Quantity        | `0000010`         | Number of payments in batch                         |
| 88–102   | 15     | Numeric      | Reserved        | `000000000000000` | Fill with zeros                                     |
| 103–117  | 15     | Numeric      | Reserved        | `000000000000000` | Fill with zeros                                     |
| 118–132  | 15     | Numeric      | Reserved        | `000000000000000` | Fill with zeros                                     |
| 133–140  | 8      | Numeric      | Reserved        | `00000000`        | Fill with zeros                                     |
| 141–240  | 100    | Alphanumeric | Reserved        | ` ` (blanks)      | Fill with spaces                                    |

---

## File Trailer (Record Type 9)

File-level summary.

| Position | Length | Format       | Field              | Example      | Notes                     |
| -------- | ------ | ------------ | ------------------ | ------------ | ------------------------- |
| 1        | 1      | Numeric      | Record type        | `9`          | Always 9                  |
| 2–8      | 7      | Numeric      | Reserved           | `0000000`    | Fill with zeros           |
| 9–11     | 3      | Numeric      | Bank code          | `001`        | Bank code                 |
| 12–20    | 9      | Numeric      | Lot number         | `000000000`  | Use 9999 for file trailer |
| 21       | 1      | Numeric      | Record type 2      | `9`          | Always 9                  |
| 22–29    | 8      | Numeric      | Reserved           | `00000000`   | Fill with zeros           |
| 30–35    | 6      | Numeric      | Batch count        | `000001`     | Number of batches         |
| 36–42    | 7      | Numeric      | Record count       | `0000104`    | Total records in file     |
| 43–49    | 7      | Numeric      | Account sum (file) | `0000000`    | Reserved                  |
| 50–240   | 191    | Alphanumeric | Reserved           | ` ` (blanks) | Fill with spaces          |

---

## Example: Single Payment CNAB 240 File

A file with 1 payment contains 6 records (242 bytes total):

1. **File Header** (240 bytes)
2. **Batch Header** (240 bytes)
3. **Detail A** (240 bytes)
4. **Detail B** (240 bytes)
5. **Batch Trailer** (240 bytes)
6. **File Trailer** (240 bytes)

**Total:** 6 × 240 = 1,440 bytes (6 records, 0 line separators).

---

## Field Format Rules

- **Alphanumeric (left-aligned):** Pad with spaces to the right; convert to uppercase
- **Numeric (right-aligned):** Pad with leading zeros; always integer representation
- **No line breaks or separators:** File is raw binary; parsers split by 240-byte record boundaries
- **Character encoding:** ASCII 7-bit (no accents, special Unicode)

---

## References

- [FEBRABAN CNAB 240 V 10.11 Standard](https://cmsarquivos.febraban.org.br/Arquivos/documentos/PDF/Layout%20padrao%20CNAB240%20V%2010%2011%20-%2021_08_2023.pdf)
- SGP implementation: `backend/src/integrations-worker/cnab240/cnab240-builder.service.ts`
- Golden fixtures: `tests/backend/golden/cnab240/`
