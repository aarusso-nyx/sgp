#!/usr/bin/env node

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import ts from 'typescript';

const routeDecoratorNames = new Set([
  'All',
  'Delete',
  'Get',
  'Head',
  'Options',
  'Patch',
  'Post',
  'Put',
]);

function controllerFiles() {
  function walk(directory) {
    return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) return walk(path);
      return path.endsWith('controller.ts') ? [path] : [];
    });
  }

  return walk('backend/src');
}

function decoratorName(decorator, sourceFile) {
  let expression = decorator.expression;
  if (ts.isCallExpression(expression)) {
    expression = expression.expression;
  }
  return ts.isIdentifier(expression) ? expression.text : expression.getText(sourceFile);
}

function hasDecorator(node, sourceFile, expectedName) {
  return (ts.getDecorators(node) ?? []).some(
    (decorator) => decoratorName(decorator, sourceFile) === expectedName,
  );
}

function routeDecorator(node, sourceFile) {
  return (ts.getDecorators(node) ?? []).find((decorator) =>
    routeDecoratorNames.has(decoratorName(decorator, sourceFile)),
  );
}

function inspectFile(file) {
  const source = readFileSync(file, 'utf8');
  const sourceFile = ts.createSourceFile(
    file,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const missing = [];

  function visit(node) {
    if (ts.isMethodDeclaration(node)) {
      const route = routeDecorator(node, sourceFile);
      if (route && !hasDecorator(node, sourceFile, 'ApiOperation')) {
        const position = sourceFile.getLineAndCharacterOfPosition(node.name.getStart(sourceFile));
        missing.push({
          file,
          line: position.line + 1,
          method: node.name.getText(sourceFile),
          route: route.getText(sourceFile).split('\n')[0],
        });
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return missing;
}

const missing = controllerFiles().flatMap(inspectFile);

if (missing.length > 0) {
  console.error(`[api-operation] missing @ApiOperation on ${missing.length} route handlers`);
  for (const item of missing.slice(0, 80)) {
    console.error(`- ${item.file}:${item.line} ${item.route} ${item.method}`);
  }
  if (missing.length > 80) {
    console.error(`... ${missing.length - 80} additional route handlers omitted`);
  }
  process.exit(1);
}

console.log('[api-operation] all controller route handlers declare @ApiOperation');
