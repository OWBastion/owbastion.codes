export type OcrFieldEvidence = {
  confidence?: number;
  status?: string;
};

export type OcrResponse = {
  schema_version?: string;
  ok?: boolean;
  request_id?: string;
  model_version?: string;
  layout_version?: string;
  warnings?: unknown;
  quality?: { warnings?: unknown };
  fields?: Record<string, OcrFieldEvidence>;
};

export type OcrQualityGate = {
  accepted: boolean;
  requiredFields: string[];
  reasons: string[];
};

const minOcrConfidence = 0.85;

export const assessOcrQuality = (challengeType: string, response: OcrResponse): OcrQualityGate => {
  const requiredFields = challengeType === "title_achievement"
    ? ["challenge_completed", "player"]
    : ["challenge_completed", "player", "map_name", "difficulty"];
  const reasons: string[] = [];
  if (response.schema_version !== "1") reasons.push("unsupported_schema_version");
  if (response.ok !== true) reasons.push("unsuccessful_response");

  for (const name of requiredFields) {
    const field = response.fields?.[name];
    if (!field) reasons.push(`${name}:missing_evidence`);
    else if (field.status !== "ok") reasons.push(`${name}:${field.status ?? "missing_status"}`);
    else if (typeof field.confidence !== "number" || field.confidence < minOcrConfidence) reasons.push(`${name}:low_confidence`);
  }

  return { accepted: reasons.length === 0, requiredFields, reasons };
};
