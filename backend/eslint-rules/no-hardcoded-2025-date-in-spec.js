'use strict';

const SPEC_PATTERN = /(?:^|[/\\])(?:src|tests)[/\\].*(?:\.spec|\.e2e-spec)\.ts$/;

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description:
        "Disallow new Date('2025-...') literals in specs; freeze the clock and use named fixtures.",
    },
    schema: [],
    messages: {
      forbidden:
        "Do not add hard-coded new Date('2025-...') in specs. Use jest.useFakeTimers().setSystemTime(...) and named fixture constants.",
    },
  },
  create(context) {
    if (!SPEC_PATTERN.test(context.getFilename())) return {};

    return {
      NewExpression(node) {
        if (node.callee.type !== 'Identifier' || node.callee.name !== 'Date') {
          return;
        }
        const [firstArg] = node.arguments;
        if (
          firstArg?.type === 'Literal' &&
          typeof firstArg.value === 'string' &&
          firstArg.value.startsWith('2025-')
        ) {
          context.report({ node: firstArg, messageId: 'forbidden' });
        }
      },
    };
  },
};
