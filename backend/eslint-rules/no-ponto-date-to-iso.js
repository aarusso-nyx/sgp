'use strict';

const PONTO_PATTERN = /(?:^|[/\\])src[/\\]ponto[/\\]/;
const HELPER_PATTERN = /(?:^|[/\\])src[/\\]ponto[/\\]payroll-bridge[/\\]tenant-timezone\.util\.ts$/;

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow Date.toISOString in ponto code outside the tenant-timezone helper.',
    },
    schema: [],
    messages: {
      forbidden:
        'Date.toISOString is forbidden in backend/src/ponto/** outside tenant-timezone.util.ts.',
    },
  },
  create(context) {
    const filename = context.getFilename();
    if (!PONTO_PATTERN.test(filename) || HELPER_PATTERN.test(filename)) return {};

    return {
      CallExpression(node) {
        const callee = node.callee;
        if (
          callee.type === 'MemberExpression' &&
          callee.property.type === 'Identifier' &&
          callee.property.name === 'toISOString'
        ) {
          context.report({ node: callee, messageId: 'forbidden' });
        }
      },
    };
  },
};
