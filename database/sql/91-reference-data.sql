SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

INSERT INTO esocial.response_classification VALUES
	('101', 'RECOVERABLE', 'Lote Aguardando Processamento.', '2026-05-02 11:00:31.302578-03', '2026-05-02 11:00:31.302578-03'),
	('201', 'ACCEPTED', 'Sucesso.', '2026-05-02 11:00:31.302578-03', '2026-05-02 11:00:31.302578-03'),
	('202', 'ACCEPTED', 'Sucesso com advertencia.', '2026-05-02 11:00:31.302578-03', '2026-05-02 11:00:31.302578-03'),
	('301', 'RECOVERABLE', 'Erro servidor.', '2026-05-02 11:00:31.302578-03', '2026-05-02 11:00:31.302578-03'),
	('401', 'DEFINITIVE', 'Erro no conteudo do evento.', '2026-05-02 11:00:31.302578-03', '2026-05-02 11:00:31.302578-03'),
	('402', 'DEFINITIVE', 'Schema invalido.', '2026-05-02 11:00:31.302578-03', '2026-05-02 11:00:31.302578-03'),
	('403', 'DEFINITIVE', 'Leiaute invalido.', '2026-05-02 11:00:31.302578-03', '2026-05-02 11:00:31.302578-03'),
	('404', 'DEFINITIVE', 'Erro do certificado digital da assinatura do evento.', '2026-05-02 11:00:31.302578-03', '2026-05-02 11:00:31.302578-03'),
	('405', 'DEFINITIVE', 'Erro na assinatura evento.', '2026-05-02 11:00:31.302578-03', '2026-05-02 11:00:31.302578-03'),
	('406', 'DEFINITIVE', 'Evento nao pertence ao grupo especificado no lote de eventos.', '2026-05-02 11:00:31.302578-03', '2026-05-02 11:00:31.302578-03'),
	('407', 'RECOVERABLE', 'Regra de precedencia na transmissao de eventos nao seguida.', '2026-05-02 11:00:31.302578-03', '2026-05-02 11:00:31.302578-03'),
	('408', 'RECOVERABLE', 'Erro na integracao com o sistema CNPJ / CPF.', '2026-05-02 11:00:31.302578-03', '2026-05-02 11:00:31.302578-03'),
	('409', 'RECOVERABLE', 'Erro na integracao com o sistema Procuracao Eletronica RFB.', '2026-05-02 11:00:31.302578-03', '2026-05-02 11:00:31.302578-03'),
	('410', 'RECOVERABLE', 'Erro na integracao com o sistema Procuracao Eletronica Caixa.', '2026-05-02 11:00:31.302578-03', '2026-05-02 11:00:31.302578-03'),
	('411', 'DEFINITIVE', 'Assinante invalido ou sem perfil de procuracao eletronica.', '2026-05-02 11:00:31.302578-03', '2026-05-02 11:00:31.302578-03'),
	('501', 'DEFINITIVE', 'Solicitacao de Consulta Incorreta - Erro Preenchimento.', '2026-05-02 11:00:31.302578-03', '2026-05-02 11:00:31.302578-03'),
	('502', 'DEFINITIVE', 'Solicitacao de Consulta Incorreta - Schema Invalido.', '2026-05-02 11:00:31.302578-03', '2026-05-02 11:00:31.302578-03'),
	('503', 'DEFINITIVE', 'Solicitacao de Consulta Incorreta - Versao do Schema Nao Permitida.', '2026-05-02 11:00:31.302578-03', '2026-05-02 11:00:31.302578-03'),
	('504', 'DEFINITIVE', 'Solicitacao de Consulta Incorreta - Erro Certificado.', '2026-05-02 11:00:31.302578-03', '2026-05-02 11:00:31.302578-03'),
	('505', 'DEFINITIVE', 'Solicitacao de Consulta Incorreta - Consulta nula ou vazia.', '2026-05-02 11:00:31.302578-03', '2026-05-02 11:00:31.302578-03');

INSERT INTO esocial.s2205_trigger_field VALUES
	('address.zip', '2026-05-01 23:04:30.910522-03'),
	('address.street', '2026-05-01 23:04:30.910522-03'),
	('contact.email', '2026-05-01 23:04:30.910522-03'),
	('contact.phone', '2026-05-01 23:04:30.910522-03'),
	('marital_status', '2026-05-01 23:04:30.910522-03'),
	('education_level', '2026-05-01 23:04:30.910522-03'),
	('dependent.*', '2026-05-01 23:04:30.910522-03');

INSERT INTO fiscal.gps_payment_code VALUES
	('4ae3aaa7-5f66-4164-9ec8-e10746c90a20', '2100', 'Empresas em geral - CNPJ - recolhimento RGPS residual', 'BOTH', true, '1999-01-01', NULL, '2026-05-02 05:30:09.951875-03', '2026-05-02 05:30:09.951875-03'),
	('724b2a82-f48b-42b7-a3a8-82eb9f1440f3', '2402', 'Orgaos do poder publico - CNPJ - recolhimento RGPS residual', 'BOTH', true, '1999-01-01', NULL, '2026-05-02 05:30:09.951875-03', '2026-05-02 05:30:09.951875-03'),
	('4a7e9cdf-eeb0-4640-8e30-db2798ea097f', '2003', 'Empresas optantes pelo Simples - CNPJ - recolhimento residual', 'EMPLOYER', true, '1999-01-01', NULL, '2026-05-02 05:30:09.951875-03', '2026-05-02 05:30:09.951875-03'),
	('1ddbfb91-c026-4f9c-ac55-76e63746c775', '2909', 'Reclamatoria trabalhista - CNPJ - recolhimento previdenciario', 'BOTH', true, '1999-01-01', NULL, '2026-05-02 05:30:09.951875-03', '2026-05-02 05:30:09.951875-03');

ALTER TABLE tce.state DISABLE TRIGGER USER;
ALTER TABLE tce.layout_version DISABLE TRIGGER USER;
ALTER TABLE tce.layout_field DISABLE TRIGGER USER;

INSERT INTO tce.state VALUES
	('c3463c4b-7776-4681-b9a3-0ccda11da6da', 'AC', 'Acre', 'STATE', NULL, 'TCE', 'Tribunal de Contas do Estado do Acre', 'https://www.tceac.tc.br/', '2026-05-02 05:30:09.976336-03', '2026-05-02 05:30:09.976336-03'),
	('08ffe02b-8d1d-4d4d-8220-e9eba330ba8c', 'AL', 'Alagoas', 'STATE', NULL, 'TCE', 'Tribunal de Contas do Estado de Alagoas', 'https://www.tceal.tc.br/', '2026-05-02 05:30:09.976336-03', '2026-05-02 05:30:09.976336-03'),
	('d4c38013-792e-4fa0-9742-b333e6a497b9', 'AP', 'Amapa', 'STATE', NULL, 'TCE', 'Tribunal de Contas do Estado do Amapa', 'https://www.tce.ap.gov.br/', '2026-05-02 05:30:09.976336-03', '2026-05-02 05:30:09.976336-03'),
	('7a29a650-ea60-4d52-b8bd-04b2b37f5719', 'AM', 'Amazonas', 'STATE', NULL, 'TCE', 'Tribunal de Contas do Estado do Amazonas', 'https://www.tce.am.gov.br/', '2026-05-02 05:30:09.976336-03', '2026-05-02 05:30:09.976336-03'),
	('e97591b9-ba10-4aa7-8afd-55cdaa4f83b9', 'BA', 'Bahia', 'STATE', NULL, 'TCE', 'Tribunal de Contas do Estado da Bahia', 'https://www.tce.ba.gov.br/', '2026-05-02 05:30:09.976336-03', '2026-05-02 05:30:09.976336-03'),
	('812730e6-ccef-4437-a9b3-c1ea14293006', 'CE', 'Ceara', 'STATE', NULL, 'TCE', 'Tribunal de Contas do Estado do Ceara', 'https://www.tce.ce.gov.br/', '2026-05-02 05:30:09.976336-03', '2026-05-02 05:30:09.976336-03'),
	('477a2cd9-ce85-4850-93fb-a98e34bb7cdd', 'DF', 'Distrito Federal', 'FEDERAL_DISTRICT', NULL, 'TCE', 'Tribunal de Contas do Distrito Federal', 'https://www.tc.df.gov.br/', '2026-05-02 05:30:09.976336-03', '2026-05-02 05:30:09.976336-03'),
	('65a3fd0c-4b79-4e74-a4c7-b3d9567a38bd', 'ES', 'Espirito Santo', 'STATE', NULL, 'TCE', 'Tribunal de Contas do Estado do Espirito Santo', 'https://www.tcees.tc.br/', '2026-05-02 05:30:09.976336-03', '2026-05-02 05:30:09.976336-03'),
	('46be0c29-2a9e-4a07-85bb-6fcaa636b58b', 'GO', 'Goias', 'STATE', NULL, 'TCE', 'Tribunal de Contas do Estado de Goias', 'https://portal.tce.go.gov.br/', '2026-05-02 05:30:09.976336-03', '2026-05-02 05:30:09.976336-03'),
	('776a94f3-2543-4558-be1b-1a543a03b76a', 'MA', 'Maranhao', 'STATE', NULL, 'TCE', 'Tribunal de Contas do Estado do Maranhao', 'https://www.tcema.tc.br/', '2026-05-02 05:30:09.976336-03', '2026-05-02 05:30:09.976336-03'),
	('4196ed65-f70e-426d-aad7-862041c5c68a', 'MT', 'Mato Grosso', 'STATE', NULL, 'TCE', 'Tribunal de Contas do Estado de Mato Grosso', 'https://www.tce.mt.gov.br/', '2026-05-02 05:30:09.976336-03', '2026-05-02 05:30:09.976336-03'),
	('d5c3b1d6-4c62-4197-8932-134acef45899', 'MS', 'Mato Grosso do Sul', 'STATE', NULL, 'TCE', 'Tribunal de Contas do Estado de Mato Grosso do Sul', 'https://www.tce.ms.gov.br/', '2026-05-02 05:30:09.976336-03', '2026-05-02 05:30:09.976336-03'),
	('911b6117-a958-4f10-ba3c-d6444d75999a', 'MG', 'Minas Gerais', 'STATE', NULL, 'TCE', 'Tribunal de Contas do Estado de Minas Gerais', 'https://www.tce.mg.gov.br/', '2026-05-02 05:30:09.976336-03', '2026-05-02 05:30:09.976336-03'),
	('8e2436d2-2b95-40e6-98cb-46be2bf94304', 'PA', 'Para', 'STATE', NULL, 'TCE', 'Tribunal de Contas do Estado do Para', 'https://www.tcepa.tc.br/', '2026-05-02 05:30:09.976336-03', '2026-05-02 05:30:09.976336-03'),
	('7ce324a6-2af7-4be7-be05-0ecce52873b5', 'PB', 'Paraiba', 'STATE', NULL, 'TCE', 'Tribunal de Contas do Estado da Paraiba', 'https://tce.pb.gov.br/', '2026-05-02 05:30:09.976336-03', '2026-05-02 05:30:09.976336-03'),
	('9a2fca89-f738-4392-b24c-aa57e4041a70', 'PR', 'Parana', 'STATE', NULL, 'TCE', 'Tribunal de Contas do Estado do Parana', 'https://www.tce.pr.gov.br/', '2026-05-02 05:30:09.976336-03', '2026-05-02 05:30:09.976336-03'),
	('d13aa26c-cd85-4cc3-8b9f-c61a35e1a529', 'PE', 'Pernambuco', 'STATE', NULL, 'TCE', 'Tribunal de Contas do Estado de Pernambuco', 'https://www.tce.pe.gov.br/', '2026-05-02 05:30:09.976336-03', '2026-05-02 05:30:09.976336-03'),
	('c6cb1976-5938-4285-83ef-427d8977becf', 'PI', 'Piaui', 'STATE', NULL, 'TCE', 'Tribunal de Contas do Estado do Piaui', 'https://www.tcepi.tc.br/', '2026-05-02 05:30:09.976336-03', '2026-05-02 05:30:09.976336-03'),
	('13c53e7c-63ab-4000-9108-37e0d5f92cbf', 'RJ', 'Rio de Janeiro', 'STATE', NULL, 'TCE', 'Tribunal de Contas do Estado do Rio de Janeiro', 'https://www.tcerj.tc.br/', '2026-05-02 05:30:09.976336-03', '2026-05-02 05:30:09.976336-03'),
	('5968371d-3729-460d-bf5f-9b89d79de0c0', 'RN', 'Rio Grande do Norte', 'STATE', NULL, 'TCE', 'Tribunal de Contas do Estado do Rio Grande do Norte', 'https://www.tce.rn.gov.br/', '2026-05-02 05:30:09.976336-03', '2026-05-02 05:30:09.976336-03'),
	('ea1df3b2-2055-4017-aa47-9ca61a31f4ac', 'RS', 'Rio Grande do Sul', 'STATE', NULL, 'TCE', 'Tribunal de Contas do Estado do Rio Grande do Sul', 'https://tcers.tc.br/', '2026-05-02 05:30:09.976336-03', '2026-05-02 05:30:09.976336-03'),
	('5a031d78-ecc1-410f-b573-190d131c229e', 'RO', 'Rondonia', 'STATE', NULL, 'TCE', 'Tribunal de Contas do Estado de Rondonia', 'https://tcero.tc.br/', '2026-05-02 05:30:09.976336-03', '2026-05-02 05:30:09.976336-03'),
	('c7c10e39-5fab-4d6e-8050-c0283a9d0851', 'RR', 'Roraima', 'STATE', NULL, 'TCE', 'Tribunal de Contas do Estado de Roraima', 'https://www.tcerr.tc.br/', '2026-05-02 05:30:09.976336-03', '2026-05-02 05:30:09.976336-03'),
	('586cb47c-7063-4fe1-9e3d-fed642da12e2', 'SC', 'Santa Catarina', 'STATE', NULL, 'TCE', 'Tribunal de Contas do Estado de Santa Catarina', 'https://www.tcesc.tc.br/', '2026-05-02 05:30:09.976336-03', '2026-05-02 05:30:09.976336-03'),
	('0d47997d-d830-441e-917e-6facabbd01d2', 'SP', 'Sao Paulo', 'STATE', NULL, 'TCE', 'Tribunal de Contas do Estado de Sao Paulo', 'https://www.tce.sp.gov.br/', '2026-05-02 05:30:09.976336-03', '2026-05-02 05:30:09.976336-03'),
	('a22107c2-00ba-4038-94c6-149ef087a5bf', 'SE', 'Sergipe', 'STATE', NULL, 'TCE', 'Tribunal de Contas do Estado de Sergipe', 'https://www.tce.se.gov.br/', '2026-05-02 05:30:09.976336-03', '2026-05-02 05:30:09.976336-03'),
	('10d0701b-b92e-464a-9a66-6772a9288601', 'TO', 'Tocantins', 'STATE', NULL, 'TCE', 'Tribunal de Contas do Estado do Tocantins', 'https://www.tceto.tc.br/', '2026-05-02 05:30:09.976336-03', '2026-05-02 05:30:09.976336-03'),
	('bb560cc6-e305-4caf-945e-9ef552e2e580', 'BR', 'Brasil', 'FEDERAL_DISTRICT', NULL, 'TCU', 'Tribunal de Contas da Uniao', 'https://portal.tcu.gov.br/', '2026-05-02 05:30:09.976336-03', '2026-05-02 05:30:09.976336-03'),
	('025a86b9-219d-44dc-8fd7-2d4cf92bc85b', 'RM', 'Rio de Janeiro - Municipio', 'MUNICIPAL', 'RJ', 'TCM', 'Tribunal de Contas do Municipio do Rio de Janeiro', 'https://www.tcmrio.tc.br/', '2026-05-02 05:30:09.976336-03', '2026-05-02 05:30:09.976336-03'),
	('4050676f-0042-4565-82a0-009be82957c2', 'SM', 'Sao Paulo - Municipio', 'MUNICIPAL', 'SP', 'TCM', 'Tribunal de Contas do Municipio de Sao Paulo', 'https://portal.tcm.sp.gov.br/', '2026-05-02 05:30:09.976336-03', '2026-05-02 05:30:09.976336-03'),
	('15663fae-5d7b-4f77-bd54-992dab8a6fab', 'PM', 'Para - Municipios', 'MUNICIPAL', 'PA', 'TCM', 'Tribunal de Contas dos Municipios do Estado do Para', 'https://www.tcm.pa.gov.br/', '2026-05-02 05:30:09.976336-03', '2026-05-02 05:30:09.976336-03'),
	('cef3200e-8060-47c0-b683-9384a1795270', 'GM', 'Goias - Municipios', 'MUNICIPAL', 'GO', 'TCM', 'Tribunal de Contas dos Municipios do Estado de Goias', 'https://www.tcmgo.tc.br/', '2026-05-02 05:30:09.976336-03', '2026-05-02 05:30:09.976336-03');

INSERT INTO tce.layout_version VALUES
	('abad5cf4-217e-420e-bdbf-dd1b6d446a90', '9a2fca89-f738-4392-b24c-aa57e4041a70', 'SIM-AM', '0.0.1', '2026-01-01', NULL, 'DRAFT', 'https://www.tce.pr.gov.br/fiscalizado/portal-e-contas-parana/', 'Placeholder publico: Sistema de Informacoes Municipais - Acompanhamento Mensal. Campos nao embarcados.', '2026-05-02 05:30:09.976336-03', '2026-05-02 05:30:09.976336-03'),
	('dc31270e-ae4b-4ce7-8e11-832107e9ba03', '0d47997d-d830-441e-917e-6facabbd01d2', 'AUDESP', '0.0.1', '2026-01-01', NULL, 'DRAFT', 'https://www.tce.sp.gov.br/audesp', 'Placeholder publico: Auditoria Eletronica de Orgaos Publicos. Campos nao embarcados.', '2026-05-02 05:30:09.976336-03', '2026-05-02 05:30:09.976336-03'),
	('ed44a795-199c-48f7-a9aa-e214a17eb706', '7ce324a6-2af7-4be7-be05-0ecce52873b5', 'SAGRES', '0.0.1', '2026-01-01', NULL, 'DRAFT', 'https://tce.pb.gov.br/sagres-cidadao/', 'Placeholder publico: SAGRES. Campos nao embarcados.', '2026-05-02 05:30:09.976336-03', '2026-05-02 05:30:09.976336-03'),
	('19693682-856d-4193-adb3-1f7b12463d31', '812730e6-ccef-4437-a9b3-c1ea14293006', 'SIAP', '0.0.1', '2026-01-01', NULL, 'DRAFT', 'https://www.tce.ce.gov.br/', 'Placeholder publico: sistema estadual indicado para catalogacao inicial. Campos nao embarcados.', '2026-05-02 05:30:09.976336-03', '2026-05-02 05:30:09.976336-03');

INSERT INTO tce.layout_field VALUES
	('ed19740e-c50b-4320-9066-9bf02ae42c09', 'dc31270e-ae4b-4ce7-8e11-832107e9ba03', 'AudespFolha', 'XML_NODE', true, NULL, NULL, NULL, 'root', 'AUDESP folha de pagamento placeholder publico', 10, '2026-05-02 05:48:27.32024-03', '2026-05-02 05:48:27.32024-03'),
	('d3c44e3c-d9b5-428a-95fc-31c4f16859f1', 'dc31270e-ae4b-4ce7-8e11-832107e9ba03', 'AudespFolha.Cabecalho', 'XML_NODE', true, NULL, NULL, NULL, 'group', 'cabecalho do lote', 20, '2026-05-02 05:48:27.32024-03', '2026-05-02 05:48:27.32024-03'),
	('b989c9f3-1d6a-408b-a151-465a69fbfbb1', 'dc31270e-ae4b-4ce7-8e11-832107e9ba03', 'AudespFolha.Cabecalho.OrgaoCodigo', 'STRING', true, 20, NULL, NULL, 'tenant.organization_code', 'identificacao publica do orgao', 30, '2026-05-02 05:48:27.32024-03', '2026-05-02 05:48:27.32024-03'),
	('97159c60-f4eb-40fa-b171-a1383f27c11d', 'dc31270e-ae4b-4ce7-8e11-832107e9ba03', 'AudespFolha.Cabecalho.CompetenciaAno', 'INT', true, NULL, NULL, NULL, 'payroll_run.competence_year', 'ano da competencia', 40, '2026-05-02 05:48:27.32024-03', '2026-05-02 05:48:27.32024-03'),
	('88b67fbb-015e-4ae4-9cb5-4f7f859d2cae', 'dc31270e-ae4b-4ce7-8e11-832107e9ba03', 'AudespFolha.Cabecalho.CompetenciaMes', 'INT', true, NULL, NULL, NULL, 'payroll_run.competence_month', 'mes da competencia', 50, '2026-05-02 05:48:27.32024-03', '2026-05-02 05:48:27.32024-03'),
	('b32c63e7-92ea-4c8e-8a11-622d90d25682', 'dc31270e-ae4b-4ce7-8e11-832107e9ba03', 'AudespFolha.Cabecalho.TipoRemessa', 'STRING', true, 20, NULL, NULL, 'constant:FOLHA_PAGAMENTO', 'categoria publica do lote', 60, '2026-05-02 05:48:27.32024-03', '2026-05-02 05:48:27.32024-03'),
	('72eb85c9-2274-4bf8-90a6-310c5e66d344', 'dc31270e-ae4b-4ce7-8e11-832107e9ba03', 'AudespFolha.Servidores.Servidor', 'XML_NODE', true, NULL, NULL, NULL, 'repeat', 'lista de servidores/empregados', 70, '2026-05-02 05:48:27.32024-03', '2026-05-02 05:48:27.32024-03'),
	('b7d1328b-8827-4765-93f4-1b669acdf632', 'dc31270e-ae4b-4ce7-8e11-832107e9ba03', 'AudespFolha.Servidores.Servidor.Matricula', 'STRING', true, 30, NULL, NULL, 'hr.employee.registration', 'matricula funcional', 80, '2026-05-02 05:48:27.32024-03', '2026-05-02 05:48:27.32024-03'),
	('d5f138a5-76f1-4a42-ab70-c0debb7fe5ed', 'dc31270e-ae4b-4ce7-8e11-832107e9ba03', 'AudespFolha.Servidores.Servidor.Cpf', 'STRING', true, 11, NULL, NULL, 'hr.employee.cpf only digits', 'CPF do servidor', 90, '2026-05-02 05:48:27.32024-03', '2026-05-02 05:48:27.32024-03'),
	('89f5fcd8-4af9-44ab-8067-75a4d1a2430e', 'dc31270e-ae4b-4ce7-8e11-832107e9ba03', 'AudespFolha.Servidores.Servidor.Cargo', 'STRING', true, 120, NULL, NULL, 'hr.job_position.name', 'cargo ou emprego publico', 100, '2026-05-02 05:48:27.32024-03', '2026-05-02 05:48:27.32024-03'),
	('fdd2f8a6-b7df-4cfd-8f5e-625725f214bf', 'dc31270e-ae4b-4ce7-8e11-832107e9ba03', 'AudespFolha.Servidores.Servidor.Proventos', 'DECIMAL', true, NULL, 14, 2, 'sum earnings', 'total de proventos', 110, '2026-05-02 05:48:27.32024-03', '2026-05-02 05:48:27.32024-03'),
	('7c4a28b2-bd91-4fe2-a87f-d040d34d1f1e', 'dc31270e-ae4b-4ce7-8e11-832107e9ba03', 'AudespFolha.Servidores.Servidor.Descontos', 'DECIMAL', true, NULL, 14, 2, 'sum deductions', 'total de descontos', 120, '2026-05-02 05:48:27.32024-03', '2026-05-02 05:48:27.32024-03'),
	('00bfb59c-201d-41af-ab8c-a191a9ceadf7', 'dc31270e-ae4b-4ce7-8e11-832107e9ba03', 'AudespFolha.Servidores.Servidor.Liquido', 'DECIMAL', true, NULL, 14, 2, 'earnings - deductions', 'valor liquido', 130, '2026-05-02 05:48:27.32024-03', '2026-05-02 05:48:27.32024-03');

ALTER TABLE tce.layout_field ENABLE TRIGGER USER;
ALTER TABLE tce.layout_version ENABLE TRIGGER USER;
ALTER TABLE tce.state ENABLE TRIGGER USER;
