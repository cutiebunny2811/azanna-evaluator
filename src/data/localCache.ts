import { del, get, set } from "idb-keyval";
import type { EvaluationConfig, ImportResult } from "../types";

const cacheKey = "azanna:last-dataset:v1";

export interface CachedEvaluatorState {
  dataset: ImportResult;
  config: EvaluationConfig;
  savedAt: string;
}

export const loadCachedState = () => get<CachedEvaluatorState>(cacheKey);

export const saveCachedState = (dataset: ImportResult, config: EvaluationConfig) =>
  set(cacheKey, { dataset, config, savedAt: new Date().toISOString() } satisfies CachedEvaluatorState);

export const clearCachedState = () => del(cacheKey);
