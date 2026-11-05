import type { Column } from '../../types/dataset';

/**
 * Carries the user's visible columns across a dataset change (a step, undo, redo): a renamed
 * column keeps its place, columns that did not exist before are shown, removed ones drop out.
 */
export function carryVisibleColumns(selected: string[], before: Column[], after: Column[]) {
  const existed = new Set(before.map((column) => column.name));
  const exists = new Set(after.map((column) => column.name));
  const added = after.map((column) => column.name).filter((name) => !existed.has(name));
  const visible = selected.flatMap((name) => {
    if (exists.has(name)) return [name];
    // Renames keep the column's position in the schema.
    const renamed = after[before.findIndex((column) => column.name === name)]?.name;
    return renamed && added.includes(renamed) ? [renamed] : [];
  });
  return [...visible, ...added.filter((name) => !visible.includes(name))];
}
