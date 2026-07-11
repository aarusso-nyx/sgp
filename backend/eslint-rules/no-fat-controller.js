'use strict';

const CONTROLLER_PATTERN = /(?:^|[/\\])backend[/\\]src[/\\].*\.controller\.ts$/;
const WARN_EFFECTIVE_LINES = 300;
const ERROR_EFFECTIVE_LINES = 500;

function commentLineNumbers(sourceCode) {
  const lines = new Set();
  for (const comment of sourceCode.getAllComments()) {
    const start = comment.loc?.start.line;
    const end = comment.loc?.end.line;
    if (!start || !end) continue;
    for (let line = start; line <= end; line += 1) {
      lines.add(line);
    }
  }
  return lines;
}

module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Warn when backend controllers exceed the 300 effective-line review budget and error above 500.',
    },
    schema: [],
    messages: {
      oversize:
        '{{effectiveLines}} effective lines in {{filename}} exceeds the {{limit}} line controller budget. Split routed workflows before promoting this rule to error-only.',
    },
  },
  create(context) {
    const filename = context.filename ?? context.getFilename();
    if (!CONTROLLER_PATTERN.test(filename)) return {};

    return {
      Program(node) {
        const sourceCode = context.sourceCode ?? context.getSourceCode();
        const commentLines = commentLineNumbers(sourceCode);
        const effectiveLines = sourceCode.lines.filter((line, index) => {
          const lineNumber = index + 1;
          return line.trim().length > 0 && !commentLines.has(lineNumber);
        }).length;

        if (effectiveLines <= WARN_EFFECTIVE_LINES) return;

        context.report({
          node,
          messageId: 'oversize',
          data: {
            effectiveLines: String(effectiveLines),
            filename,
            limit:
              effectiveLines > ERROR_EFFECTIVE_LINES
                ? String(ERROR_EFFECTIVE_LINES)
                : String(WARN_EFFECTIVE_LINES),
          },
        });
      },
    };
  },
};
