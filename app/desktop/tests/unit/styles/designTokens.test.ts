import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

// Contract for src/styles/tokens (see DESIGN_RULES.md). Every colour theme must define the same
// semantic roles in light and dark, meet WCAG AA, and keep its raw palette private.
const tokensDir = join(__dirname, '../../../src/styles/tokens');
const srcDir = join(__dirname, '../../../src');
const themes = ['graphite', 'ledger', 'paper', 'orchid'] as const;
const modes = ['light', 'dark'] as const;

const roles = [
  'bg',
  'surface',
  'surface-raised',
  'border',
  'border-strong',
  'text',
  'text-muted',
  'text-subtle',
  'accent',
  'accent-hover',
  'accent-contrast',
  'accent-soft',
  'success',
  'success-soft',
  'warning',
  'warning-soft',
  'danger',
  'danger-soft',
  'info',
  'info-soft',
  'chrome',
  'chrome-text',
  'chrome-muted',
  'chrome-border',
  'chart-2',
];

// [foreground, background, minimum ratio]
const contrastPairs: [string, string, number][] = [
  ...['text', 'text-muted', 'text-subtle'].flatMap((fg) =>
    ['bg', 'surface', 'surface-raised'].map((bg): [string, string, number] => [fg, bg, 4.5]),
  ),
  ['text', 'accent-soft', 4.5],
  ['text-muted', 'accent-soft', 4.5],
  ['accent', 'accent-soft', 4.5],
  ['accent', 'surface', 4.5],
  ['accent', 'bg', 4.5],
  ['accent-contrast', 'accent', 4.5],
  ['accent-contrast', 'accent-hover', 4.5],
  ['border-strong', 'surface', 3],
  ['border-strong', 'bg', 3],
  ['accent', 'surface-raised', 3],
  ['chrome-text', 'chrome', 4.5],
  ['chrome-muted', 'chrome', 4.5],
  ['accent', 'chrome', 3],
  ['chart-2', 'surface', 3],
  ...['success', 'warning', 'danger', 'info'].flatMap((status): [string, string, number][] => [
    [status, 'surface', 4.5],
    [status, `${status}-soft`, 4.5],
  ]),
];

const scaleTokens = [
  'font-display',
  'font-body',
  'font-mono',
  'text-caption-size',
  'text-small-size',
  'text-body-size',
  'text-body-lg-size',
  'text-title-size',
  'text-heading-size',
  'text-display-size',
  'weight-regular',
  'weight-medium',
  'weight-semibold',
  'space-0-5',
  'space-1',
  'space-2',
  'space-3',
  'space-4',
  'space-6',
  'space-8',
  'size-control',
  'size-control-sm',
  'size-row',
  'size-icon',
  'radius-sm',
  'radius-control',
  'radius-panel',
  'shadow-popup',
  'duration-fast',
  'ease-standard',
  'focus-ring-width',
  'z-popup',
  'color-row-hover',
  'color-chart-1',
];

type Block = { selector: string; decls: Map<string, string> };

function parseBlocks(css: string): Block[] {
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, '');
  return [...clean.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, selector, body]) => ({
    selector: selector.trim(),
    decls: new Map(
      [...body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map(([, name, value]) => [
        name,
        value.trim(),
      ]),
    ),
  }));
}

function readTheme(theme: string) {
  const blocks = parseBlocks(readFileSync(join(tokensDir, `theme-${theme}.css`), 'utf8'));
  const primitives = new Map<string, string>();
  blocks.forEach((b) =>
    b.decls.forEach((v, k) => k.startsWith(`--${theme}-`) && primitives.set(k, v)),
  );
  const resolve = (value: string) => {
    const ref = value.match(/^var\((--[\w-]+)\)$/);
    return ref ? primitives.get(ref[1]) : value;
  };
  const roleMap = (mode: string) => {
    const found = blocks.find(
      (b) =>
        b.decls.has('--color-bg') && b.selector.includes("data-mode='dark'") === (mode === 'dark'),
    );
    const map = new Map<string, string | undefined>();
    found?.decls.forEach((v, k) => map.set(k.replace(/^--color-/, ''), resolve(v)));
    return map;
  };
  return { primitives, roleMap };
}

function luminance(hex: string) {
  const channels = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const linear = channels.map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function contrast(a: string, b: string) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? walk(join(dir, entry.name)) : [join(dir, entry.name)],
  );
}

describe('design tokens', () => {
  for (const theme of themes) {
    for (const mode of modes) {
      it(`${theme} ${mode} defines every semantic role as a palette hex`, () => {
        const map = readTheme(theme).roleMap(mode);
        for (const role of roles)
          expect(map.get(role), `--color-${role}`).toMatch(/^#[0-9a-f]{6}$/);
      });

      it(`${theme} ${mode} meets WCAG AA for every text and boundary pair`, () => {
        const map = readTheme(theme).roleMap(mode);
        const failures = contrastPairs
          .map(([fg, bg, min]) => ({
            pair: `${fg} on ${bg}`,
            ratio: contrast(map.get(fg)!, map.get(bg)!),
            min,
          }))
          .filter(({ ratio, min }) => ratio < min)
          .map(({ pair, ratio }) => `${pair}: ${ratio.toFixed(2)}`);
        expect(failures).toEqual([]);
      });
    }
  }

  it('graphite is the default theme on :root', () => {
    const css = readFileSync(join(tokensDir, 'theme-graphite.css'), 'utf8');
    expect(css).toMatch(/:root,\s*:root\[data-theme='graphite'\],/);
  });

  it('scale tokens are all defined', () => {
    const decls = parseBlocks(readFileSync(join(tokensDir, 'scale.css'), 'utf8')).flatMap((b) => [
      ...b.decls.keys(),
    ]);
    for (const token of scaleTokens) expect(decls, `--${token}`).toContain(`--${token}`);
  });

  it('palette primitives are only used inside the token files', () => {
    const offenders = walk(srcDir)
      .filter((file) => /\.(css|tsx?)$/.test(file) && !file.startsWith(tokensDir))
      .filter((file) => /var\(--(graphite|ledger|paper|orchid)-/.test(readFileSync(file, 'utf8')))
      .map((file) => relative(srcDir, file));
    expect(offenders).toEqual([]);
  });
});
