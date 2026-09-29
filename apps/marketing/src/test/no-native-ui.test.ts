import ts from 'typescript';
import { describe, expect, it } from 'vitest';

/**
 * Keeps the browser's own dialogs and controls off the public site.
 *
 * The applicant flow used the browser's dropdown for long lists, its date
 * input for dates and its "Leave site?" prompt on the way out; the event
 * registration asked for dates the same way, and the review forms let the
 * browser's validation bubbles speak for them. None of those can take the
 * site's look, and several are hard to use with a screen reader or on a
 * small phone. Each now has the site's own version (the searchable list,
 * DateField, ConfirmDialog, messages under each answer), and this test fails
 * as soon as a native one comes back, naming the file and line.
 *
 * The source is read as syntax rather than searched as text, so comments
 * that explain what was replaced (as this one does) are not mistaken for uses.
 * It mirrors the console's own guard, so both apps hold the same line.
 */
const sources = import.meta.glob<string>(
  ['../**/*.{ts,tsx}', '../../api/**/*.ts', '!../**/*.test.{ts,tsx}', '!../test/**'],
  { query: '?raw', import: 'default', eager: true },
);

const NATIVE_DIALOGS = new Set(['alert', 'confirm', 'prompt']);
const GLOBAL_OBJECTS = new Set(['window', 'globalThis', 'self']);
const NATIVE_TAGS = new Set(['select', 'option', 'datalist', 'dialog', 'NativeSelect']);
const NATIVE_INPUT_TYPES = new Set([
  'date',
  'time',
  'datetime-local',
  'month',
  'week',
  'color',
  'range',
]);

type Check = (node: ts.Node) => string | null;

const nameOf = (name: ts.Node): string =>
  ts.isIdentifier(name) || ts.isStringLiteral(name) ? name.text : '';

/** The string an attribute is set to, as `a="x"` or `a={'x'}`; null otherwise. */
const attributeText = (attribute: ts.JsxAttribute): string | null => {
  const value = attribute.initializer;
  if (!value) return null;
  if (ts.isStringLiteral(value)) return value.text;
  if (ts.isJsxExpression(value) && value.expression && ts.isStringLiteralLike(value.expression)) {
    return value.expression.text;
  }
  return null;
};

/** Whether an attribute is switched on: `a`, `a={true}`. */
const attributeIsOn = (attribute: ts.JsxAttribute): boolean => {
  const value = attribute.initializer;
  if (!value) return true;
  return ts.isJsxExpression(value) && value.expression?.kind === ts.SyntaxKind.TrueKeyword;
};

const findAttribute = (
  element: ts.JsxOpeningLikeElement,
  name: string,
): ts.JsxAttribute | undefined =>
  element.attributes.properties
    .filter(ts.isJsxAttribute)
    .find((attribute) => nameOf(attribute.name) === name);

/** `alert()`, `window.confirm()` and the like. */
const nativeDialogCall: Check = (node) => {
  if (!ts.isCallExpression(node)) return null;
  const callee = node.expression;
  if (ts.isIdentifier(callee) && NATIVE_DIALOGS.has(callee.text)) return `${callee.text}()`;
  if (
    ts.isPropertyAccessExpression(callee) &&
    ts.isIdentifier(callee.expression) &&
    GLOBAL_OBJECTS.has(callee.expression.text) &&
    NATIVE_DIALOGS.has(callee.name.text)
  ) {
    return `${callee.expression.text}.${callee.name.text}()`;
  }
  return null;
};

/** The browser's "Leave site?" prompt, by listener or by property. */
const leavePrompt: Check = (node) => {
  if (ts.isStringLiteralLike(node) && node.text === 'beforeunload') return 'beforeunload';
  if (ts.isIdentifier(node) && node.text === 'onbeforeunload') return 'onbeforeunload';
  return null;
};

/** `native: true` on a select's props. */
const nativeSelectProp: Check = (node) =>
  ts.isPropertyAssignment(node) &&
  nameOf(node.name) === 'native' &&
  node.initializer.kind === ts.SyntaxKind.TrueKeyword
    ? 'native: true'
    : null;

const nativeElement: Check = (node) => {
  if (!ts.isJsxOpeningElement(node) && !ts.isJsxSelfClosingElement(node)) return null;
  const tag = node.tagName.getText();
  if (NATIVE_TAGS.has(tag)) return `<${tag}>`;
  const native = findAttribute(node, 'native');
  if (native && attributeIsOn(native)) return `<${tag} native>`;
  const type = findAttribute(node, 'type');
  const inputType = type ? attributeText(type) : null;
  if (inputType && NATIVE_INPUT_TYPES.has(inputType)) return `type="${inputType}"`;
  return null;
};

/** A form the browser would validate with its own bubbles. */
const validatingForm: Check = (node) => {
  if (!ts.isJsxOpeningElement(node) && !ts.isJsxSelfClosingElement(node)) return null;
  const component = findAttribute(node, 'component');
  const isForm =
    node.tagName.getText() === 'form' || (component && attributeText(component) === 'form');
  if (!isForm) return null;
  const noValidate = findAttribute(node, 'noValidate');
  return noValidate && attributeIsOn(noValidate) ? null : 'form without noValidate';
};

const CHECKS: Check[] = [
  nativeDialogCall,
  leavePrompt,
  nativeSelectProp,
  nativeElement,
  validatingForm,
];

const findingsIn = (file: string, text: string): string[] => {
  const kind = file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, kind);
  const found: string[] = [];
  const visit = (node: ts.Node): void => {
    for (const check of CHECKS) {
      const what = check(node);
      if (what) {
        const { line } = source.getLineAndCharacterOfPosition(node.getStart(source));
        found.push(`${file}:${line + 1} ${what}`);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return found;
};

describe('the public site uses no native browser dialogs or controls', () => {
  it('reads the source it guards, including the serverless functions', () => {
    const files = Object.keys(sources);
    expect(files.length).toBeGreaterThan(100);
    expect(files.some((file) => file.startsWith('../../api/'))).toBe(true);
  });

  it('has no alert, confirm, prompt, leave-site prompt, native select or date input, and no browser validation', () => {
    const findings = Object.entries(sources).flatMap(([file, text]) => findingsIn(file, text));
    expect(findings).toEqual([]);
  });

  it('would catch each of them', () => {
    const sample = [
      "if (window.confirm('Leave?')) leave();",
      "alert('Saved');",
      "window.addEventListener('beforeunload', guard);",
      'window.onbeforeunload = guard;',
      'const props = { select: { native: true } };',
      'const a = <select><option>One</option></select>;',
      'const b = <TextField type="date" />;',
      'const c = <Box component="input" type="range" />;',
      'const d = <form onSubmit={submit}><button /></form>;',
      'const e = <Stack component="form" onSubmit={submit} />;',
      'const f = <Box component="form" noValidate onSubmit={submit} />;',
    ].join('\n');
    const findings = findingsIn('sample.tsx', sample).map((finding) =>
      finding.replace(/^sample\.tsx:\d+ /, ''),
    );
    expect(findings).toEqual([
      'window.confirm()',
      'alert()',
      'beforeunload',
      'onbeforeunload',
      'native: true',
      '<select>',
      '<option>',
      'type="date"',
      'type="range"',
      'form without noValidate',
      'form without noValidate',
    ]);
  });
});
