'use strict';

// SGP policy (ADR-027): runtime code throws typed DomainError variants, never
// raw `new Error(...)`. The central exception filter
// (backend/src/common/errors/standard-exception.filter.ts) maps DomainError
// instances to RFC-7807-style problem-details responses; raw Error escapes
// that mapping and surfaces as a generic 500.
//
// Allowed exceptions:
// - test/spec files (they often throw to assert)
// - re-throws of caught errors (`throw error;`)
// - `throw new <SomethingElse>(...)` where the constructor is not literally
//   `Error` (HttpException, DomainError, custom subclasses, etc.)

const BACKEND_SRC_PATTERN = /(?:^|[/\\])backend[/\\]src[/\\]/;
const SPEC_FILE_PATTERN = /\.(?:spec|test)\.ts$/;

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow `throw new Error(...)` in backend runtime code. Use domainError builders or HttpException subclasses.',
    },
    schema: [],
    messages: {
      bareErrorThrow:
        'Avoid `throw new Error(...)`. Use a typed `domainError.<variant>(code, message)` from common/errors/domain-error or an HttpException subclass.',
    },
  },
  create(context) {
    const filename = context.filename ?? context.getFilename();
    if (!BACKEND_SRC_PATTERN.test(filename)) return {};
    if (SPEC_FILE_PATTERN.test(filename)) return {};

    return {
      ThrowStatement(node) {
        const argument = node.argument;
        if (!argument || argument.type !== 'NewExpression') return;
        const callee = argument.callee;
        if (callee.type !== 'Identifier') return;
        if (callee.name !== 'Error') return;
        context.report({ node: argument, messageId: 'bareErrorThrow' });
      },
    };
  },
};
