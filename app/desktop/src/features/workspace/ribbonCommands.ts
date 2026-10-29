import type { IconName } from '../../components/Icon';

export type RibbonGroup = { group: string; commands: string[] };

export const ribbonCommands: Record<string, RibbonGroup[]> = {
  Data: [
    { group: 'File', commands: ['Save', 'Undo', 'Redo'] },
    { group: 'Table', commands: ['Select columns', 'Filter row', 'Sort'] },
    { group: 'Reshape', commands: ['Group by', 'Pivot', 'Unpivot'] },
  ],
  Clean: [
    { group: 'Transform', commands: ['Convert', 'Replace', 'Fill'] },
    { group: 'Combine', commands: ['Split', 'Merge'] },
    { group: 'Columns and rows', commands: ['Remove', 'Rename'] },
  ],
  Profile: [
    { group: 'Overview', commands: ['Refresh', 'Column details'] },
    { group: 'Quality', commands: ['Data quality', 'Distribution', 'Duplicates'] },
    { group: 'Insights', commands: ['Creations', 'Patterns', 'Anomalies', 'Recommendations'] },
  ],
  Pipelines: [{ group: 'Pipeline', commands: ['Create pipeline', 'Run pipeline'] }],
  Export: [
    { group: 'Export', commands: ['Export'] },
    { group: 'Database', commands: ['Connect to DB', 'Test connection'] },
  ],
};

export const commandIcons: Record<string, IconName> = {
  Save: 'save',
  Undo: 'undo',
  Redo: 'redo',
  'Select columns': 'columns',
  'Filter row': 'filter',
  Sort: 'sort',
  'Group by': 'group',
  Pivot: 'pivot',
  Unpivot: 'unpivot',
  Convert: 'datatype',
  Replace: 'replace',
  Fill: 'fill',
  Split: 'split',
  Merge: 'merge',
  Remove: 'clean',
  Rename: 'columns',
  Refresh: 'reload',
  'Column details': 'columns',
  'Data quality': 'profile',
  Distribution: 'profile',
  Creations: 'profile',
  Patterns: 'profile',
  Anomalies: 'profile',
  Duplicates: 'profile',
  Recommendations: 'profile',
  'Create pipeline': 'pipeline',
  'Run pipeline': 'pipeline',
  Export: 'export',
  'Connect to DB': 'database',
  'Test connection': 'database',
};
