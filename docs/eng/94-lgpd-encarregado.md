# LGPD Encarregado Publico

R2-42 expõe o contato público do encarregado pelo tratamento de dados pessoais.
R2-43 adiciona o canal público de direitos do titular vinculado ao ROPA vigente
do tenant.

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

| Chave              | Modulo | Valor                                                                           |
| ------------------ | ------ | ------------------------------------------------------------------------------- |
| `lgpd.encarregado` | `lgpd` | JSON com `name`, `email`, `phone`, `channelUrl`, `officeHours`, `postalAddress` |

O seed local cria a linha para o tenant fixture com os defaults públicos. Em
produção, cada tenant deve substituir `email`, `phone`, `channelUrl`,
`officeHours` e `postalAddress` antes da publicação do portal.

## Portal

O frontend expõe a mesma informação em `/lgpd/encarregado` e
`/portal/lgpd/encarregado`. A página consome somente o endpoint público acima.

## Direitos do titular

`POST /api/portal/v1/lgpd/direitos` cria solicitação pública de exercício de
direitos do titular em `lgpd.data_subject_request`. A API exige tipo de direito,
identificação e contato do requerente, captura a base ROPA ativa vinculada ao
tratamento informado e devolve protocolo público para consulta operacional.
