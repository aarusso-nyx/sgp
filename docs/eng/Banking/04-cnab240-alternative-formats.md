# CNAB 240 — Alternative Formats and Future Roadmap

**Type:** Strategic reference.
**Authority:** Banking landscape analysis, SGP roadmap.
**Last updated:** 2026-05-04.

---

## Why CNAB 240 Today

CNAB 240 remains the **de facto standard for batch-mode remittances in Brazil** because:

1. **Universal bank support:** All major banks accept CNAB 240 remittances
2. **Regulatory acceptance:** BACEN and CIP recognize it as standard
3. **Legacy compatibility:** Systems from 1990s onward support it
4. **Maturity:** Decades of use → stable, predictable, well-documented
5. **Cost:** No additional fees or licensing requirements

**Timeline:** CNAB 240 has been in use for 25+ years and shows no signs of deprecation.

---

## Alternative Formats (Not Used in SGP)

### 1. CNAB 400 (Legacy Format)

| Property             | Details                                          |
| -------------------- | ------------------------------------------------ |
| **Bytes per record** | 400                                              |
| **Era**              | 1980s–2000s                                      |
| **Status**           | Deprecated; rarely used                          |
| **Banks supporting** | Legacy systems only (Caixa, BNDES internally)    |
| **SGP use**          | **None** — V0.1 used CNAB 400; now CNAB 240 only |

**Why SGP abandoned CNAB 400:**

- Larger file size (400 vs. 240 bytes)
- No advantage over CNAB 240 in functionality
- Older banks dropped support (Bradesco, Itau)
- Regulatory guidance favors CNAB 240

**If SGP had to support CNAB 400 again:**

- Would implement separate Cnab400BuilderService
- Maintain separate bank strategies (400 has different field positions)
- Test fixtures under tests/backend/golden/cnab400/
- Effort: ~2–3 weeks for initial implementation + per-bank testing

---

### 2. ACH (Automated Clearing House) — XML Format

| Property             | Details                                     |
| -------------------- | ------------------------------------------- |
| **Format**           | XML (variable-width)                        |
| **Era**              | 2010s onward (newer)                        |
| **Banks supporting** | Some international banks; limited in Brazil |
| **Regulatory**       | Not FEBRABAN standard; niche use            |
| **Bandwidth**        | 3–5× larger than CNAB 240 (XML overhead)    |
| **SGP use**          | **None**                                    |

**Why not ACH in SGP:**

- Not a Brazilian standard (designed for international clearing)
- No Brazilian bank mandates it
- XML parsing overhead vs. fixed-format simplicity
- Legacy remittance formats (CNAB 240) sufficient for current scope

**If SGP needed ACH support:**

- Would require XSD schema per bank (no FEBRABAN standard)
- Complex, per-bank XML formatting
- Effort: ~4–6 weeks + regulatory liaison
- Not recommended unless a major customer requires it

---

### 3. Pix (Instant Payment) — REST API

| Property             | Details                                                 |
| -------------------- | ------------------------------------------------------- |
| **Format**           | JSON over HTTPS (API)                                   |
| **Technology**       | Real-time, direct API calls (not batch files)           |
| **Era**              | 2020s onward                                            |
| **Timeline**         | Instant (seconds to minutes)                            |
| **Banks supporting** | All major banks + smaller ones                          |
| **Regulatory**       | CIP (Câmara Interbancária de Pagamentos) standard       |
| **Cost**             | Minimal (no per-transaction fees, unlike TED/DOC)       |
| **SGP use**          | **Deferred** — Future alternative for real-time payroll |

**Why Pix is the future but not ready now:**

1. **Batch vs. Real-time:** SGP's payroll runs are monthly/weekly batches; Pix excels at individual, immediate transactions
2. **Notification UX:** Employees receiving instant Pix payroll notifications is a feature, not yet commonplace in Brazil
3. **Compliance:** Some regulatory bodies (TCE, fiscal authorities) still expect batch-mode evidence trails for audit
4. **Bank delays:** Even "instant" Pix can take 30s–5m; batch CNAB 240 is more predictable for large volumes
5. **Cost & effort:** Pix implementation requires per-bank SDK/REST endpoint mapping; CNAB 240 is standardized

**When SGP should migrate to Pix:**

- [ ] When customer demand requires instant payroll (salary app access at 0:00)
- [ ] When compliance frameworks accept real-time settlement logs as audit evidence
- [ ] When Pix latency guarantees are < 1 second (currently 5–30s typical)
- [ ] When most employees have Pix-enabled accounts (currently ~95% adoption in Brazil)

**Estimated effort for Pix migration:**

- Core PixPaymentService: 3–4 weeks
- Per-bank SDK integration: 1–2 weeks each (already have 5 banks)
- Regulatory audit adaptation: 2–3 weeks
- **Total:** ~2–3 months, defer to future round

---

### 4. TED (Transferência Eletrônica Disponível) / DOC (Documento de Crédito)

| Property              | TED                              | DOC                       |
| --------------------- | -------------------------------- | ------------------------- |
| **Timeline**          | Same-day (up to 8 PM)            | Next business day         |
| **Cost per txn**      | ~BRL 10–15                       | ~BRL 4–8                  |
| **Transaction limit** | No limit                         | ~BRL 5M per batch         |
| **Volume**            | Suitable for < 100 txns/day      | Suitable for bulk payroll |
| **Format**            | Bank-specific (no CNAB standard) | Similar, via CNAB 240     |
| **SGP use**           | **Not implemented**              |

**Why TED/DOC are alternatives to CNAB 240:**

- CNAB 240 is also called "Transferência por Crédito em Conta" (credit transfer via account)
- TED and DOC are **variants** of credit transfers, not separate remittance formats
- Some banks allow TED/DOC instructions within CNAB 240 (via modality code)

**When to use instead of CNAB 240:**

- **TED:** Urgent, same-day payroll to select high-priority employees (rare in Brazil)
- **DOC:** Legacy systems; CNAB 240 is preferred now

**SGP's stance:** Use CNAB 240 for all batch payroll. TED/DOC reserved for exceptions (emergency payments, manual adjustments). No separate implementation needed; CNAB 240 can encode TED/DOC intent if required.

---

## Comparative Table

| Format        | Use Case                                   | Timeline | Cost            | Complexity | Regulation              | SGP Status            |
| ------------- | ------------------------------------------ | -------- | --------------- | ---------- | ----------------------- | --------------------- |
| **CNAB 240**  | Batch payroll, standard remittance         | T+1      | Free            | Low        | BACEN/FEBRABAN approved | ✅ **In use**         |
| **CNAB 400**  | Legacy payroll (pre-2000s)                 | T+1      | Free            | Low–Medium | Deprecated              | ❌ Not supported      |
| **ACH (XML)** | International clearing                     | T+2–3    | Varies          | High       | Non-Brazilian           | ❌ Not needed         |
| **Pix**       | Instant person-to-person/real-time payroll | Seconds  | Minimal         | Medium     | CIP standard            | ⏳ **Deferred**       |
| **TED**       | Urgent same-day transfer                   | Same day | High (~BRL 15)  | Medium     | Not CNAB-standard       | ⏳ **On-demand only** |
| **DOC**       | Legacy next-day transfer                   | T+1      | Medium (~BRL 8) | Medium     | Legacy                  | ⏳ **Fallback only**  |

---

## SGP's Multi-Format Strategy

### Current (V0.0.x – Today)

```
PayrollRun → Cnab240BuilderService → CNAB 240 file → Bank → Settlement (T+1)
```

### Short-term (V0.1–V0.3, 6–12 months)

No changes. CNAB 240 remains primary. If needed:

- **TED on-demand:** Manual dispatch API for urgent payments (not automated payroll)
- **CNAB 400 legacy support:** Only if a customer migrates from legacy system (unlikely)

### Medium-term (V0.4–V0.6, 12–18 months)

Begin **Pix proof-of-concept:**

- Implement PixPaymentService (parallel to Cnab240)
- Create golden test fixtures for Pix API calls
- Establish per-bank Pix SDK integrations
- No production use; testing only

### Long-term (V1.0+, 18+ months)

**Pix adoption:**

- Make Pix available as opt-in payroll method (feature flag)
- Hybrid payroll: ~80% CNAB 240 (batch), ~20% Pix (instant, high-touch employees)
- Sunset CNAB 400 and TED manual paths
- Monitor Pix ecosystem maturity (latency, cost, adoption)

---

## Decision Criteria for Format Migration

SGP should migrate to a new format only if:

1. **Customer demand:** Explicit customer request + willingness to fund migration
2. **Regulatory requirement:** BACEN, CIP, or compliance authority mandates it
3. **Cost justification:** Migration cost < 3 months' operational savings
4. **Maturity:** Format must be stable (no planned deprecation within 5 years)
5. **Bank coverage:** ≥4 of 5 major banks must support it

**Current assessment (2026):**

- ✅ CNAB 240: Stable, universal, regulatory-backed → **keep**
- ❌ CNAB 400: Deprecated, no customer demand → **don't resurrect**
- ❌ ACH: Non-Brazilian, complex, no demand → **don't adopt**
- ⏳ Pix: Mature, but use case (instant payroll) still emerging → **monitor, pilot in 12–18 months**

---

## References

- [FEBRABAN Standards Portal](https://portal.febraban.org.br)
- [CIP — Pix Overview](https://www.bcb.gov.br/estabilidade/pix)
- [BACEN Circular 4068/2021 — Pix Regulations](https://www.bcb.gov.br/detalhe/circulares)
- SGP current implementation: `backend/src/integrations-worker/cnab240/`
- Future roadmap: `docs/gov/evidence/implementation-status.md` (deferred
  items)
