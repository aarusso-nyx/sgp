import type { AposentadoriaService } from './aposentadoria/aposentadoria.service';
import type { CtcService } from './ctc/ctc.service';
import type { DeclaracaoService } from './declaracao/declaracao.service';
import type { PensaoService } from './pensao/pensao.service';
import type { RecadastramentoService } from './recadastramento/recadastramento.service';
import type { RegrasService } from './regras/regras.service';

export const PREVIDENCIARIO_SERVICE_REGISTRY = Symbol(
  'PREVIDENCIARIO_SERVICE_REGISTRY',
);

export type PrevidenciarioServiceRegistry = Readonly<{
  regras: RegrasService;
  aposentadoria: AposentadoriaService;
  pensao: PensaoService;
  ctc: CtcService;
  declaracao: DeclaracaoService;
  recadastramento: RecadastramentoService;
}>;
