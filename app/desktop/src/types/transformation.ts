export type Operation = {
  type: string;
  parameters: Record<string, unknown>;
  enabled: boolean;
  order: number;
  operation_id?: string;
};
