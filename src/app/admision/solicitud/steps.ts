export const STEP_IDS = ["A", "B", "C", "D", "E", "F", "G", "H", "I"] as const;
export type StepId = (typeof STEP_IDS)[number];
