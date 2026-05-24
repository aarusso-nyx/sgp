# Locale Policy

Date: 2026-05-24

## Decision

SGP will ship the Angular `pt-BR` locale data instead of relying on Angular's
fallback to `pt`.

## Rationale

The application targets Brazilian public-sector payroll, HR, fiscal, and
transparency workflows. Dates, currency, decimal formatting, and translated
Angular pipes must match Brazilian Portuguese operator expectations. The current
fallback warning is acceptable as a temporary build warning, but it is not the
desired product posture.

## Implementation Rule

Frontend locale setup must register `pt-BR` locale data for both admin and
portal applications. If Angular package layout changes, update the locale import
rather than accepting a silent fallback.

## User-Visible Impact

The intended behavior is Brazilian Portuguese formatting for dates, numbers,
currency, and Angular-provided localized labels. A fallback to `pt` is a
diagnostic condition to fix, not an accepted permanent runtime mode.
