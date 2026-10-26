import { z } from "zod";

export const scenarioIds = [
  "fast",
  "slow",
  "failed",
  "random",
  "sequential",
  "parallel",
  "nested",
  "external",
] as const;
export type ScenarioId = (typeof scenarioIds)[number];
export const scenarioInput = z
  .object({
    scenario: z.enum(scenarioIds),
    failureProbability: z.number().min(0).max(1).default(0.35),
  })
  .strict();
export type ScenarioInput = z.infer<typeof scenarioInput>;

export const timingSchema = z.object({
  id: z.string(),
  parentId: z.string().nullable(),
  operation: z.string(),
  startMs: z.number().nonnegative(),
  durationMs: z.number().nonnegative(),
  status: z.enum(["success", "error"]),
});
export type Timing = z.infer<typeof timingSchema>;
export const labResultSchema = z.object({
  scenario: z.enum(scenarioIds),
  status: z.enum(["success", "error"]),
  message: z.string(),
  httpStatus: z.number().int(),
  traceId: z
    .string()
    .regex(/^[0-9a-f]{32}$/)
    .nullable(),
  serverDurationMs: z.number().nonnegative(),
  backendTraceId: z
    .string()
    .regex(/^[0-9a-f]{32}$/)
    .nullable()
    .optional(),
  timings: z.array(timingSchema),
});
export type LabResult = z.infer<typeof labResultSchema>;

export const orderSchema = z.object({
  id: z.string(),
  customer: z.string(),
  initials: z.string(),
  product: z.string(),
  quantity: z.number().int(),
  total: z.number(),
  status: z.enum(["completed", "processing", "pending", "cancelled"]),
  date: z.string(),
  payment: z.string(),
});
export type Order = z.infer<typeof orderSchema>;
export const ordersResponseSchema = z.object({
  orders: z.array(orderSchema),
  traceId: z.string().nullable(),
});
export const backendSimulationSchema = z.object({
  ok: z.literal(true),
  traceId: z.string().nullable(),
  serverSpanId: z.string().nullable(),
  parentSpanId: z.string().nullable(),
});

export class LabError extends Error {
  readonly status: number;
  constructor(message: string, status = 500) {
    super(message);
    this.name = "LabError";
    this.status = status;
  }
}
export const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));
