# Ponto Mobile com Geofence — PONTO-09

**Status:** Implementado no slice PONTO-09.  
**Escopo:** batida de ponto por PWA para home-office e serviço externo.

## Decisão

A batida móvel usa `POST /api/v1/ponto/mobile/clock` com empregado, coordenada GPS, precisão, horário, identificador de dispositivo e sinalização de `mock_location`. O backend valida o dispositivo registrado, exige consentimento ativo para geolocalização, testa a coordenada contra `hr.work_location.geofence_polygon` via PostGIS `ST_Within` e aplica plausibilidade mínima de precisão e velocidade.

## Dados e auditoria

- `hr.work_location.geofence_polygon` armazena o polígono oficial da lotação em SRID 4326.
- `ponto.mobile_device_registration` mantém o handshake do PWA por empregado e dispositivo.
- `ponto.mobile_geolocation_consent` registra base legal e consentimento operacional de geolocalização.
- `ponto.mobile_clock_in_attempt` registra todas as tentativas, aceitas e rejeitadas.
- Toda mutação possui trigger para `public.sgp_append_audit_event(...)`; o metadado de auditoria não carrega coordenadas GPS em claro.

## Resultados

Tentativas aceitas criam `ponto.time_record` com fonte `MOBILE` e payload de evidência. Tentativas rejeitadas não criam marcação e usam os motivos `OUT_OF_FENCE`, `MOCK_DETECTED`, `IMPOSSIBLE_VELOCITY`, `LOW_PRECISION` ou `NO_GEOLOCATION_CONSENT`.

## LGPD

Geolocalização é dado pessoal. A base operacional do MVP é execução do contrato de trabalho, com consentimento destacado no portal para transparência e prova de ciência. Sem consentimento ativo, a batida é rejeitada de forma explícita e auditada.
