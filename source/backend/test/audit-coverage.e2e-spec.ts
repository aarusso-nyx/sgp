import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import ts from 'typescript';

const MUTATING_DECORATORS = new Set(['Post', 'Put', 'Patch', 'Delete']);

function controllerFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) return controllerFiles(path);
    return path.endsWith('.controller.ts') ? [path] : [];
  });
}

describe('audit coverage', () => {
  it('requires every registered mutating route to call auditMutation', () => {
    const srcDir = join(__dirname, '..', 'src');
    const missing: string[] = [];

    for (const filePath of controllerFiles(srcDir)) {
      const source = readFileSync(filePath, 'utf8');
      const sourceFile = ts.createSourceFile(
        filePath,
        source,
        ts.ScriptTarget.Latest,
        true,
      );
      const classHasAuditMutation = [
        ...source.matchAll(/@AuditMutation\(/g),
      ].some((match) => {
        const after = source.slice(match.index ?? 0, (match.index ?? 0) + 300);
        return after.includes('class ');
      });

      const visit = (node: ts.Node) => {
        if (ts.isMethodDeclaration(node)) {
          const decorators = ts.getDecorators(node) ?? [];
          const mutatingDecorator = decorators.find((decorator) => {
            const expression = decorator.expression;
            if (!ts.isCallExpression(expression)) return false;
            const name = expression.expression.getText(sourceFile);
            return MUTATING_DECORATORS.has(name);
          });

          if (
            mutatingDecorator &&
            !classHasAuditMutation &&
            !node.getFullText(sourceFile).includes('@AuditMutation(') &&
            !node.body?.getText(sourceFile).includes('auditMutation(')
          ) {
            const methodName = node.name.getText(sourceFile);
            const decoratorName = (
              mutatingDecorator.expression as ts.CallExpression
            ).expression.getText(sourceFile);
            missing.push(
              `${filePath.replace(`${srcDir}/`, '')}:${decoratorName}:${methodName}`,
            );
          }
        }
        ts.forEachChild(node, visit);
      };

      visit(sourceFile);
    }

    expect(missing).toEqual([]);
  });
});
