'use strict';

const MONEY_MODULE_PATTERN =
  /(?:^|[/\\])src[/\\](?:folha-pagamento|payroll-engine|common[/\\]money)[/\\]/;

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow Math.round in payroll monetary modules; use common money helpers.',
    },
    schema: [],
    messages: {
      forbidden:
        'Math.round is forbidden in monetary modules. Use roundMoney(...) from src/common/money/money.',
      forbiddenNumberToFixed:
        'Number(...).toFixed(...) is forbidden in monetary modules. Convert through roundMoney(...) before serializing.',
    },
  },
  create(context) {
    const filename = context.filename ?? context.getFilename();
    if (!MONEY_MODULE_PATTERN.test(filename)) return {};

    return {
      CallExpression(node) {
        const callee = node.callee;
        if (
          callee.type === 'MemberExpression' &&
          callee.object.type === 'Identifier' &&
          callee.object.name === 'Math' &&
          callee.property.type === 'Identifier' &&
          callee.property.name === 'round'
        ) {
          context.report({ node: callee, messageId: 'forbidden' });
        }
        if (
          callee.type === 'MemberExpression' &&
          callee.property.type === 'Identifier' &&
          callee.property.name === 'toFixed' &&
          callee.object.type === 'CallExpression' &&
          callee.object.callee.type === 'Identifier' &&
          callee.object.callee.name === 'Number'
        ) {
          context.report({ node: callee, messageId: 'forbiddenNumberToFixed' });
        }
      },
    };
  },
};
