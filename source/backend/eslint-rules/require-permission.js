'use strict';

const HTTP_DECORATORS = new Set([
  'Get',
  'Post',
  'Put',
  'Patch',
  'Delete',
  'Options',
  'Head',
  'All',
]);

function decoratorName(decorator) {
  const expression = decorator.expression;
  const callee = expression && expression.callee ? expression.callee : expression;
  if (!callee) return '';
  if (callee.type === 'Identifier') return callee.name;
  if (callee.type === 'MemberExpression' && callee.property.type === 'Identifier') {
    return callee.property.name;
  }
  return '';
}

function hasDecorator(node, name) {
  return (node.decorators ?? []).some((decorator) => decoratorName(decorator) === name);
}

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Require each NestJS route handler to declare @RequirePermission or @Public.',
    },
    schema: [],
    messages: {
      missing:
        'Route handler {{name}} must declare @RequirePermission(...) or @Public().',
    },
  },
  create(context) {
    return {
      ClassDeclaration(node) {
        if (!hasDecorator(node, 'Controller')) return;

        const classIsCovered =
          hasDecorator(node, 'RequirePermission') || hasDecorator(node, 'Public');
        for (const member of node.body.body) {
          if (member.type !== 'MethodDefinition') continue;
          const hasHttpDecorator = (member.decorators ?? []).some((decorator) =>
            HTTP_DECORATORS.has(decoratorName(decorator)),
          );
          if (!hasHttpDecorator) continue;
          if (
            classIsCovered ||
            hasDecorator(member, 'RequirePermission') ||
            hasDecorator(member, 'Public')
          ) {
            continue;
          }
          context.report({
            node: member.key,
            messageId: 'missing',
            data: { name: member.key.name ?? 'handler' },
          });
        }
      },
    };
  },
};
