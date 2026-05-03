# LGPD Encarregado e Direitos do Titular

R2-42 expõe o contato público do encarregado pelo tratamento de dados pessoais.
R2-43 adiciona o canal público de direitos do titular vinculado ao ROPA vigente
do tenant.
R3-030 adiciona o ciclo administrativo auditável de designação do encarregado.

## Contrato público

`GET /api/v1/public/lgpd/encarregado` retorna:

```json
{
  "name": "Encarregado pelo Tratamento de Dados Pessoais",
  "contact": {
    "email": "dpo@example.invalid",
    "phone": "",
    "channelUrl": "/lgpd/encarregado",
    "officeHours": "Dias uteis, 9h as 17h",
    "postalAddress": ""
  },
  "updatedAt": null
}
```

O cabeçalho opcional `x-tenant-id` seleciona o tenant quando o canal público
nao resolve o tenant por host. Sem cabeçalho, a API usa o contato LGPD
configurado mais recente de tenant ativo; se nao houver linha configurada,
retorna os defaults acima.

## Parametrização

Os valores configuráveis ficam em `public.system_parameter`:

| Chave              | Modulo | Valor                                                                                                                                 |
| ------------------ | ------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| `lgpd.encarregado` | `lgpd` | JSON com `name`, `email`, `phone`, `channelUrl`, `officeHours`, `postalAddress`, `status`, `designationAct`, `designatedAt` e `notes` |

O seed local cria a linha para o tenant fixture com os defaults públicos. Em
produção, cada tenant deve substituir `email`, `phone`, `channelUrl`,
`officeHours` e `postalAddress` antes da publicação do portal.

## Ciclo administrativo

O operador com `gestao.read` consulta a designação corrente em:

- `GET /api/v1/admin/lgpd/dpo`

O operador com `gestao.write` cria ou atualiza a designação em:

- `POST /api/v1/admin/lgpd/dpo`
- `PATCH /api/v1/admin/lgpd/dpo`

As mutações gravam `public.system_parameter` e emitem auditoria com
`resourceType=lgpd_dpo_designation`, `tableName=public.system_parameter` e o
estado de ciclo (`status`, `designationAct`, `designatedAt`). Os status
aceitos sao `ACTIVE`, `UNDER_REVIEW` e `REPLACED`. Decisões jurídicas sobre
nomeação, substituição, publicação externa e prazos fora desses campos devem
ser registradas fora da API ate que o dono jurídico aprove regra mais
específica.

## Portal

O frontend expõe a mesma informação em `/lgpd/encarregado` e
`/portal/lgpd/encarregado`. A página consome somente o endpoint público acima.

## Direitos do titular

`POST /api/portal/v1/lgpd/direitos` cria solicitação autenticada de exercício
de direitos do titular em `lgpd.data_subject_request`. A API exige
`rightType`, `flowKey` e `description`, captura a base ROPA ativa vinculada ao
tratamento informado, registra o ator portal autenticado e devolve o ticket com
SLA, status e snapshot de retenção/compartilhamento para triagem operacional.

Tipos aceitos:

- `CONFIRMATION`
- `ACCESS`
- `CORRECTION`
- `ANONYMIZATION_BLOCKING_DELETION`
- `PORTABILITY`
- `CONSENT_DELETION`

Solicitações de apagamento, bloqueio ou eliminação sao classificadas como
`RETENTION_RESTRICTED` quando a base ROPA vigente indicar retenção legal ou
operacional; as demais entram como `EXECUTABLE`. O endpoint nao decide mérito
jurídico nem executa alteração automática de dados pessoais.
