import { FilterBuilder } from '../data-operations/FilterBuilder';
import { SortBuilder } from '../data-operations/SortBuilder';
import { GroupBuilder } from '../data-operations/GroupBuilder';
import { PivotBuilder } from '../data-operations/PivotBuilder';
import { UnpivotBuilder } from '../data-operations/UnpivotBuilder';
import type { Column } from '../../types/dataset';
import type { DataOperation } from '../../types/dataOperations';
import type { PopupPosition } from './popupPositions';

type OperationDialog = 'filter' | 'sort' | 'group_by' | 'pivot' | 'unpivot' | null;

export function DataOperationDialog({
  kind,
  columns,
  busy,
  onApply,
  onClose,
  popupPosition,
}: {
  kind: OperationDialog;
  columns: Column[];
  busy: boolean;
  onApply: (operation: DataOperation) => void;
  onClose: () => void;
  popupPosition?: PopupPosition;
}) {
  if (!kind) return null;
  const props = { columns, onApply, onClose, popupPosition };
  switch (kind) {
    case 'filter':
      return <FilterBuilder {...props} />;
    case 'sort':
      return <SortBuilder {...props} />;
    case 'group_by':
      return <GroupBuilder {...props} busy={busy} />;
    case 'pivot':
      return <PivotBuilder {...props} busy={busy} />;
    case 'unpivot':
      return <UnpivotBuilder {...props} busy={busy} />;
  }
}
