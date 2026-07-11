'use strict';

const SPEC_PATTERN = /(?:^|[/\\])(?:src|tests)[/\\].*(?:\.spec|\.e2e-spec)\.ts$/;
const FIXTURE_ALLOWLIST_PATTERN = /(?:^|[/\\])tests[/\\]backend[/\\](?:fixtures|golden)[/\\]/;
const OPT_OUT_COMMENT = 'sgp-allow-hardcoded-date-in-spec';
const HARD_CODED_YEAR_PATTERN = /^20\d{2}-/;

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description:
        "Disallow new Date('20XX-...') literals in specs; freeze the clock and use named fixtures.",
    },
    schema: [],
    messages: {
      forbidden:
        "Do not add hard-coded new Date('20XX-...') in specs. Use jest.useFakeTimers().setSystemTime(...) and named fixture constants.",
    },
  },
  create(context) {
    const filename = context.filename ?? context.getFilename();
    if (!SPEC_PATTERN.test(filename)) return {};
    if (FIXTURE_ALLOWLIST_PATTERN.test(filename)) return {};

    const sourceCode = context.sourceCode ?? context.getSourceCode();
    if (sourceCode.getAllComments().some((comment) => comment.value.includes(OPT_OUT_COMMENT))) {
      return {};
    }

    return {
      NewExpression(node) {
        if (node.callee.type !== 'Identifier' || node.callee.name !== 'Date') {
          return;
        }
        const [firstArg] = node.arguments;
        if (
          firstArg?.type === 'Literal' &&
          typeof firstArg.value === 'string' &&
          HARD_CODED_YEAR_PATTERN.test(firstArg.value)
        ) {
          context.report({ node: firstArg, messageId: 'forbidden' });
        }
      },
    };
  },
};
