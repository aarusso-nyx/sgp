import { ConflictException } from '@nestjs/common';

export class GPSDuplicatesDCTFWebError extends ConflictException {
  constructor(competence: string) {
    super({
      code: 'GPSDuplicatesDCTFWebError',
      message: `Residual GPS cannot be generated because DCTFWeb is already transmitted or accepted for ${competence}`,
    });
  }
}
