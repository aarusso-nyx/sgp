# Ponto biometrico: Portaria 671 e LGPD

PONTO-08 adiciona biometria digital e palmar ao modulo de ponto eletronico como identificador adicional do empregado no REP. A batida continua vinculada ao identificador primario do empregado, e a biometria apenas enriquece a auditoria com `ponto.biometric_match`, preservando o papel definido pela Portaria MTP 671/2021 art. 80, paragrafo 3.

Templates biometricos sao dado pessoal sensivel. O cadastro exige consentimento ativo em `ponto.biometric_consent`, grava o template somente cifrado em `ponto.employee_biometric_template.template_cipher`, registra o identificador da chave KMS e nunca retorna o conteudo do template para operador, portal ou auditoria. A qualidade minima padrao e `0.850000`, com notas persistidas como `numeric(18,6)`.

Durante a ingestao de REP, o payload biometrico opcional e comparado ao template ativo do empregado. Com consentimento e template ativo, cada batida gera um `time_record` e um `biometric_match` com `score`, `threshold`, `device_id` e decisao `matched`. Sem consentimento ativo, a batida primaria continua valida e nenhum `biometric_match` e criado.

O titular pode retirar consentimento pelo portal. A retirada marca o consentimento com `withdrawn_at`, revoga templates ativos, destrói logicamente a referencia KMS e limpa o envelope cifrado para impedir novo matching. Tentativas posteriores retornam `matched=false` e sao auditadas sem template em claro.

As tabelas sao tenant-scoped, usam RLS com `sgp_tenant_matches(tenant_id)` e permissoes `ponto.biometric.read` / `ponto.biometric.write`, e todas as mutacoes chamam `sgp_append_audit_event(...)`.
