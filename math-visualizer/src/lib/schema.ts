import { z } from "zod";

export const ObjectSchema = z.object({
  id: z.string(),
  label: z.string(),
  color: z.string(),
  speed: z.number().nullable(),
  speedUnit: z.string().nullable(),
  startPosition: z.number(),
  direction: z.enum(["left", "right"]),
  startTime: z.number(),
});

export const SliderSchema = z.object({
  id: z.string(),
  label: z.string(),
  objectId: z.string(),
  field: z.enum(["speed", "startPosition", "startTime"]),
  min: z.number(),
  max: z.number(),
  step: z.number(),
  default: z.number(),
});

export const ProblemSchema = z.object({
  problemType: z.enum(["train", "projectile", "tank", "work", "distance", "generic"]),
  title: z.string(),
  question: z.string(),
  objects: z.array(ObjectSchema),
  environment: z.object({
    totalDistance: z.number().nullable(),
    distanceUnit: z.string(),
    timeUnit: z.string(),
    meetingPoint: z.number().nullable(),
  }),
  formulas: z.array(z.string()),
  answer: z.object({
    value: z.number().nullable(),
    unit: z.string(),
    expression: z.string(),
  }),
  sliders: z.array(SliderSchema),
});

export type ProblemData = z.infer<typeof ProblemSchema>;
export type ObjectData = z.infer<typeof ObjectSchema>;
export type SliderData = z.infer<typeof SliderSchema>;
