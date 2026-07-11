'use strict';

const BACKEND_SRC_PATTERN = /(?:^|[/\\])backend[/\\]src[/\\]/;
const HANDLER_PATTERN = /(?:^|[/\\])backend[/\\]src[/\\].*(?:controller|resolver|gateway)\.ts$/;
const BOOTSTRAP_PATTERN = /(?:^|[/\\])backend[/\\]src[/\\]main(?:-[\w-]+)?\.ts$/;
const CONSOLE_METHODS = new Set(['debug', 'error', 'info', 'log', 'warn']);

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow raw console logging and default Nest Logger in request handlers.',
    },
    schema: [],
    messages: {
      rawConsole:
        'Raw console.{{method}} is forbidden in backend runtime handlers. Use the centralized structured logger.',
      nestLogger:
        'Default @nestjs/common Logger is forbidden in handlers. Use the centralized structured logger.',
    },
  },
  create(context) {
    const filename = context.filename ?? context.getFilename();
    if (!BACKEND_SRC_PATTERN.test(filename)) return {};
    const isHandler = HANDLER_PATTERN.test(filename);
    const isBootstrap = BOOTSTRAP_PATTERN.test(filename);

    return {
      CallExpression(node) {
        const callee = node.callee;
        if (
          callee.type === 'MemberExpression' &&
          callee.object.type === 'Identifier' &&
          callee.object.name === 'console' &&
          callee.property.type === 'Identifier' &&
          CONSOLE_METHODS.has(callee.property.name)
        ) {
          context.report({
            node: callee,
            messageId: 'rawConsole',
            data: { method: callee.property.name },
          });
        }
      },
      ImportDeclaration(node) {
        if (!isHandler || isBootstrap || node.source.value !== '@nestjs/common') {
          return;
        }
        for (const specifier of node.specifiers) {
          if (
            specifier.type === 'ImportSpecifier' &&
            specifier.imported.type === 'Identifier' &&
            specifier.imported.name === 'Logger'
          ) {
            context.report({ node: specifier, messageId: 'nestLogger' });
          }
        }
      },
    };
  },
};
