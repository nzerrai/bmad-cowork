// Never imported directly for its exports: `test/extension.test.mjs` always
// calls `t.mock.module('vscode', ...)` before the code under test requires
// this specifier. This file exists only so 'vscode' resolves to *something*
// on disk, which node:test's module mocking currently requires even for a
// module it's about to fully replace.
module.exports = {};
