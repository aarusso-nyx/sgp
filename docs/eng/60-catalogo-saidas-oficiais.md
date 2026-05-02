# Catálogo de Saídas Oficiais — SGP Moderno
**Versão:** 1.0 | **Data:** 2026-04-21 | **Status:** Draft
**Escopo:** folha, previdenciário, pessoal/vida funcional, saúde/SST, recrutamento, recadastramento, avaliação, convênio, governo federal, transparência, gerencial
**Depende de:** BRIEF.md, 33-catalogo-de-saidas-oficiais-e-arquivos.md, 39-pacote-de-evidencias-para-saidas-oficiais.md, 58-importacoes-exportacoes-e-documentos-estaticos.md

---

## Visão Geral

Este catálogo registra todas as saídas oficiais produzidas pelo SGP Moderno (documentos, relatórios, arquivos de remessa e exportações). Para cada saída são especificados: formato, gatilho, dados de entrada, template/engine, base legal, assinatura digital, armazenamento S3 e critérios de paridade com o legado.

**Convenções:**

| Símbolo | Significado |
|---|---|
| `[M]` | Gatilho manual (operador inicia na UI) |
| `[R]` | Gatilho por rotina/cron |
| `[A]` | Gatilho por API externa (client-credentials) |
| `[E]` | Gatilho por evento de domínio (SNS/SQS) |
| ICP | Requer certificado ICP-Brasil A1/A3 |
| SS | Self-signed (hash + metadados internos, sem ICP) |
| — | Sem assinatura digital obrigatória |

**Engine de geração de PDFs:** `sgp-report-service` usando **Carbone** (templates DOCX/ODS compilados para PDF via LibreOffice headless) ou **PDFKit** para layouts programáticos de baixa complexidade. Arquivos TXT/XML gerados por builders TypeScript tipados em `sgp-integrations-worker`.

**Chave S3 padrão:**
```
s3://<bucket-tenant>/{dominio}/{ano}/{mes}/{tipo}/{uuid}.{ext}
```
- Bucket: `sgp-outputs-{tenant_id}-{ambiente}`
- Cifragem: SSE-KMS (chave por tenant)
- Versionamento: habilitado
- Object Lock (WORM): aplicado em documentos com valor legal (contracheques fechados, portarias, certidões)

---

## §1 Folha e Financeiro

### 1.1 Contracheque — Servidor (Mensal / 13.º / Férias / Rescisão)

| Campo | Detalhe |
|---|---|
| **Nome oficial** | Demonstrativo de Pagamento |
| **Nome informal** | Contracheque do servidor |
| **Formato** | PDF/A-1b |
| **Gatilho** | `[M]` individual ou `[E]` geração em massa pós-cálculo lote |
| **Dados de entrada** | `competencia_id`, `funcionario_id`, `tipo_processamento` (MENSAL \| DECIMO_TERCEIRO_INTEGRACAO \| DECIMO_TERCEIRO_ADIANTAMENTO \| FERIAS \| RESCISAO) |
| **Template** | `contracheque-servidor.carbone.docx`; engine **Carbone v3** |
| **Variáveis expostas** | `servidor.*`, `lotacao.*`, `competencia.*`, `lancamentos[]`, `totaisProventos`, `totaisDescontos`, `liquido`, `marcaDaguaFlag`, `logoUrl`, `frase_inicial` |
| **Base legal** | Lei n.º 8.112/1990 art. 45; legislação municipal/estadual vigente; IN RFB para IRRF |
| **Assinatura digital** | SS (hash SHA-256 + metadados gravados em `audit_log`); ICP opcional por tenant |
| **Armazenamento S3** | `folha/{ano}/{mes}/contracheque/servidor/{uuid}.pdf`; retenção 10 anos; Object Lock |
| **Evidência de paridade** | Comparar: matrícula, competência, todos os códigos de verba, valores brutos, descontos, líquido, total de proventos, total de descontos; tolerância zero em valores; tolerância ≤ 1 caractere em campos textuais de nomenclatura de verba |

---

### 1.2 Contracheque — Pensionista

| Campo | Detalhe |
|---|---|
| **Nome oficial** | Demonstrativo de Benefício — Pensão |
| **Nome informal** | Contracheque do pensionista |
| **Formato** | PDF/A-1b |
| **Gatilho** | `[M]` individual ou `[E]` em massa |
| **Dados de entrada** | `competencia_id`, `pensionista_id`, `tipo_processamento` |
| **Template** | `contracheque-pensionista.carbone.docx`; engine **Carbone v3** |
| **Variáveis expostas** | `pensionista.*`, `instituidor.*`, `lancamentos[]`, `totais.*`, `competencia.*`, `logoUrl` |
| **Base legal** | Lei n.º 8.112/1990 art. 215–225; legislação municipal do RPPS |
| **Assinatura digital** | SS; ICP opcional |
| **Armazenamento S3** | `folha/{ano}/{mes}/contracheque/pensionista/{uuid}.pdf`; retenção 10 anos; Object Lock |
| **Evidência de paridade** | Mesmos campos do contracheque servidor; verificar cota de rateio quando houver múltiplos beneficiários |

---

### 1.3 Contracheque Retroativo (Republicado)

| Campo | Detalhe |
|---|---|
| **Nome oficial** | Demonstrativo de Pagamento — Reemissão |
| **Nome informal** | Contracheque retroativo / republicado |
| **Formato** | PDF/A-1b com marca d'água "REEMISSÃO" |
| **Gatilho** | `[M]` via tela de reprocessamento; `competencia_id` anterior |
| **Dados de entrada** | `contracheque_id` original, motivo da reemissão |
| **Template** | `contracheque-servidor.carbone.docx` com flag `marcaDaguaFlag=REEMISSAO` |
| **Variáveis expostas** | Idem 1.1 + `dataReemissao`, `usuarioReemissao`, `motivoReemissao` |
| **Base legal** | Mesma do contracheque original |
| **Assinatura digital** | SS |
| **Armazenamento S3** | `folha/{ano}/{mes}/contracheque/reemissao/{uuid}.pdf`; original preservado (versão S3) |
| **Evidência de paridade** | Verificar que o conteúdo financeiro é idêntico ao original; marca d'água presente; data/usuário de reemissão corretos |

---

### 1.4 Relatório de Folha Resumo

| Campo | Detalhe |
|---|---|
| **Nome oficial** | Resumo de Folha de Pagamento |
| **Nome informal** | Resumo da folha |
| **Formato** | PDF e XLSX |
| **Gatilho** | `[M]` |
| **Dados de entrada** | `competencia_id`, `filial_id` (opcional), `tipo_processamento` |
| **Template** | `resumo-folha.carbone.docx` (PDF); **ExcelJS** dinâmico (XLSX) |
| **Variáveis expostas** | `competencia.*`, `filiais[]`, `totaisProvento`, `totaisDesconto`, `totalLiquido`, `quantidadeServidores`, `quantidadePensionistas` |
| **Base legal** | Normas internas de controle financeiro municipal |
| **Assinatura digital** | — |
| **Armazenamento S3** | `folha/{ano}/{mes}/relatorio/resumo/{uuid}.{ext}`; retenção 5 anos |
| **Evidência de paridade** | Comparar totalizadores por filial e por tipo de processamento; tolerância ≤ R$ 0,01 em arredondamentos |

---

### 1.5 Relatório de Folha Detalhado por Lotação

| Campo | Detalhe |
|---|---|
| **Nome oficial** | Relatório Analítico de Folha por Lotação |
| **Nome informal** | Folha por lotação / folha detalhada |
| **Formato** | PDF e XLSX |
| **Gatilho** | `[M]` |
| **Dados de entrada** | `competencia_id`, `lotacao_id[]`, `tipo_processamento`, `ordenacao` (matrícula \| nome) |
| **Template** | `folha-detalhe-lotacao.carbone.docx` (PDF); **ExcelJS** (XLSX) |
| **Variáveis expostas** | `lotacao.*`, `servidores[]`, `lancamentos[]`, `subtotais.*`, `totalGeral.*` |
| **Base legal** | Normas internas de prestação de contas |
| **Assinatura digital** | — |
| **Armazenamento S3** | `folha/{ano}/{mes}/relatorio/detalhe-lotacao/{uuid}.{ext}`; retenção 5 anos |
| **Evidência de paridade** | Comparar contagem de servidores por lotação, subtotais de proventos/descontos, total geral |

---

### 1.6 Relatório de Folha por Verba

| Campo | Detalhe |
|---|---|
| **Nome oficial** | Relatório de Proventos e Descontos por Verba |
| **Nome informal** | Folha por verba / relatório de verbas |
| **Formato** | PDF e XLSX |
| **Gatilho** | `[M]` |
| **Dados de entrada** | `competencia_id`, `verba_id[]` (opcional), `tipo_processamento`, `filial_id` |
| **Template** | `folha-por-verba.carbone.docx` (PDF); **ExcelJS** (XLSX) |
| **Variáveis expostas** | `competencia.*`, `verbas[]` (codigo, descricao, tipo, totalValor, quantidadeServidos) |
| **Base legal** | Controle interno; TCE estadual |
| **Assinatura digital** | — |
| **Armazenamento S3** | `folha/{ano}/{mes}/relatorio/por-verba/{uuid}.{ext}`; retenção 5 anos |
| **Evidência de paridade** | Comparar por código de verba: valor total e quantidade de servidores contemplados; tolerância ≤ R$ 0,01 |

---

### 1.7 Relatório de Folha por Fonte de Recursos

| Campo | Detalhe |
|---|---|
| **Nome oficial** | Relatório de Folha por Fonte de Recursos |
| **Nome informal** | Folha por fonte |
| **Formato** | PDF e XLSX |
| **Gatilho** | `[M]` |
| **Dados de entrada** | `competencia_id`, `fonte_recurso_id[]`, `filial_id` |
| **Template** | `folha-por-fonte.carbone.docx` / **ExcelJS** |
| **Variáveis expostas** | `fontes[]` (codigo, descricao, totalProventos, totalDescontos, totalLiquido) |
| **Base legal** | Lei n.º 4.320/1964; normas da STN |
| **Assinatura digital** | — |
| **Armazenamento S3** | `folha/{ano}/{mes}/relatorio/por-fonte/{uuid}.{ext}`; retenção 5 anos |
| **Evidência de paridade** | Comparar totais por fonte; verificar consistência com arquivo de contabilidade |

---

### 1.8 Ficha Financeira Anual

| Campo | Detalhe |
|---|---|
| **Nome oficial** | Ficha Financeira Anual do Servidor |
| **Nome informal** | Ficha financeira |
| **Formato** | PDF e XLSX |
| **Gatilho** | `[M]` |
| **Dados de entrada** | `funcionario_id`, `ano` |
| **Template** | `ficha-financeira.carbone.docx` / **ExcelJS** |
| **Variáveis expostas** | `servidor.*`, `meses[]` (jan–dez, cada um com lancamentos[]), `totaisAnuais.*` |
| **Base legal** | Lei n.º 8.112/1990; IN RFB (IRRF anual) |
| **Assinatura digital** | SS |
| **Armazenamento S3** | `folha/{ano}/ficha-financeira/{uuid}.{ext}`; retenção 10 anos |
| **Evidência de paridade** | Comparar somatório anual por verba; conferir base de cálculo IRRF acumulada; tolerância ≤ R$ 0,01 |

---

### 1.9 Relatório de Consignados

| Campo | Detalhe |
|---|---|
| **Nome oficial** | Relatório de Consignações em Folha |
| **Nome informal** | Relatório de consignados |
| **Formato** | PDF e XLSX |
| **Gatilho** | `[M]` |
| **Dados de entrada** | `competencia_id`, `consignado_id[]`, `filial_id` |
| **Template** | `relatorio-consignados.carbone.docx` / **ExcelJS** |
| **Variáveis expostas** | `competencia.*`, `consignados[]` (descricao, banco, contrato, valorTotal, quantidadePessoas) |
| **Base legal** | Lei n.º 8.112/1990 art. 45; Dec. n.º 6.386/2008 |
| **Assinatura digital** | — |
| **Armazenamento S3** | `folha/{ano}/{mes}/relatorio/consignados/{uuid}.{ext}`; retenção 5 anos |
| **Evidência de paridade** | Comparar por operadora: total descontado, quantidade de beneficiários |

---

### 1.10 Demonstrativo de Diferenças (Recálculo Retroativo)

| Campo | Detalhe |
|---|---|
| **Nome oficial** | Demonstrativo de Diferenças de Recálculo |
| **Nome informal** | Demonstrativo de diferenças / retroativo |
| **Formato** | PDF e XLSX |
| **Gatilho** | `[M]` após processamento complementar |
| **Dados de entrada** | `competencia_referencia_id`, `competencia_calculo_id`, `funcionario_id[]` |
| **Template** | `demonstrativo-diferencas.carbone.docx` / **ExcelJS** |
| **Variáveis expostas** | `servidor.*`, `verbas[]` (codigo, valorOriginal, valorNovo, diferenca), `totalDiferenca` |
| **Base legal** | Legislação municipal; controle interno |
| **Assinatura digital** | SS |
| **Armazenamento S3** | `folha/{ano}/{mes}/relatorio/diferencas/{uuid}.{ext}`; retenção 10 anos |
| **Evidência de paridade** | Verificar que diferença = valor novo − valor original para cada verba; somar diferenças e conferir com valor efetivamente pago |

---

### 1.11 CNAB 240 / 400 — Remessa

| Campo | Detalhe |
|---|---|
| **Nome oficial** | Arquivo de Remessa Bancária |
| **Nome informal** | CNAB remessa / arquivo de pagamento |
| **Formato** | Binário posicional CNAB 240, registros de 240 bytes sem quebra de linha |
| **Gatilho** | `[M]` após aprovação/fechamento de folha |
| **Dados de entrada** | `payroll_run_id`, `bank_id`/código bancário, `payment_date`, `numero_remessa` |
| **Template** | `Cnab240BuilderService` em `source/backend/src/integrations-worker/cnab240/`; estratégias por banco em `cnab240/banks/` |
| **Variáveis expostas** | Header de arquivo, header de lote, segmentos A/B por servidor, trailer de lote com soma/contagem, trailer de arquivo |
| **Base legal** | Padrão FEBRABAN CNAB 240/400; convênio banco–órgão |
| **Assinatura digital** | — (autenticação via credencial SFTP/portal banco) |
| **Armazenamento S3** | `{tenant}/outputs/remessa/{ano}/{mes}/remessa_{banco}_{sequencial}.rem`; retenção 10 anos; Object Lock |
| **Evidência de paridade** | `record_count`, `total_amount`, `file_hash` SHA-256 e linhas por servidor em `payroll.payment_remittance_detail` |

---

### 1.12 CNAB Retorno — Conciliação

| Campo | Detalhe |
|---|---|
| **Nome oficial** | Arquivo de Retorno Bancário |
| **Nome informal** | CNAB retorno / arquivo de conciliação |
| **Formato** | TXT (CNAB 240/400 — entrada) → relatório de conciliação PDF/XLSX (saída) |
| **Gatilho** | `[M]` upload do arquivo retorno; `[E]` processamento automático em fila |
| **Dados de entrada** | Arquivo TXT retorno do banco, `remessa_id` correspondente |
| **Template** | `relatorio-retorno-bancario.carbone.docx` / **ExcelJS** |
| **Variáveis expostas** | `remessa.*`, `registros[]` (ocorrencia, descricao, status, valorPago), `totais.*` |
| **Base legal** | Padrão FEBRABAN; convênio banco |
| **Assinatura digital** | — |
| **Armazenamento S3** | `bancario/{ano}/{mes}/retorno/{uuid}.txt` (arquivo bruto) + `bancario/{ano}/{mes}/retorno/relatorio/{uuid}.{ext}` |
| **Evidência de paridade** | Comparar: registros com ocorrência de erro, total de créditos efetivados, impacto em `contracheque.status` |

---

### 1.13 Arquivo de Contabilidade (Empenho / Liquidação / Pagamento)

| Campo | Detalhe |
|---|---|
| **Nome oficial** | Arquivo de Integração Contábil |
| **Nome informal** | Arquivo contábil / empenho folha |
| **Formato** | TXT ou CSV (leiaute definido pelo sistema contábil do município) |
| **Gatilho** | `[M]` pós-fechamento de folha |
| **Dados de entrada** | `competencia_id`, `tipo_processamento`, `fase_contabil` (EMPENHO \| LIQUIDACAO \| PAGAMENTO) |
| **Template** | Builder TypeScript `ContabilidadeExportBuilder`; layout configurável por tenant em `parametro_sistema.contabilidade_layout` |
| **Variáveis expostas** | Código de empenho, natureza da despesa, centro de custo, valor bruto, valor de encargos, valor líquido |
| **Base legal** | Lei n.º 4.320/1964; Portaria STN n.º 448/2002; PCASP |
| **Assinatura digital** | — |
| **Armazenamento S3** | `contabilidade/{ano}/{mes}/{fase}/{uuid}.{ext}`; retenção 10 anos |
| **Evidência de paridade** | Comparar totais por natureza de despesa; consistência com resumo de folha (R$ 0,01 tolerância) |

---

## §2 Previdenciário

### 2.1 CTC — Certidão de Tempo de Contribuição

| Campo | Detalhe |
|---|---|
| **Nome oficial** | Certidão de Tempo de Contribuição |
| **Nome informal** | CTC |
| **Formato** | PDF/A-1b |
| **Gatilho** | `[M]` |
| **Dados de entrada** | `pessoa_id`, `periodo_inicio`, `periodo_fim`, `orgao_emitente`, `ato_emissao` |
| **Template** | `ctc.carbone.docx`; engine **Carbone v3** |
| **Variáveis expostas** | `pessoa.*`, `periodos[]`, `totalDias`, `totalAnos`, `orgaoEmitente.*`, `dataEmissao`, `assinanteNome`, `assinanteCargo` |
| **Base legal** | Lei n.º 9.796/1999 (COMPREV); Portaria MPS n.º 154/2008; IN MPS n.º 11/2006 |
| **Assinatura digital** | ICP-Brasil A1 obrigatório (e-CPF do gestor ou e-CNPJ do ente) |
| **Armazenamento S3** | `previdenciario/ctc/{uuid}.pdf`; retenção permanente; Object Lock |
| **Evidência de paridade** | Comparar: períodos (data início/fim), total de dias/anos, conteúdo do ato de emissão, campos de identificação da pessoa |

---

### 2.2 Simulação de Aposentadoria (PDF + XLSX)

| Campo | Detalhe |
|---|---|
| **Nome oficial** | Simulação de Benefício Previdenciário |
| **Nome informal** | Simulação de aposentadoria |
| **Formato** | PDF e XLSX |
| **Gatilho** | `[M]` |
| **Dados de entrada** | `funcionario_id`, `regra_aposentadoria_id`, `data_base_simulacao` |
| **Template** | `simulacao-aposentadoria.carbone.docx` / **ExcelJS** |
| **Variáveis expostas** | `servidor.*`, `regra.*`, `resultado.*` (idadeAtual, tempoContribuicao, idadeFaltante, tempoFaltante, salarioBeneficio, cenarios[]) |
| **Base legal** | EC n.º 103/2019; Lei n.º 9.717/1998; regras do RPPS local |
| **Assinatura digital** | SS (documento informativo, não ato oficial) |
| **Armazenamento S3** | `previdenciario/simulacao/{uuid}.{ext}`; retenção 5 anos |
| **Evidência de paridade** | Comparar: tempo de contribuição calculado, salário de benefício, regras aplicadas (por nome de regra), datas de carência |

---

### 2.3 Parecer Técnico de Aposentadoria

| Campo | Detalhe |
|---|---|
| **Nome oficial** | Parecer Técnico — Concessão de Aposentadoria |
| **Nome informal** | Parecer técnico |
| **Formato** | PDF/A-1b |
| **Gatilho** | `[M]` |
| **Dados de entrada** | `aposentadoria_id`, `funcionario_id`, `regra_id`, dados do processo |
| **Template** | `parecer-tecnico-aposentadoria.carbone.docx` |
| **Variáveis expostas** | `processo.*`, `servidor.*`, `regra.*`, `fundamentoLegal`, `conclusao`, `pareceristaNome`, `pareceristaMatricula`, `data` |
| **Base legal** | EC n.º 103/2019; legislação municipal; regimento interno do RPPS |
| **Assinatura digital** | ICP-Brasil A1 do parecerista ou SS com carimbo de aprovação em workflow |
| **Armazenamento S3** | `previdenciario/parecer-tecnico/{uuid}.pdf`; retenção permanente; Object Lock |
| **Evidência de paridade** | Verificar presença obrigatória de: fundamentação legal, tempo de contribuição apurado, salário de benefício, conclusão, assinatura |

---

### 2.4 Parecer Jurídico

| Campo | Detalhe |
|---|---|
| **Nome oficial** | Parecer Jurídico — Benefício Previdenciário |
| **Nome informal** | Parecer jurídico |
| **Formato** | PDF/A-1b |
| **Gatilho** | `[M]` (upload de documento externo ou gerado no módulo) |
| **Dados de entrada** | `aposentadoria_id`, conteúdo do parecer, parecerista jurídico |
| **Template** | `parecer-juridico.carbone.docx` |
| **Variáveis expostas** | `processo.*`, `servidor.*`, `ementa`, `fundamentacao`, `conclusao`, `juristaOAB`, `juristaNome`, `data` |
| **Base legal** | Regimento interno da PGM/PGE; Estatuto do RPPS |
| **Assinatura digital** | ICP-Brasil A1 do advogado (OAB) ou SS |
| **Armazenamento S3** | `previdenciario/parecer-juridico/{uuid}.pdf`; retenção permanente; Object Lock |
| **Evidência de paridade** | Verificar campos obrigatórios: processo, ementa, fundamentação, conclusão, assinante com registro OAB |

---

### 2.5 Portaria de Concessão de Aposentadoria / Pensão

| Campo | Detalhe |
|---|---|
| **Nome oficial** | Portaria de Concessão de Aposentadoria / Portaria de Concessão de Pensão |
| **Nome informal** | Portaria de aposentadoria / portaria de pensão |
| **Formato** | PDF/A-1b |
| **Gatilho** | `[M]` após aprovação do parecer técnico e jurídico |
| **Dados de entrada** | `aposentadoria_id` ou `pensao_id`, número e ano da portaria, autoridade competente |
| **Template** | `portaria-concessao-aposentadoria.carbone.docx` / `portaria-concessao-pensao.carbone.docx` |
| **Variáveis expostas** | `numero`, `ano`, `autoridade.*`, `servidor.*` ou `pensionista.*`, `fundamentoLegal`, `proventos`, `dataEfeito`, `dataPublicacao`, `diario` |
| **Base legal** | Lei n.º 8.112/1990; EC n.º 103/2019; legislação municipal |
| **Assinatura digital** | ICP-Brasil A1 da autoridade competente |
| **Armazenamento S3** | `previdenciario/portaria/{uuid}.pdf`; retenção permanente; Object Lock |
| **Evidência de paridade** | Verificar número da portaria, fundamento legal, valor dos proventos, data de efeito, publicação no diário oficial |

---

### 2.6 Ficha de Pensão

| Campo | Detalhe |
|---|---|
| **Nome oficial** | Ficha de Cadastro de Pensão |
| **Nome informal** | Ficha de pensão |
| **Formato** | PDF |
| **Gatilho** | `[M]` |
| **Dados de entrada** | `pensao_id` |
| **Template** | `ficha-pensao.carbone.docx` |
| **Variáveis expostas** | `instituidor.*`, `beneficiarios[]` (nome, CPF, parentesco, cotaParte, dataInicio, dataFim), `tipo.*`, `valorTotal`, `formaReajuste` |
| **Base legal** | Lei n.º 8.112/1990 art. 215–225; Estatuto RPPS local |
| **Assinatura digital** | SS |
| **Armazenamento S3** | `previdenciario/ficha-pensao/{uuid}.pdf`; retenção permanente |
| **Evidência de paridade** | Comparar: dados do instituidor, cotas de cada beneficiário, tipo de benefício, valor |

---

### 2.7 Extrato SIPREV

| Campo | Detalhe |
|---|---|
| **Nome oficial** | Extrato de Dados SIPREV |
| **Nome informal** | Extrato SIPREV |
| **Formato** | PDF e XLSX |
| **Gatilho** | `[M]` |
| **Dados de entrada** | `pessoa_id`, período de referência |
| **Template** | `extrato-siprev.carbone.docx` / **ExcelJS** |
| **Variáveis expostas** | `pessoa.*`, `vinculos[]`, `contribuicoes[]`, `beneficios[]` |
| **Base legal** | Portaria MPS n.º 204/2008; Instrução MPS/SPS |
| **Assinatura digital** | SS |
| **Armazenamento S3** | `previdenciario/extrato-siprev/{uuid}.{ext}`; retenção 5 anos |
| **Evidência de paridade** | Comparar com extrato gerado no portal SIPREV: períodos de contribuição, alíquotas, benefícios |

---

### 2.8 Remessa SIPREV/Gestão Mensal

| Campo | Detalhe |
|---|---|
| **Nome oficial** | Arquivo de Remessa SIPREV/Gestão |
| **Nome informal** | Remessa SIPREV |
| **Formato** | XML (leiaute MPS/SIPREV vigente) |
| **Gatilho** | `[M]` pós-fechamento da competência |
| **Dados de entrada** | `competencia_id`, `filial_id[]` |
| **Template** | Builder TypeScript `SiprevXmlBuilder` em `sgp-integrations-worker` |
| **Variáveis expostas** | Conforme leiaute MPS: `<Cadastro>`, `<Contribuicao>`, `<Beneficio>`, `<Vinculo>` |
| **Base legal** | Portaria MPS n.º 204/2008; Instrução MPS/SPS |
| **Assinatura digital** | ICP-Brasil A1 (e-CNPJ do RPPS) para envio no portal SIPREV |
| **Armazenamento S3** | `previdenciario/siprev/{ano}/{mes}/{uuid}.xml`; retenção 10 anos; Object Lock |
| **Evidência de paridade** | Comparar com XML legado: contagem de registros por tag, somatórios de contribuições, validar XSD MPS |

---

### 2.9 Compensação Previdenciária (COMPREV)

| Campo | Detalhe |
|---|---|
| **Nome oficial** | Certidão de Compensação Previdenciária |
| **Nome informal** | COMPREV / Certidão COMPREV |
| **Formato** | PDF e XLSX |
| **Gatilho** | `[M]` |
| **Dados de entrada** | `certidao_tempo_contribuicao_id`, `regime_origem`, dados do cálculo de compensação |
| **Template** | `certidao-comprev.carbone.docx` / **ExcelJS** |
| **Variáveis expostas** | `pessoa.*`, `periodoContribuicao.*`, `regimeOrigem`, `valor`, `fundamentoLegal`, `status` |
| **Base legal** | Lei n.º 9.796/1999; Portaria MPS n.º 154/2008 |
| **Assinatura digital** | ICP-Brasil A1 do gestor do RPPS |
| **Armazenamento S3** | `previdenciario/comprev/{uuid}.{ext}`; retenção permanente; Object Lock |
| **Evidência de paridade** | Comparar: períodos compensados, valor calculado, regime de origem, fundamentação |

---

## §3 Pessoal e Vida Funcional

### 3.1 Ficha Funcional Completa (Dossiê)

| Campo | Detalhe |
|---|---|
| **Nome oficial** | Ficha Funcional do Servidor |
| **Nome informal** | Ficha funcional / dossiê |
| **Formato** | PDF (ficha consolidada) + ZIP (dossiê com anexos) |
| **Gatilho** | `[M]` |
| **Dados de entrada** | `funcionario_id`, seções a incluir (checkboxes: férias, licenças, transferências, vencimentos, afastamentos, observações) |
| **Template** | `ficha-funcional.carbone.docx` |
| **Variáveis expostas** | `servidor.*`, `cargo.*`, `lotacao.*`, `ferias[]`, `licencas[]`, `afastamentos[]`, `transferencias[]`, `vencimentos[]`, `observacoes[]`, `anexos[]` |
| **Base legal** | Lei n.º 8.112/1990; legislação municipal |
| **Assinatura digital** | SS |
| **Armazenamento S3** | `pessoal/ficha-funcional/{uuid}.pdf`; `pessoal/dossie/{uuid}.zip`; retenção 30 anos (após desligamento) |
| **Evidência de paridade** | Comparar seção a seção: dados pessoais, histórico de cargo, licenças/afastamentos com datas e motivos, observações permanentes |

---

### 3.2 Ficha de Posse

| Campo | Detalhe |
|---|---|
| **Nome oficial** | Termo de Posse |
| **Nome informal** | Ficha de posse |
| **Formato** | PDF/A-1b |
| **Gatilho** | `[M]` no ato da posse (`vinculo.data_posse` preenchida) |
| **Dados de entrada** | `posse_id` |
| **Template** | `termo-posse.carbone.docx` |
| **Variáveis expostas** | `servidor.*`, `cargo.*`, `filial.*`, `lotacao.*`, `dataPosse`, `bensDeclarados`, `opcaoRemuneracao`, `autoridadeNome`, `autoridadeCargo` |
| **Base legal** | Lei n.º 8.112/1990 art. 13; legislação municipal |
| **Assinatura digital** | SS; campo de assinatura física do servidor e da autoridade |
| **Armazenamento S3** | `pessoal/posse/{uuid}.pdf`; retenção permanente; Object Lock |
| **Evidência de paridade** | Verificar: todos os dados do cargo, lotação, data de posse, campo de opção de remuneração, espaço de assinatura |

---

### 3.3 Declaração de Vínculo

| Campo | Detalhe |
|---|---|
| **Nome oficial** | Declaração de Vínculo Funcional |
| **Nome informal** | Declaração de vínculo |
| **Formato** | PDF |
| **Gatilho** | `[M]` |
| **Dados de entrada** | `funcionario_id`, finalidade (declaração solicitada por) |
| **Template** | `declaracao-vinculo.carbone.docx` |
| **Variáveis expostas** | `servidor.*`, `cargo.*`, `lotacao.*`, `tipoVinculo`, `dataIngresso`, `dataEmissao`, `declarante.*`, `finalidade` |
| **Base legal** | Lei n.º 8.112/1990; legislação municipal |
| **Assinatura digital** | SS |
| **Armazenamento S3** | `pessoal/declaracoes/{uuid}.pdf`; retenção 5 anos |
| **Evidência de paridade** | Verificar campos obrigatórios: identificação completa, cargo, tipo de vínculo, data de ingresso |

---

### 3.4 Declaração de Tempo de Serviço

| Campo | Detalhe |
|---|---|
| **Nome oficial** | Declaração de Tempo de Serviço |
| **Nome informal** | Declaração de tempo de serviço / ex-servidor |
| **Formato** | PDF |
| **Gatilho** | `[M]` |
| **Dados de entrada** | `funcionario_id`, `periodo_inicio`, `periodo_fim` |
| **Template** | `declaracao-tempo-servico.carbone.docx` |
| **Variáveis expostas** | `servidor.*`, `periodos[]`, `totalAnos`, `totalMeses`, `totalDias`, `dataEmissao`, `declarante.*` |
| **Base legal** | Lei n.º 8.112/1990; Lei n.º 9.796/1999 |
| **Assinatura digital** | SS; ICP-Brasil opcional |
| **Armazenamento S3** | `pessoal/declaracoes/{uuid}.pdf`; retenção 10 anos |
| **Evidência de paridade** | Comparar: períodos, total de dias, cargo ocupado em cada período |

---

### 3.5 Certidão Negativa

| Campo | Detalhe |
|---|---|
| **Nome oficial** | Certidão Negativa de Débitos Funcionais |
| **Nome informal** | Certidão negativa |
| **Formato** | PDF |
| **Gatilho** | `[M]` |
| **Dados de entrada** | `funcionario_id`, tipo da certidão (financeiro \| disciplinar \| geral) |
| **Template** | `certidao-negativa.carbone.docx` |
| **Variáveis expostas** | `servidor.*`, `tipoCertidao`, `dataEmissao`, `validadeAte`, `codigoVerificacao`, `declarante.*` |
| **Base legal** | Legislação municipal; estatuto do servidor |
| **Assinatura digital** | SS com código de verificação impresso; ICP-Brasil opcional |
| **Armazenamento S3** | `pessoal/certidoes/{uuid}.pdf`; retenção 5 anos |
| **Evidência de paridade** | Verificar: código de verificação único, validade da certidão, tipo correto declarado |

---

### 3.6 Atestado de Frequência

| Campo | Detalhe |
|---|---|
| **Nome oficial** | Atestado de Frequência |
| **Nome informal** | Atestado de frequência |
| **Formato** | PDF |
| **Gatilho** | `[M]` |
| **Dados de entrada** | `funcionario_id`, `competencia_id` ou período |
| **Template** | `atestado-frequencia.carbone.docx` |
| **Variáveis expostas** | `servidor.*`, `lotacao.*`, `periodo.*`, `diasUteis`, `diasPresenca`, `faltasJustificadas`, `faltasInjustificadas`, `chefeImediato.*` |
| **Base legal** | Legislação municipal; normas de frequência do órgão |
| **Assinatura digital** | SS |
| **Armazenamento S3** | `pessoal/atestado-frequencia/{uuid}.pdf`; retenção 5 anos |
| **Evidência de paridade** | Comparar: período, dias de presença e faltas; assinatura do chefe imediato presente |

---

### 3.7 Carteira Funcional (Crachá)

| Campo | Detalhe |
|---|---|
| **Nome oficial** | Carteira Funcional |
| **Nome informal** | Crachá / carteirinha funcional |
| **Formato** | PDF (frente e verso, formato cartão) |
| **Gatilho** | `[M]` |
| **Dados de entrada** | `funcionario_id` |
| **Template** | `carteira-funcional.carbone.docx` (layout A6 cartão) |
| **Variáveis expostas** | `servidor.nome`, `servidor.foto_s3_key`, `servidor.matricula`, `cargo.*`, `orgao.*`, `logoUrl`, `dataValidade`, `codigoBarras` |
| **Base legal** | Regulamento interno do órgão |
| **Assinatura digital** | SS |
| **Armazenamento S3** | `pessoal/carteira-funcional/{uuid}.pdf`; retenção 5 anos |
| **Evidência de paridade** | Verificar: foto, matrícula, cargo, órgão, logotipo, código de barras ou QR code |

---

### 3.8 Portaria de Admissão / Exoneração / Licença / Progressão

| Campo | Detalhe |
|---|---|
| **Nome oficial** | Portaria de [Admissão \| Exoneração \| Licença \| Progressão Funcional] |
| **Nome informal** | Portaria de admissão / exoneração / licença / progressão |
| **Formato** | PDF/A-1b |
| **Gatilho** | `[M]` |
| **Dados de entrada** | `funcionario_id`, `tipo_portaria`, número e ano, autoridade, fundamentação |
| **Template** | `portaria-ato-funcional.carbone.docx` (variável por tipo via `tipo_portaria`) |
| **Variáveis expostas** | `numero`, `ano`, `tipo`, `servidor.*`, `cargo.*`, `fundamentoLegal`, `considerandos`, `artigo`, `autoridade.*`, `dataAssinatura`, `publicacao.*` |
| **Base legal** | Lei n.º 8.112/1990; legislação municipal específica por ato |
| **Assinatura digital** | ICP-Brasil A1 da autoridade emissora; ou SS com publicação em diário oficial |
| **Armazenamento S3** | `pessoal/portarias/{tipo}/{uuid}.pdf`; retenção permanente; Object Lock |
| **Evidência de paridade** | Verificar: número da portaria, tipo correto, fundamentação legal, dados do servidor, autoridade |

---

### 3.9 Termo de Compromisso

| Campo | Detalhe |
|---|---|
| **Nome oficial** | Termo de Compromisso |
| **Nome informal** | Termo de compromisso |
| **Formato** | PDF |
| **Gatilho** | `[M]` |
| **Dados de entrada** | `funcionario_id`, tipo do compromisso, cláusulas |
| **Template** | `termo-compromisso.carbone.docx` |
| **Variáveis expostas** | `servidor.*`, `tipCompromisso`, `clausulas[]`, `dataAssinatura`, `testemunhas[]`, `autoridade.*` |
| **Base legal** | Legislação municipal; estatuto do servidor |
| **Assinatura digital** | SS |
| **Armazenamento S3** | `pessoal/termos/{uuid}.pdf`; retenção 10 anos |
| **Evidência de paridade** | Verificar cláusulas obrigatórias por tipo de compromisso; assinaturas presentes |

---

### 3.10 Memorando Interno

| Campo | Detalhe |
|---|---|
| **Nome oficial** | Memorando Interno |
| **Nome informal** | Memorando |
| **Formato** | PDF |
| **Gatilho** | `[M]` |
| **Dados de entrada** | Remetente, destinatário, assunto, corpo do texto, `funcionario_id` referenciado |
| **Template** | `memorando-interno.carbone.docx` |
| **Variáveis expostas** | `numero`, `ano`, `remetente.*`, `destinatario.*`, `assunto`, `corpo`, `data`, `anexos[]` |
| **Base legal** | Manual de redação oficial municipal |
| **Assinatura digital** | SS |
| **Armazenamento S3** | `pessoal/memorandos/{uuid}.pdf`; retenção 5 anos |
| **Evidência de paridade** | Verificar: numeração sequencial por ano, formatação padrão ABNT/manual redação oficial |

---

## §4 Saúde / SST / Perícia

### 4.1 Laudo Pericial (PDF)

| Campo | Detalhe |
|---|---|
| **Nome oficial** | Laudo Pericial Médico |
| **Nome informal** | Laudo pericial / laudo médico |
| **Formato** | PDF/A-1b |
| **Gatilho** | `[M]` pelo médico perito após atendimento |
| **Dados de entrada** | `prontuario_pericia_id` |
| **Template** | `laudo-pericial.carbone.docx` (tipo padrão) / `laudo-pericial-aposentadoria.carbone.docx` (tipo aposentadoria) |
| **Variáveis expostas** | `servidor.*`, `medico.*`, `especialidade.*`, `motivo`, `hda`, `exameFisico`, `diagnostico`, `cidPrincipal.*`, `cidSecundarios[]`, `acaoPericial`, `tipoLaudo`, `diasConcedidos`, `dataInicio`, `dataFim`, `restricoes[]`, `observacao` |
| **Base legal** | Lei n.º 8.112/1990 art. 203; Resolução CFM n.º 2.056/2013; Lei n.º 605/1949 |
| **Assinatura digital** | ICP-Brasil A1 do médico (e-CPF + CRM) |
| **Armazenamento S3** | `saude/laudos/{uuid}.pdf`; retenção permanente; Object Lock |
| **Evidência de paridade** | Comparar: CID principal, dias concedidos, ação pericial, médico responsável (CRM), data do exame |

---

### 4.2 Atestado Médico — Recibo

| Campo | Detalhe |
|---|---|
| **Nome oficial** | Recibo de Atestado Médico |
| **Nome informal** | Recibo de atestado |
| **Formato** | PDF |
| **Gatilho** | `[M]` no ato de recebimento do atestado externo |
| **Dados de entrada** | `agendamento_pericia_id`, dados do atestado externo recebido |
| **Template** | `recibo-atestado.carbone.docx` |
| **Variáveis expostas** | `servidor.*`, `dataRecebimento`, `diasConcedidos`, `cid`, `medicoExterno.*`, `operadorRecepcao.*` |
| **Base legal** | Lei n.º 8.112/1990; norma interna de junta médica |
| **Assinatura digital** | SS |
| **Armazenamento S3** | `saude/recibos-atestado/{uuid}.pdf`; retenção 10 anos |
| **Evidência de paridade** | Verificar: data de recebimento, dias, CID, médico externo identificado |

---

### 4.3 CAT — Comunicação de Acidente de Trabalho (PDF e XML S-2210)

| Campo | Detalhe |
|---|---|
| **Nome oficial** | Comunicação de Acidente de Trabalho — CAT |
| **Nome informal** | CAT |
| **Formato** | PDF (impresso) + XML eSocial S-2210 |
| **Gatilho** | `[M]`; `[E]` geração do evento eSocial S-2210 |
| **Dados de entrada** | `acidente_trabalho_id` |
| **Template** | `cat.carbone.docx` (PDF); `S2210XmlBuilder` TypeScript (XML) |
| **Variáveis expostas** | `servidor.*`, `dataAcidente`, `localAcidente`, `descricaoAcidente`, `cid.*`, `diasAfastamento`, `testemunhas[]`, `medicoAssistente.*` |
| **Base legal** | Lei n.º 8.213/1991 art. 22; Portaria MPS n.º 1.259/2010; eSocial S-1.2 leiaute S-2210 |
| **Assinatura digital** | ICP-Brasil A1 (e-CNPJ) para envio eSocial |
| **Armazenamento S3** | `saude/cat/{uuid}.pdf`; `esocial/s2210/{uuid}.xml`; retenção permanente; Object Lock |
| **Evidência de paridade** | Comparar PDF com XML: campos comuns devem ser idênticos; validar XSD S-2210; número CAT consistente |

---

### 4.4 PPP — Perfil Profissiográfico Previdenciário

| Campo | Detalhe |
|---|---|
| **Nome oficial** | Perfil Profissiográfico Previdenciário — PPP |
| **Nome informal** | PPP |
| **Formato** | PDF (formulário padrão MPS) |
| **Gatilho** | `[M]` no desligamento ou solicitação do servidor |
| **Dados de entrada** | `funcionario_id`, período de exposição a agentes nocivos |
| **Template** | `ppp.carbone.docx` (leiaute formulário IN MPS) |
| **Variáveis expostas** | `servidor.*`, `empresa.*`, `setor.*`, `agentesNocivos[]`, `epi[]`, `epc[]`, `examesOcupacionais[]`, `responsavelTecnico.*`, `dataEmissao` |
| **Base legal** | IN MPS/SPS n.º 45/2010; Portaria MTE n.º 1.286/2017; eSocial S-2240 |
| **Assinatura digital** | ICP-Brasil A1 do responsável técnico (engenheiro SST ou médico do trabalho) |
| **Armazenamento S3** | `saude/ppp/{uuid}.pdf`; retenção permanente; Object Lock |
| **Evidência de paridade** | Comparar: agentes nocivos listados (código e período), EPI/EPC informados, assinatura do RT |

---

### 4.5 Encaminhamento Pericial

| Campo | Detalhe |
|---|---|
| **Nome oficial** | Encaminhamento para Perícia Especializada |
| **Nome informal** | Encaminhamento pericial |
| **Formato** | PDF |
| **Gatilho** | `[M]` quando `acao_pericial = ENCAMINHAR_ESPECIALISTA` |
| **Dados de entrada** | `prontuario_pericia_id`, especialidade de destino |
| **Template** | `encaminhamento-pericial.carbone.docx` |
| **Variáveis expostas** | `servidor.*`, `medicoEncaminhante.*`, `especialidadeDestino.*`, `motivoEncaminhamento`, `hda`, `dataEncaminhamento` |
| **Base legal** | Lei n.º 8.112/1990; norma interna da junta médica |
| **Assinatura digital** | SS; campo físico do médico encaminhante |
| **Armazenamento S3** | `saude/encaminhamentos/{uuid}.pdf`; retenção 10 anos |
| **Evidência de paridade** | Verificar: médico encaminhante, especialidade, motivo, data |

---

### 4.6 Agenda Médica — PDF Diária

| Campo | Detalhe |
|---|---|
| **Nome oficial** | Agenda de Atendimentos Periciais |
| **Nome informal** | Agenda médica diária |
| **Formato** | PDF |
| **Gatilho** | `[M]` ou `[R]` (gerado automaticamente no início do dia) |
| **Dados de entrada** | `medico_id`, `data` |
| **Template** | `agenda-medica-diaria.carbone.docx` |
| **Variáveis expostas** | `medico.*`, `data`, `especialidades[]`, `agendamentos[]` (hora, servidor, tipoPericia, status) |
| **Base legal** | Norma interna da junta médica |
| **Assinatura digital** | — |
| **Armazenamento S3** | `saude/agenda/{ano}/{mes}/{uuid}.pdf`; retenção 2 anos |
| **Evidência de paridade** | Comparar: total de agendamentos, horários, status de cada atendimento |

---

## §5 Recrutamento e Seleção

### 5.1 Edital de Requisição de Pessoal

| Campo | Detalhe |
|---|---|
| **Nome oficial** | Edital Interno de Requisição de Pessoal |
| **Nome informal** | Edital de requisição |
| **Formato** | PDF |
| **Gatilho** | `[M]` quando `requisicao.situacao = EM_PROCESSO` (aprovada pelo RH) |
| **Dados de entrada** | `requisicao_pessoal_id` |
| **Template** | `edital-requisicao-pessoal.carbone.docx` |
| **Variáveis expostas** | `requisicao.*`, `funcoes_requisitadas[]`, `requisitos`, `prazoInscricao`, `responsavelRH.*` |
| **Base legal** | Legislação municipal; norma interna de R&S |
| **Assinatura digital** | SS |
| **Armazenamento S3** | `recrutamento/editais/{uuid}.pdf`; retenção 5 anos |
| **Evidência de paridade** | Verificar: funções listadas, requisitos, prazos, setor solicitante |

---

### 5.2 Lista de Inscritos

| Campo | Detalhe |
|---|---|
| **Nome oficial** | Relação de Candidatos Inscritos |
| **Nome informal** | Lista de inscritos |
| **Formato** | PDF e XLSX |
| **Gatilho** | `[M]` |
| **Dados de entrada** | `requisicao_pessoal_id`, filtro de situação do candidato |
| **Template** | `lista-inscritos.carbone.docx` / **ExcelJS** |
| **Variáveis expostas** | `requisicao.*`, `candidatos[]` (nome, CPF, dataInscricao, situacao), `totalInscritos` |
| **Base legal** | Norma interna de R&S |
| **Assinatura digital** | — |
| **Armazenamento S3** | `recrutamento/listas/{uuid}.{ext}`; retenção 5 anos |
| **Evidência de paridade** | Comparar: total de inscritos, situação de cada candidato |

---

### 5.3 Convocação para Prova / Entrevista

| Campo | Detalhe |
|---|---|
| **Nome oficial** | Convocação para [Prova \| Entrevista] |
| **Nome informal** | Convocação para prova |
| **Formato** | PDF (individual) ou XLSX (lote) |
| **Gatilho** | `[M]` |
| **Dados de entrada** | `candidato_requisicao_id[]`, data, local, horário |
| **Template** | `convocacao-prova.carbone.docx` |
| **Variáveis expostas** | `candidato.*`, `requisicao.*`, `dataProva`, `local`, `horario`, `orientacoes` |
| **Base legal** | Norma interna de R&S |
| **Assinatura digital** | SS |
| **Armazenamento S3** | `recrutamento/convocacoes/{uuid}.{ext}`; retenção 5 anos |
| **Evidência de paridade** | Verificar: dados do candidato, data/local/horário, requisição referenciada |

---

### 5.4 Ata de Classificação

| Campo | Detalhe |
|---|---|
| **Nome oficial** | Ata de Classificação Final |
| **Nome informal** | Ata de classificação |
| **Formato** | PDF |
| **Gatilho** | `[M]` após conclusão da análise |
| **Dados de entrada** | `requisicao_pessoal_id` |
| **Template** | `ata-classificacao.carbone.docx` |
| **Variáveis expostas** | `requisicao.*`, `candidatos[]` (posicaoClassificacao, nome, pontuacao, situacao), `dataAta`, `comissao[]` |
| **Base legal** | Norma interna; legislação municipal de concursos |
| **Assinatura digital** | SS (assinatura física dos membros da comissão) |
| **Armazenamento S3** | `recrutamento/atas/{uuid}.pdf`; retenção 10 anos |
| **Evidência de paridade** | Verificar: ordem de classificação, pontuações, membros da comissão |

---

### 5.5 Termo de Nomeação

| Campo | Detalhe |
|---|---|
| **Nome oficial** | Termo de Nomeação |
| **Nome informal** | Termo de nomeação |
| **Formato** | PDF |
| **Gatilho** | `[M]` |
| **Dados de entrada** | `candidato_requisicao_id`, dados da nomeação |
| **Template** | `termo-nomeacao.carbone.docx` |
| **Variáveis expostas** | `candidato.*`, `cargo.*`, `lotacao.*`, `dataNomeacao`, `prazoPosse`, `autoridade.*` |
| **Base legal** | Lei n.º 8.112/1990 art. 9; legislação municipal |
| **Assinatura digital** | ICP-Brasil A1 da autoridade ou SS |
| **Armazenamento S3** | `recrutamento/nomeacoes/{uuid}.pdf`; retenção permanente |
| **Evidência de paridade** | Verificar: cargo, prazo para posse, autoridade competente |

---

### 5.6 Contrato de Estágio

| Campo | Detalhe |
|---|---|
| **Nome oficial** | Termo de Compromisso de Estágio |
| **Nome informal** | Contrato de estágio |
| **Formato** | PDF |
| **Gatilho** | `[M]` na criação do `estagiario` |
| **Dados de entrada** | `estagiario_id` |
| **Template** | `contrato-estagio.carbone.docx` |
| **Variáveis expostas** | `estagiario.*`, `programa.*`, `filial.*`, `lotacao.*`, `instituicaoEnsino.*`, `curso.*`, `bolsaValor`, `cargaHoraria`, `dataInicio`, `dataFim`, `supervisorNome`, `orientadorNome` |
| **Base legal** | Lei n.º 9.788/2008 (Lei do Estágio) |
| **Assinatura digital** | SS; assinaturas físicas do estagiário, supervisor, representante da IES |
| **Armazenamento S3** | `recrutamento/estagios/contratos/{uuid}.pdf`; retenção 5 anos após encerramento |
| **Evidência de paridade** | Comparar: dados do estagiário, programa, IES, período, valor da bolsa, carga horária |

---

### 5.7 Termo de Rescisão de Estágio

| Campo | Detalhe |
|---|---|
| **Nome oficial** | Termo de Rescisão de Estágio |
| **Nome informal** | Rescisão de estágio |
| **Formato** | PDF |
| **Gatilho** | `[M]` no desligamento do estagiário |
| **Dados de entrada** | `estagiario_id`, motivo da rescisão, data |
| **Template** | `rescisao-estagio.carbone.docx` |
| **Variáveis expostas** | `estagiario.*`, `motivoRescisao`, `dataRescisao`, `saldoRecesso`, `supervisorNome`, `autoridade.*` |
| **Base legal** | Lei n.º 9.788/2008 art. 11 |
| **Assinatura digital** | SS |
| **Armazenamento S3** | `recrutamento/estagios/rescisoes/{uuid}.pdf`; retenção 5 anos |
| **Evidência de paridade** | Verificar: motivo de rescisão, data, saldo de recesso calculado |

---

## §6 Recadastramento

### 6.1 Comprovante de Recadastramento

| Campo | Detalhe |
|---|---|
| **Nome oficial** | Comprovante de Recadastramento |
| **Nome informal** | Comprovante de recadastramento / prova de vida |
| **Formato** | PDF |
| **Gatilho** | `[M]` apenas quando `beneficiario_recadastramento.status = RECADASTRADO` |
| **Dados de entrada** | `recadastramento_id` |
| **Template** | `comprovante-recadastramento.carbone.docx` |
| **Variáveis expostas** | `beneficiario.*`, `tipo`, `dataRecadastramento`, `operador.*`, `numeroProtocolo`, `proximoVencimento`, `logoUrl` |
| **Base legal** | Art. 69 da Lei n.º 8.212/1991; Resolução MPS/CGPC n.º 8/2004 |
| **Assinatura digital** | SS |
| **Armazenamento S3** | `previdenciario/recadastramento/{uuid}.pdf`; retenção 5 anos |
| **Evidência de paridade** | Comparar: número de protocolo, data, beneficiário, próximo vencimento, operador |

---

### 6.2 Convocação Postal / E-mail

| Campo | Detalhe |
|---|---|
| **Nome oficial** | Notificação de Recadastramento |
| **Nome informal** | Convocação para recadastramento |
| **Formato** | PDF (carta postal) + e-mail HTML |
| **Gatilho** | `[R]` (rotina `daily:prova-vida-proxima-vencer`) ou `[M]` em lote |
| **Dados de entrada** | `campanha_recadastramento_id`, filtro de status (`PERTO_VENCER` \| `NAO_RECADASTRADO`) |
| **Template** | `convocacao-recadastramento.carbone.docx` (postal); `convocacao-recadastramento.html.hbs` (e-mail) |
| **Variáveis expostas** | `beneficiario.*`, `prazoLimite`, `canaisAtendimento[]`, `telefoneContato`, `enderecoUnidade`, `logoUrl` |
| **Base legal** | Art. 69 da Lei n.º 8.212/1991 |
| **Assinatura digital** | — |
| **Armazenamento S3** | `previdenciario/recadastramento/convocacoes/{uuid}.pdf`; retenção 2 anos |
| **Evidência de paridade** | Verificar: prazo limite, canais de atendimento, identificação correta do beneficiário |

---

### 6.3 Relatório de Pendências de Recadastramento

| Campo | Detalhe |
|---|---|
| **Nome oficial** | Relatório de Pendências de Recadastramento |
| **Nome informal** | Relatório de pendências / carteira de recadastramento |
| **Formato** | PDF e XLSX |
| **Gatilho** | `[M]` |
| **Dados de entrada** | `campanha_recadastramento_id`, filtro de status |
| **Template** | `relatorio-pendencias-recadastramento.carbone.docx` / **ExcelJS** |
| **Variáveis expostas** | `campanha.*`, `beneficiarios[]` (nome, CPF, tipo, status, ultimoRecadastramento, proximoVencimento), `totaisPorStatus.*` |
| **Base legal** | Art. 69 da Lei n.º 8.212/1991; Resolução CGPC n.º 8/2004 |
| **Assinatura digital** | — |
| **Armazenamento S3** | `previdenciario/recadastramento/relatorios/{uuid}.{ext}`; retenção 3 anos |
| **Evidência de paridade** | Comparar totais por status (RECADASTRADO / PERTO_VENCER / NAO_RECADASTRADO); contagem de beneficiários |

---

## §7 Avaliação de Desempenho

### 7.1 Ficha de Avaliação Preenchida

| Campo | Detalhe |
|---|---|
| **Nome oficial** | Ficha de Avaliação de Desempenho |
| **Nome informal** | Ficha de avaliação |
| **Formato** | PDF |
| **Gatilho** | `[M]` após finalização da avaliação |
| **Dados de entrada** | `avaliacao_desempenho_id` |
| **Template** | `ficha-avaliacao-desempenho.carbone.docx` |
| **Variáveis expostas** | `servidor.*`, `avaliador.*`, `periodo.*`, `criterios[]` (descricao, nota, peso), `notaFinal`, `parecer`, `dataAvaliacao` |
| **Base legal** | Estatuto do servidor; Plano de Cargos Carreiras e Remuneração (PCCR) local |
| **Assinatura digital** | SS; assinaturas físicas do avaliado e avaliador |
| **Armazenamento S3** | `avaliacao/fichas/{uuid}.pdf`; retenção 10 anos |
| **Evidência de paridade** | Comparar: critérios avaliados, notas, nota final, avaliador, data |

---

### 7.2 Relatório Consolidado por Ciclo

| Campo | Detalhe |
|---|---|
| **Nome oficial** | Relatório Consolidado de Avaliação de Desempenho |
| **Nome informal** | Relatório de avaliação por ciclo |
| **Formato** | PDF e XLSX |
| **Gatilho** | `[M]` ao encerrar ciclo |
| **Dados de entrada** | `ciclo_id`, `lotacao_id[]`, `cargo_id[]` (opcional) |
| **Template** | `relatorio-avaliacao-ciclo.carbone.docx` / **ExcelJS** |
| **Variáveis expostas** | `ciclo.*`, `lotacoes[]`, `servidores[]` (notaFinal, resultado, apto_progressao), `distribuicaoNotas`, `mediaGeral` |
| **Base legal** | PCCR local; estatuto do servidor |
| **Assinatura digital** | — |
| **Armazenamento S3** | `avaliacao/relatorios-ciclo/{uuid}.{ext}`; retenção 10 anos |
| **Evidência de paridade** | Comparar: média geral, distribuição de notas, número de aptos para progressão |

---

## §8 Convênio

### 8.1 Demonstrativo de Consumo de Convênio

| Campo | Detalhe |
|---|---|
| **Nome oficial** | Demonstrativo de Consumo — Convênio |
| **Nome informal** | Demonstrativo de convênio |
| **Formato** | PDF e XLSX |
| **Gatilho** | `[M]` |
| **Dados de entrada** | `convenio_id`, `competencia_id` |
| **Template** | `demonstrativo-convenio.carbone.docx` / **ExcelJS** |
| **Variáveis expostas** | `convenio.*`, `competencia.*`, `beneficiarios[]` (nome, matricula, valor), `totalConsumo`, `saldoDisponivel` |
| **Base legal** | Contrato do convênio; normas internas |
| **Assinatura digital** | — |
| **Armazenamento S3** | `convenio/{uuid}.{ext}`; retenção 5 anos |
| **Evidência de paridade** | Comparar: total de beneficiários, valor total consumido por competência |

---

### 8.2 Autorização Prévia de Convênio

| Campo | Detalhe |
|---|---|
| **Nome oficial** | Autorização Prévia de Uso de Convênio |
| **Nome informal** | Autorização de convênio |
| **Formato** | PDF |
| **Gatilho** | `[M]` |
| **Dados de entrada** | `convenio_beneficiario_id`, período de autorização, limite aprovado |
| **Template** | `autorizacao-convenio.carbone.docx` |
| **Variáveis expostas** | `beneficiario.*`, `convenio.*`, `periodoAutorizacao.*`, `limiteAprovado`, `responsavelAprovacao.*`, `dataAutorizacao` |
| **Base legal** | Contrato do convênio |
| **Assinatura digital** | SS |
| **Armazenamento S3** | `convenio/autorizacoes/{uuid}.pdf`; retenção 5 anos |
| **Evidência de paridade** | Verificar: beneficiário, convenio, período, limite aprovado, responsável pela aprovação |

---

## §9 Governo Federal

### 9.1 DIRF — Declaração do Imposto de Renda Retido na Fonte

| Campo | Detalhe |
|---|---|
| **Nome oficial** | DIRF — Declaração do Imposto de Renda Retido na Fonte |
| **Nome informal** | DIRF |
| **Formato** | TXT (leiaute RFB ano corrente) + PDF (relatório auxiliar) |
| **Gatilho** | `[M]` anual (jan–fev do ano seguinte) |
| **Dados de entrada** | `ano_base`, `filial_id[]`, dados do declarante (CNPJ, nome, responsável) |
| **Template** | Builder TypeScript `DirfTxtBuilder`; leiaute RFB vigente em `src/layouts/dirf/{ano}/`; `dirf-relatorio.carbone.docx` (PDF auxiliar) |
| **Variáveis expostas** | Registros: `DIRF`, `IDREC`, `INFDI`, `BPFDEC`, `RTRT`, `RTPR`, `RTIRF`, `RTIOG`, totalizadores |
| **Base legal** | IN RFB n.º 1.990/2020 e atualizações anuais; Lei n.º 9.250/1995 |
| **Assinatura digital** | — (assinatura digital aplicada no PGD-DIRF pelo declarante) |
| **Armazenamento S3** | `fiscal/dirf/{ano}/{uuid}.txt`; `fiscal/dirf/{ano}/{uuid}.pdf`; retenção 10 anos; Object Lock |
| **Evidência de paridade** | Comparar TXT campo a campo com arquivo legado: total de beneficiários, base de cálculo IRRF, total retido, deduções de dependentes |

---

### 9.2 RAIS — Relação Anual de Informações Sociais

| Campo | Detalhe |
|---|---|
| **Nome oficial** | RAIS — Relação Anual de Informações Sociais |
| **Nome informal** | RAIS |
| **Formato** | TXT (leiaute histórico MTE) |
| **Gatilho** | `[M]` anual |
| **Dados de entrada** | `ano_base`, `filial_id[]` |
| **Template** | Builder TypeScript `RaisTxtBuilder`; leiaute MTE vigente |
| **Variáveis expostas** | Registros de estabelecimento, vínculos, remunerações mensais, motivo de desligamento |
| **Base legal** | Decreto n.º 76.900/1975; Portaria MTE anual |
| **Assinatura digital** | — (transmissão via GDRAIS) |
| **Armazenamento S3** | `fiscal/rais/{ano}/{uuid}.txt`; retenção 10 anos |
| **Evidência de paridade** | Comparar: total de vínculos declarados, remunerações mensais acumuladas, motivos de desligamento |

---

### 9.3 eSocial — Eventos (Referência Cruzada)

| Campo | Detalhe |
|---|---|
| **Nome oficial** | Eventos eSocial S-1.2 |
| **Nome informal** | eSocial |
| **Formato** | XML (leiautes S-1000, S-1005, S-1010, S-1020, S-1030, S-1035, S-1040, S-1050, S-1060, S-1070, S-1080, S-2200, S-2205, S-2206, S-2210, S-2220, S-2230, S-2240, S-2299, S-2300, S-2399, S-1200, S-1202, S-1210, S-1299, S-2501, S-5001 a S-5013, S-3000) |
| **Gatilho** | `[E]` (evento de domínio interno) ou `[M]` (reenvio manual) |
| **Dados de entrada** | Entidade de origem (funcionario, folha, acidente, etc.), `competencia_id` |
| **Template** | `SocialEventXmlBuilder` em `sgp-esocial-worker` |
| **Variáveis expostas** | Conforme XSD eSocial S-1.2 |
| **Base legal** | Resolução CG-eSocial n.º 19/2022; IN RFB n.º 2.043/2021; leiautes S-1.2 |
| **Assinatura digital** | ICP-Brasil A1 (e-CNPJ) — obrigatório para transmissão |
| **Armazenamento S3** | `esocial/{tipo_evento}/{ano}/{mes}/{uuid}.xml`; retenção 10 anos; Object Lock |
| **Referência cruzada** | Ver documento `42-esocial-eventos.md` para mapeamento completo evento × entidade × trigger |
| **Evidência de paridade** | Validar XSD; comparar com XML gerado pelo legado: totais de trabalhadores por evento, valores de remuneração S-1200 |

---

### 9.4 PIS / PASEP

| Campo | Detalhe |
|---|---|
| **Nome oficial** | Declaração de PIS/PASEP |
| **Nome informal** | PIS / PASEP |
| **Formato** | TXT ou XLSX (conforme sistema receptor) |
| **Gatilho** | `[M]` |
| **Dados de entrada** | `competencia_id`, `filial_id[]` |
| **Template** | Builder TypeScript `PisPasepBuilder` |
| **Variáveis expostas** | NIT/PIS/PASEP, nome, salário de contribuição, competência, banco pagador |
| **Base legal** | Lei Complementar n.º 7/1970 (PIS); Lei Complementar n.º 8/1970 (PASEP); Lei n.º 7.998/1990 |
| **Assinatura digital** | — |
| **Armazenamento S3** | `fiscal/pis-pasep/{ano}/{mes}/{uuid}.{ext}`; retenção 5 anos |
| **Evidência de paridade** | Comparar: total de trabalhadores, base de salário declarada |

---

## §10 Transparência

### 10.1 Publicação Mensal de Folha Pública (JSON / CSV)

| Campo | Detalhe |
|---|---|
| **Nome oficial** | Dados Abertos — Folha de Pagamento |
| **Nome informal** | Folha pública / portal transparência |
| **Formato** | CSV e JSON |
| **Gatilho** | `[R]` pós-fechamento de folha (rotina mensal) ou `[M]` |
| **Dados de entrada** | `competencia_id`, regras de anonimização/exposição por tenant |
| **Template** | Builder TypeScript `TransparenciaFolhaBuilder`; campos conforme LAI e portaria CGU |
| **Variáveis expostas** | nome, cargo, lotacao, vinculo_tipo, remuneração_bruta, descontos_totais, liquido (sem CPF, sem dados bancários) |
| **Base legal** | Lei n.º 9.527/2011 (LAI); Portaria CGU n.º 1.547/2021; Decreto n.º 7.724/2012 |
| **Assinatura digital** | — |
| **Armazenamento S3** | `transparencia/{ano}/{mes}/{uuid}.{ext}`; bucket público (read-only); retenção permanente |
| **Evidência de paridade** | Comparar com arquivo legado: total de registros, colunas presentes, ausência de CPF e dados bancários |

---

### 10.2 API Pública de Consulta

| Campo | Detalhe |
|---|---|
| **Nome oficial** | API Pública de Transparência do SGP |
| **Nome informal** | API de transparência / portal transparência API |
| **Formato** | JSON (REST) |
| **Gatilho** | `[A]` (chamada HTTP pública) |
| **Dados de entrada** | `tenant_slug`, `competencia`, `nome` (filtro opcional), paginação |
| **Endpoint** | `GET /api/publico/v1/{tenant}/transparencia/folha` |
| **Variáveis expostas** | Mesmas do item 9.1; resposta paginada com metadados |
| **Base legal** | Lei n.º 9.527/2011 (LAI); Decreto n.º 7.724/2012 |
| **Autenticação** | Pública (sem autenticação); rate limiting via API Gateway |
| **Assinatura digital** | — |
| **Armazenamento S3** | Cache CloudFront; dados servidos do bucket público 9.1 |
| **Evidência de paridade** | Verificar: dados retornados equivalentes ao CSV; paginação funcional; campos de anonimização aplicados |

---

## §11 Gerenciais

### 11.1 Headcount por Lotação

| Campo | Detalhe |
|---|---|
| **Nome oficial** | Relatório de Headcount por Lotação |
| **Nome informal** | Headcount / quadro de pessoal |
| **Formato** | PDF e XLSX |
| **Gatilho** | `[M]` |
| **Dados de entrada** | `data_referencia`, `filial_id[]`, `vinculo_tipo[]` (opcional) |
| **Template** | `headcount-lotacao.carbone.docx` / **ExcelJS** |
| **Variáveis expostas** | `dataReferencia`, `lotacoes[]` (nome, totalAtivos, totalAfastados, totalDesligados, composicaoVinculo[]), `totalGeral` |
| **Base legal** | Controle interno; LRF (Lei n.º 101/2000) para limites de pessoal |
| **Assinatura digital** | — |
| **Armazenamento S3** | `gerencial/headcount/{uuid}.{ext}`; retenção 3 anos |
| **Evidência de paridade** | Comparar: total de servidores ativos por lotação, distribuição por tipo de vínculo |

---

### 11.2 Folha por Fonte de Recursos (Gerencial)

| Campo | Detalhe |
|---|---|
| **Nome oficial** | Relatório Gerencial de Folha por Fonte de Recursos |
| **Nome informal** | Folha por fonte (gerencial) |
| **Formato** | PDF e XLSX |
| **Gatilho** | `[M]` |
| **Dados de entrada** | `competencia_id`, `filial_id[]` |
| **Template** | `gerencial-folha-por-fonte.carbone.docx` / **ExcelJS** |
| **Variáveis expostas** | `fontes[]` (codigo, descricao, totalBruto, totalDesconto, totalLiquido, percentualTotal), `totalGeral` |
| **Base legal** | Lei n.º 4.320/1964; LRF |
| **Assinatura digital** | — |
| **Armazenamento S3** | `gerencial/folha-por-fonte/{uuid}.{ext}`; retenção 5 anos |
| **Evidência de paridade** | Comparar totais por fonte; percentuais de distribuição |

---

### 11.3 Demonstrativo para Prefeito / Secretário

| Campo | Detalhe |
|---|---|
| **Nome oficial** | Demonstrativo Executivo de Pessoal e Folha |
| **Nome informal** | Demonstrativo para prefeito / relatório executivo |
| **Formato** | PDF (layout executivo com gráficos) |
| **Gatilho** | `[M]` |
| **Dados de entrada** | `competencia_id`, `filial_id[]` |
| **Template** | `demonstrativo-executivo.carbone.docx` |
| **Variáveis expostas** | `competencia.*`, `totalFolha`, `evolucaoMensal[]`, `headcount.*`, `topVerbas[]`, `custoPorLotacao[]`, `graficos[]` (gerados server-side via Chart.js/SVG) |
| **Base legal** | Controle interno; LRF |
| **Assinatura digital** | — |
| **Armazenamento S3** | `gerencial/executivo/{uuid}.pdf`; retenção 3 anos |
| **Evidência de paridade** | Verificar: totais consistentes com resumo de folha; gráficos com dados corretos |

---

### 11.4 Indicadores de RH

| Campo | Detalhe |
|---|---|
| **Nome oficial** | Painel de Indicadores de RH |
| **Nome informal** | Indicadores de RH |
| **Formato** | PDF e XLSX |
| **Gatilho** | `[M]` ou `[R]` mensal |
| **Dados de entrada** | `periodo_inicio`, `periodo_fim`, `filial_id[]` |
| **Template** | `indicadores-rh.carbone.docx` / **ExcelJS** |
| **Variáveis expostas** | `turnover`, `absenteismo`, `evolucaoHeadcount[]`, `distribuicaoVinculo[]`, `custoMedioServidor`, `quantidadeAfastamentos`, `topCids[]` |
| **Base legal** | Controle interno |
| **Assinatura digital** | — |
| **Armazenamento S3** | `gerencial/indicadores-rh/{uuid}.{ext}`; retenção 3 anos |
| **Evidência de paridade** | Comparar: turnover, absenteísmo e headcount calculados com mesma metodologia do legado |

---

## §12 Controle de Versão de Templates

### 12.1 Repositório e Estrutura

Todos os templates de relatório residem no repositório `sgp-templates`, sub-repositório do monorepo, em:

```
sgp-templates/
  templates/
    {dominio}/
      {slug-do-template}/
        v{N}/
          {slug-do-template}.carbone.docx   ← template Carbone
          {slug-do-template}.schema.json    ← JSON Schema dos dados de entrada
          {slug-do-template}.sample.json    ← amostra de dados para preview
          CHANGELOG.md                      ← histórico de alterações
  layouts/
    cnab/{banco_id}/cnab240.layout.ts
    dirf/{ano}/dirf.layout.ts
    siprev/siprev.layout.ts
```

### 12.2 Ciclo de Vida de um Template

```mermaid
flowchart LR
  A[Rascunho\n(branch feature/template-*)] --> B[Preview automatizado\nvs. amostra JSON]
  B --> C[Revisão técnica\n(PR review)]
  C --> D[Homologação\nvs. saída legada]
  D --> E{Aprovado?}
  E -- Sim --> F[Merge em main\ntag v{N}]
  E -- Não --> A
  F --> G[Deploy staging\nsmoke test]
  G --> H[Deploy produção\nflag ativa por tenant]
```

### 12.3 Versionamento Semântico de Templates

| Tipo de mudança | Incremento |
|---|---|
| Correção de layout sem impacto nos campos | PATCH (v1.0.1) |
| Adição de campo opcional ou seção nova | MINOR (v1.1.0) |
| Remoção de campo obrigatório ou mudança estrutural | MAJOR (v2.0.0) |

- A versão do template é gravada no metadado S3 do arquivo gerado (`x-amz-meta-template-version`).
- Templates com versão MAJOR requerem aprovação da equipe de produto e do responsável jurídico/contábil do tenant.

### 12.4 Quem Aprova

| Tipo de template | Aprovador técnico | Aprovador de negócio |
|---|---|---|
| Contracheques e folha | Engenheiro sênior de folha | Coordenador de RH/Folha do cliente |
| Certidões e portarias previdenciárias | Engenheiro sênior + advogado | Diretor do RPPS |
| Laudos e documentos de saúde | Engenheiro sênior | Médico coordenador da junta |
| Obrigações acessórias (DIRF, RAIS, SIPREV) | Engenheiro + contador | Contador responsável |
| Relatórios gerenciais | Engenheiro | Gestor de RH |

### 12.5 Processo de Homologação contra o Legado

1. **Captura legado:** gerar o documento equivalente no sistema legado com os mesmos dados de entrada (matrícula, competência, filtros).
2. **Geração novo:** acionar o endpoint correspondente no ambiente de homologação com os mesmos parâmetros.
3. **Comparação automatizada:**
   - Para PDFs: usar `pdf-compare` (diff visual pixel-a-pixel) + extração de texto (`pdftotext`) e diff de campos.
   - Para TXT/CSV/XLSX: diff linha a linha com tolerância declarada por campo.
   - Para XML: validar XSD + diff de nós com tolerância numérica.
4. **Registro de evidências:** preencher planilha de evidências (`39-pacote-de-evidencias-para-saidas-oficiais.md`).
5. **Aprovação:** responsável de negócio assina a planilha (digital ou física).
6. **Arquivamento:** evidências armazenadas em S3 `homologacao/evidencias/{slug}/{version}/{uuid}.*`.

### 12.6 Arquivamento Histórico de Templates

- Versões anteriores de templates **nunca são deletadas** do repositório (git history).
- No S3 de outputs, cada arquivo gerado carrega a versão do template em metadado.
- Para reemissão de documentos históricos, a versão do template vigente na data de emissão original deve ser usada (rastreável pelo metadado S3).
- Templates obsoletos (substituídos por MAJOR) são marcados como `deprecated` mas mantidos por 10 anos para fins de reemissão.

---

## §13 Matriz Saída × Papel Autorizado × Evento de Auditoria

### 13.1 Legenda de Papéis

| Papel (ROLE_*) | Descrição |
|---|---|
| `RELATORIO_FOLHA_PAGAMENTO.GESTAO` | Gestão total de relatórios de folha |
| `FOLHA_DE_PGT.GESTAO` | Gestão total da folha de pagamento |
| `RELATORIO_VERBAS.GESTAO` | Gestão de relatórios de verbas |
| `RELATORIO_BATIMENTO_FOLHA.GESTAO` | Batimento de folha |
| `RELATORIO_PROVENTOS_DESCONTOS.GESTAO` | Proventos e descontos |
| `RELATORIO_REPASSE_FUNDO_RH.GESTAO` | Repasse fundo RH |
| `RELATORIO_GERENCIAL.GESTAO` | Relatórios gerenciais |
| `ARQUIVO_REMESSA.GESTAO` | Arquivos de remessa bancária |
| `ARQUIVO_EXPORTACAO_SIPREV.GESTAO` | Exportação SIPREV |
| `DIRF.GESTAO` | DIRF |
| `RELATORIO_APOSENTADO_PENSAO.GESTAO` | Relatórios previdenciários |
| `RELATORIO_SERV_PAG_BLOQUEADO.GESTAO` | Servidores com bloqueio |
| `RECADASTRAMENTO.GESTAO` | Recadastramento |
| `PERICIA_MEDICA.GESTAO` | Perícia médica |
| `AGENDA_MEDICA.GESTAO` | Agenda médica |
| `ROLE_EXTERNAL_SYSTEM` | Sistema externo (API client-credentials) |
| `AUDITORIA.GESTAO` | Acesso à trilha de auditoria |
| Qualquer usuário autenticado com acesso ao módulo | `[SELF]` — servidor consultando próprio dado |

### 13.2 Matriz Completa

| § | Saída | Papel(éis) autorizado(s) | Evento de auditoria gravado |
|---|---|---|---|
| 1.1 | Contracheque servidor (mensal/13.º/férias/rescisão) | `FOLHA_DE_PGT.GESTAO`, `[SELF]` (portal) | `PRINT` em `audit_log` (domínio: folha) |
| 1.2 | Contracheque pensionista | `FOLHA_DE_PGT.GESTAO`, `[SELF]` (portal) | `PRINT` |
| 1.3 | Contracheque retroativo (republicado) | `FOLHA_DE_PGT.GESTAO` | `PRINT` + nota de reemissão |
| 1.4 | Relatório de folha resumo | `RELATORIO_FOLHA_PAGAMENTO.GESTAO` | `EXPORT` |
| 1.5 | Relatório de folha por lotação | `RELATORIO_FOLHA_PAGAMENTO.GESTAO` | `EXPORT` |
| 1.6 | Relatório de folha por verba | `RELATORIO_VERBAS.GESTAO` | `EXPORT` |
| 1.7 | Relatório de folha por fonte de recursos | `RELATORIO_REPASSE_FUNDO_RH.GESTAO` | `EXPORT` |
| 1.8 | Ficha financeira anual | `RELATORIO_FOLHA_PAGAMENTO.GESTAO`, `[SELF]` | `EXPORT` |
| 1.9 | Relatório de consignados | `RELATORIO_PROVENTOS_DESCONTOS.GESTAO` | `EXPORT` |
| 1.10 | Demonstrativo de diferenças (retroativo) | `FOLHA_DE_PGT.GESTAO` | `EXPORT` |
| 1.11 | CNAB 240/400 remessa | `ARQUIVO_REMESSA.GESTAO` | `EXPORT` (domínio: bancario) |
| 1.12 | CNAB retorno (conciliação) | `ARQUIVO_REMESSA.GESTAO` | `EXPORT` |
| 1.13 | Arquivo de contabilidade | `FOLHA_DE_PGT.GESTAO` | `EXPORT` |
| 2.1 | CTC — Certidão de Tempo de Contribuição | `RELATORIO_APOSENTADO_PENSAO.GESTAO` | `EXPORT` + `PRINT` (domínio: previdenciário) |
| 2.2 | Simulação de aposentadoria | `RELATORIO_APOSENTADO_PENSAO.GESTAO`, `[SELF]` | `PRINT` |
| 2.3 | Parecer técnico de aposentadoria | `RELATORIO_APOSENTADO_PENSAO.GESTAO` | `CREATE` + `PRINT` |
| 2.4 | Parecer jurídico | `RELATORIO_APOSENTADO_PENSAO.GESTAO` | `CREATE` + `PRINT` |
| 2.5 | Portaria de concessão (aposentadoria/pensão) | `RELATORIO_APOSENTADO_PENSAO.GESTAO` | `CREATE` + `PRINT` |
| 2.6 | Ficha de pensão | `RELATORIO_APOSENTADO_PENSAO.GESTAO` | `PRINT` |
| 2.7 | Extrato SIPREV | `ARQUIVO_EXPORTACAO_SIPREV.GESTAO` | `EXPORT` |
| 2.8 | Remessa SIPREV mensal | `ARQUIVO_EXPORTACAO_SIPREV.GESTAO` | `EXPORT` |
| 2.9 | Compensação previdenciária (COMPREV) | `RELATORIO_APOSENTADO_PENSAO.GESTAO` | `EXPORT` + `PRINT` |
| 3.1 | Ficha funcional completa (dossiê) | `MODULO_RH.VISUALIZAR`, `MODULO_RH.GESTAO` | `EXPORT` (domínio: rh) |
| 3.2 | Ficha de posse (Termo de posse) | `POSSE_EFETIVO`, `POSSE_COMISSIONADO`, `POSSE_CONTRATADO` | `PRINT` |
| 3.3 | Declaração de vínculo | `MODULO_RH.VISUALIZAR`, `[SELF]` | `PRINT` |
| 3.4 | Declaração de tempo de serviço | `MODULO_RH.GESTAO` | `PRINT` |
| 3.5 | Certidão negativa | `MODULO_RH.GESTAO` | `PRINT` |
| 3.6 | Atestado de frequência | `MODULO_RH.VISUALIZAR` | `PRINT` |
| 3.7 | Carteira funcional (crachá) | `MODULO_RH.GESTAO` | `PRINT` |
| 3.8 | Portaria (admissão/exoneração/licença/progressão) | `MODULO_RH.GESTAO` | `CREATE` + `PRINT` |
| 3.9 | Termo de compromisso | `MODULO_RH.GESTAO` | `CREATE` + `PRINT` |
| 3.10 | Memorando interno | `MODULO_RH.CADASTRAR` | `CREATE` |
| 4.1 | Laudo pericial | `PERICIA_MEDICA.GESTAO` | `CREATE` + `PRINT` (domínio: saude) |
| 4.2 | Atestado médico — recibo | `PERICIA_MEDICA.GESTAO` | `CREATE` |
| 4.3 | CAT (PDF + XML S-2210) | `PERICIA_MEDICA.GESTAO` | `CREATE` + `EXPORT` |
| 4.4 | PPP | `PERICIA_MEDICA.GESTAO` | `PRINT` |
| 4.5 | Encaminhamento pericial | `PERICIA_MEDICA.GESTAO` | `CREATE` |
| 4.6 | Agenda médica PDF diária | `AGENDA_MEDICA.GESTAO` | `PRINT` |
| 5.1 | Edital de requisição de pessoal | `RECRUTAMENTO_SELECAO.GESTAO` | `PRINT` (domínio: recrutamento) |
| 5.2 | Lista de inscritos | `RECRUTAMENTO_SELECAO.GESTAO` | `EXPORT` |
| 5.3 | Convocação para prova | `RECRUTAMENTO_SELECAO.GESTAO` | `EXPORT` |
| 5.4 | Ata de classificação | `RECRUTAMENTO_SELECAO.GESTAO` | `CREATE` + `PRINT` |
| 5.5 | Termo de nomeação | `RECRUTAMENTO_SELECAO.GESTAO` | `CREATE` + `PRINT` |
| 5.6 | Contrato de estágio | `RECRUTAMENTO_SELECAO.GESTAO` | `CREATE` + `PRINT` |
| 5.7 | Termo de rescisão de estágio | `RECRUTAMENTO_SELECAO.GESTAO` | `CREATE` + `PRINT` |
| 6.1 | Comprovante de recadastramento | `RECADASTRAMENTO.GESTAO`, `[SELF]` | `PRINT` (domínio: previdenciário) |
| 6.2 | Convocação postal/e-mail | `RECADASTRAMENTO.GESTAO` | `EXPORT` |
| 6.3 | Relatório de pendências | `RECADASTRAMENTO.GESTAO` | `EXPORT` |
| 7.1 | Ficha de avaliação preenchida | `MODULO_AVALIACAO.GESTAO` | `PRINT` (domínio: avaliacao) |
| 7.2 | Relatório consolidado por ciclo | `MODULO_AVALIACAO.GESTAO` | `EXPORT` |
| 8.1 | Demonstrativo de consumo de convênio | `CONVENIO.GESTAO` | `EXPORT` (domínio: convenio) |
| 8.2 | Autorização prévia de convênio | `CONVENIO.GESTAO` | `CREATE` |
| 9.1 | DIRF (TXT + PDF) | `DIRF.GESTAO` | `EXPORT` (domínio: fiscal) |
| 9.2 | RAIS (TXT) | `DIRF.GESTAO` | `EXPORT` |
| 9.3 | eSocial eventos (XML) | `ROLE_EXTERNAL_SYSTEM`, `FOLHA_DE_PGT.GESTAO` | `EXPORT` (domínio: esocial) |
| 9.4 | PIS/PASEP | `DIRF.GESTAO` | `EXPORT` |
| 10.1 | Publicação folha pública (JSON/CSV) | `FOLHA_DE_PGT.GESTAO` (geração); público (leitura) | `EXPORT` |
| 10.2 | API pública de consulta | Pública (sem autenticação) | — (acesso público não auditado) |
| 11.1 | Headcount por lotação | `RELATORIO_GERENCIAL.GESTAO` | `EXPORT` |
| 11.2 | Folha por fonte de recursos (gerencial) | `RELATORIO_GERENCIAL.GESTAO` | `EXPORT` |
| 11.3 | Demonstrativo para prefeito/secretário | `RELATORIO_GERENCIAL.GESTAO` | `EXPORT` |
| 11.4 | Indicadores de RH | `RELATORIO_GERENCIAL.GESTAO` | `EXPORT` |

### 13.3 Estrutura do Registro de Auditoria para Saídas

Cada evento de `EXPORT` ou `PRINT` grava em `audit_log`:

```jsonc
{
  "tenant_id": "<uuid>",
  "timestamp": "2026-04-21T10:30:00Z",
  "usuario_id": "<uuid>",
  "dominio": "folha",               // domínio do bounded context
  "entidade": "contracheque",       // entidade principal
  "entidade_id": "<uuid>",          // ID do objeto emitido
  "acao": "PRINT",                  // CREATE | UPDATE | DELETE | EXPORT | PRINT
  "diff_jsonb": {                   // parâmetros de entrada usados na geração
    "competencia_id": "<uuid>",
    "funcionario_id": "<uuid>",
    "tipo_processamento": "MENSAL",
    "template_version": "1.2.3",
    "s3_key": "folha/2026/04/contracheque/servidor/<uuid>.pdf"
  },
  "ip": "192.168.1.1",
  "user_agent": "Mozilla/5.0...",
  "request_id": "<uuid>"
}
```

---

## §14 Sucessão de Saídas Provadas em 2026-04-26

Os novos artefatos reversos confirmam saídas documentais e operacionais que já têm destino canônico neste catálogo. A tabela abaixo é o registro de sucessão; documentos não listados continuam como evidência até nova decisão de owner.

| Evidência reversa | Saída canônica | Critério de paridade |
|---|---|---|
| `modules/funcionario/mapa-fino.md` e `pessoa-x-vinculo.md` | Ficha funcional, dossiê do servidor, documento de amparo e histórico operacional (§3) | CPF/pessoa, matrícula/vínculo, lotação, cargo/função, situação funcional, documentos e eventos da vida funcional devem reconciliar com o legado por servidor amostrado. |
| `modules/folha/mapa-fino.md` | Contracheque servidor/pensionista, resumo de folha, folha por lotação/verba/fonte, ficha financeira, CNAB, DIRF/SIPREV/eSocial (§1 e §9) | Totais por verba, líquido, contagens por folha, layout de remessa e PDFs devem respeitar as tolerâncias de §1 e do guia de migração. |
| `modules/folha/calculo/*` | Relatório de reconciliação de fórmulas e memória de cálculo (§1, §11.3 de `62-estrategia-testes.md`, §6 de `63-guia-migracao-legado.md`) | A ordem de cálculo, dependências, atributos e divergências devem ser arquivados com a competência e o contracheque usados no shadow mode. |
| `modules/pericias/*` | Laudo pericial, licença médica, encaminhamento especializado, documentos de SST (§4) | CID, tipo de laudo, dias concedidos, restrições, decisão homologada e anexos clínicos devem ser íntegros e auditáveis. |
| `modules/recadastramento/*` | Comprovante, notificação e relatório de pendências de recadastramento (§6) | Status por beneficiário, protocolo, próximo vencimento, comprovante e histórico de ligações devem bater com a campanha de origem. |
| `modules/recrutamento/*` | Edital/relatório de requisição, resultado de análise, termo de nomeação, contrato/prorrogação/rescisão de estágio (§5) | Demanda aprovada, candidatos vinculados, decisão curricular e eventos de estágio devem preservar histórico e responsável. |
| `data-archaeology/dumps-eixo-folha-tabelas.md` | Anexos, modelos de documento e evidências de saída | Tabelas documentais genéricas são insumo de migração; saída oficial só nasce quando mapeada neste catálogo ou em ADR posterior. |

---

## Apêndice A — Engines e Dependências de Geração

| Engine | Uso | Pacote npm |
|---|---|---|
| **Carbone v3** | PDFs via template DOCX/ODS → LibreOffice headless | `carbone` |
| **ExcelJS** | XLSX programático | `exceljs` |
| **PDFKit** | PDFs programáticos simples (crachá, recibos pequenos) | `pdfkit` |
| **Chart.js** (server-side) | Gráficos SVG para relatórios executivos | `chartjs-node-canvas` |
| **xmlbuilder2** | XML eSocial, SIPREV, CAT | `xmlbuilder2` |
| **fast-xml-parser** | Parse de retorno eSocial | `fast-xml-parser` |
| **Handlebars** | Templates de e-mail HTML (convocações, notificações) | `handlebars` |

---

## Apêndice B — Retenção e Imutabilidade S3

| Categoria de saída | Retenção mínima | Object Lock (WORM) | Justificativa |
|---|---|---|---|
| Contracheques (servidor e pensionista) | 10 anos | Sim | Prescrição trabalhista/previdenciária |
| Certidões previdenciárias (CTC, COMPREV) | Permanente | Sim | Valor legal permanente |
| Portarias (todos os tipos) | Permanente | Sim | Ato administrativo oficial |
| Laudos periciais | Permanente | Sim | Responsabilidade médico-legal |
| PPP | Permanente | Sim | Obrigação INSS/eSocial |
| CAT (PDF + XML) | Permanente | Sim | Obrigação legal Lei 8.213/91 |
| DIRF (TXT + PDF) | 10 anos | Sim | Prescrição tributária |
| SIPREV (XML) | 10 anos | Sim | Fiscalização MPS |
| CNAB remessa | 10 anos | Sim | Controle financeiro |
| eSocial eventos (XML) | 10 anos | Sim | Obrigação legal RFB |
| Relatórios gerenciais | 3–5 anos | Não | Controle interno |
| Simulações de aposentadoria | 5 anos | Não | Informativo |
| Agendas médicas | 2 anos | Não | Controle operacional |
| Folha pública (transparência) | Permanente | Não (bucket público) | LAI |

---

## Apêndice C — Glossário de Termos Técnicos

| Termo | Definição |
|---|---|
| **Carbone** | Engine de relatórios que compila templates DOCX/ODS com marcadores `{d.campo}` para PDF via LibreOffice headless |
| **CNAB** | Padrão de troca de arquivos da FEBRABAN para remessa e retorno bancário (240 ou 400 posições) |
| **COMPREV** | Compensação financeira entre regimes previdenciários (RGPS ↔ RPPS) |
| **CTC** | Certidão de Tempo de Contribuição — prova período de filiação a regime previdenciário |
| **ICP-Brasil** | Infraestrutura de Chaves Públicas Brasileira — autoridade raiz de certificados digitais A1/A3 |
| **Object Lock (WORM)** | Recurso S3 que impede exclusão ou sobrescrita de objetos por período definido |
| **PDF/A-1b** | Subconjunto ISO do PDF para arquivamento de longo prazo |
| **PPP** | Perfil Profissiográfico Previdenciário — documento que comprova exposição a agentes nocivos |
| **RPPS** | Regime Próprio de Previdência Social — regime previdenciário dos servidores públicos |
| **SS** | Self-signed — hash SHA-256 dos dados gravados internamente sem ICP-Brasil |
| **SSE-KMS** | Server-Side Encryption com AWS Key Management Service |
| **WORM** | Write Once Read Many — imutabilidade de armazenamento |
