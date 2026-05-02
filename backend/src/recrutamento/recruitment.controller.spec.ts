import { RecruitmentController } from './recruitment.controller';

describe('RecruitmentController', () => {
  it('is defined', () => {
    const controller = new RecruitmentController({} as never, {} as never);
    expect(controller).toBeDefined();
  });
});
