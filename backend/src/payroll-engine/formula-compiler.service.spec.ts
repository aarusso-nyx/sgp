import { BadRequestException } from '@nestjs/common';

import { FormulaCompilerService } from './formula-compiler.service';

describe('FormulaCompilerService', () => {
  const service = new FormulaCompilerService({ configured: false } as never);

  it('parses arithmetic precedence into deterministic SQL', () => {
    const result = service.compileExpression(
      'SALARIO_BASE + CARGA_HORARIA * 10',
    );

    expect(result.compiledSql).toContain('payroll_calc.base_salary');
    expect(result.compiledSql).toContain('payroll_calc.workload_hours');
    expect(result.dependencies).toEqual([]);
  });

  it('emits IF and comparison expressions', () => {
    const result = service.compileExpression(
      'IF(DEPENDENTES > 2, SALARIO_BASE * 0.10, 0)',
    );

    expect(result.compiledSql).toContain('CASE WHEN');
    expect(result.compiledSql).toContain('dependent_count');
  });

  it('emits MIN and MAX internal functions', () => {
    const result = service.compileExpression(
      'MAX(MIN(SALARIO_BASE, 5000), 1412)',
    );

    expect(result.compiledSql).toContain('GREATEST');
    expect(result.compiledSql).toContain('LEAST');
  });

  it('records dependencies for other rubric references', () => {
    const result = service.compileExpression(
      'SALARIO_BASE + adicional_noturno()',
      undefined,
      ['adicional_noturno'],
    );

    expect(result.dependencies).toEqual(['adicional_noturno']);
    expect(result.compiledSql).toContain('payroll_calc."f_adicional_noturno"');
  });

  it('rejects unknown attributes and functions', () => {
    expect(() => service.compileExpression('UNKNOWN_ATTRIBUTE + 1')).toThrow(
      BadRequestException,
    );
    expect(() => service.compileExpression('danger()')).toThrow(
      BadRequestException,
    );
  });
});
