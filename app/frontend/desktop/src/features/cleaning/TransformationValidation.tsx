export function TransformationValidation({ error }: { error: string }) {
  return error ? <p role="alert" className="error">{error}</p> : null;
}
