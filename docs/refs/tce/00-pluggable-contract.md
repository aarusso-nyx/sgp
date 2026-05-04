---
scope: Contrato pluggable para obrigações estaduais de tribunais de contas
version_pinned: Lei de acesso, LRF e SIAFIC vigentes; catálogos estaduais revisados em 2026-05-03
last_reviewed: 2026-05-03
primary_sources:
  - https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2011/lei/l12527.htm
  - https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp101.htm
  - https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2020/decreto/D10540.htm
  - https://portal.tcu.gov.br/
  - https://www.planalto.gov.br/ccivil_03/constituicao/ConstituicaoCompilado.htm
---

# Contrato pluggable TCE

| Princípio          | Regra                                                                                                | Aplicação operacional                                                           | Fonte |
| ------------------ | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | ----- |
| Não universalidade | Cada tribunal de contas estadual publica layouts, sistemas e calendários próprios                    | Implementar adapters por tribunal/estado                                        | [4]   |
| RREO/RGF           | LRF define relatórios fiscais e periodicidade geral                                                  | Adapter deve expor demonstrativos exigidos e calendários                        | [2]   |
| Atos de pessoal    | Controle externo acompanha admissões, aposentadorias, pensões e folha conforme normas locais         | Adapter deve separar folha, atos e cadastro funcional                           | [5]   |
| Transparência      | LAI e LC 131 exigem transparência ativa e acesso à informação                                        | Adapter deve gerar dados públicos com anonimização de identificadores sensíveis | [1]   |
| SIAFIC             | Decreto 10.540/2020 define sistema único e integrado de execução orçamentária, financeira e controle | Adapter deve considerar integração contábil-financeira com folha                | [3]   |

## Source Index

| Marker | Primary source                                                               |
| ------ | ---------------------------------------------------------------------------- |
| [1]    | https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2011/lei/l12527.htm      |
| [2]    | https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp101.htm                    |
| [3]    | https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2020/decreto/D10540.htm  |
| [4]    | https://portal.tcu.gov.br/                                                   |
| [5]    | https://www.planalto.gov.br/ccivil_03/constituicao/ConstituicaoCompilado.htm |
