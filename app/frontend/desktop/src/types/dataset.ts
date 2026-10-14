export type Column = { name: string; type: string; nullable: boolean };
export type Dataset = { dataset_id: string; source_path: string; format: 'csv' | 'parquet'; schema: Column[]; columns: number; rows: number | null; state: string };
export type Preview = { dataset_id: string; columns: Column[]; records: Record<string, unknown>[]; offset: number; limit: number; total_count: number | null };
