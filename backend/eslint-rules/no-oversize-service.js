'use strict';

const SERVICE_PATTERN = /(?:^|[/\\])backend[/\\]src[/\\].*\.service\.ts$/;
const MAX_EFFECTIVE_LINES = 600;

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
        'Reject backend service files that exceed the 600 effective-line decomposition budget.',
    },
    schema: [],
    messages: {
      oversize:
        '{{effectiveLines}} effective lines in {{filename}} exceeds the {{limit}} line service budget. Split by domain responsibility.',
    },
  },
  create(context) {
    const filename = context.filename ?? context.getFilename();
    if (!SERVICE_PATTERN.test(filename)) return {};

    return {
      Program(node) {
        const sourceCode = context.sourceCode ?? context.getSourceCode();
        const commentLines = commentLineNumbers(sourceCode);
        const effectiveLines = sourceCode.lines.filter((line, index) => {
          const lineNumber = index + 1;
          return line.trim().length > 0 && !commentLines.has(lineNumber);
        }).length;

        if (effectiveLines <= MAX_EFFECTIVE_LINES) return;

        context.report({
          node,
          messageId: 'oversize',
          data: {
            effectiveLines: String(effectiveLines),
            filename,
            limit: String(MAX_EFFECTIVE_LINES),
          },
        });
      },
    };
  },
};
