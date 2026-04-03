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

export const StepSchema = z.object({
  step: z.number(),
  description: z.string(),
  equation: z.string().optional(),
});

export const ProblemSchema = z.object({
  problemType: z.enum(["motion", "graph", "geometry", "chemical_reaction", "abstract", "projectile", "electricity", "work_energy", "algebra"]).catch("abstract"),
  domain: z.enum(["math", "physics", "chemistry"]).optional().catch("math"),
  title: z.string(),
  question: z.string(),
  extractedData: z.object({
    knowns: z.array(z.object({
      label: z.string(),
      value: z.union([z.number(), z.string()]),
      unit: z.string().optional(),
    })).catch([]),
    unknowns: z.array(z.object({
      label: z.string(),
      unit: z.string().optional(),
    })).catch([]),
    assumptions: z.array(z.union([z.string(), z.object({ label: z.string() }).transform(o => o.label)])).catch([]),
  }).optional().catch(undefined),
  steps: z.array(StepSchema).catch([]),
  finalAnswers: z.array(z.object({
    label: z.string(),
    value: z.any().catch(null).transform(v => {
      if (v === null || v === undefined) return null;
      if (typeof v === 'number' && isFinite(v)) return parseFloat(v.toFixed(4));
      if (typeof v === 'string') {
        try {
          const result = Function('Math', `"use strict"; return (${v})`)(Math);
          if (typeof result === 'number' && isFinite(result)) return parseFloat(result.toFixed(4));
        } catch {}
        return parseFloat(v) || null;
      }
      if (typeof v === 'object') return Number(Object.values(v)[0]) || null;
      return null;
    }),
    unit: z.string().catch(''),
    expression: z.string().catch(''),
  })).catch([]),
  answer: z.object({
    value: z.any().catch(null).transform(v => {
      if (v === null || v === undefined) return null;
      if (typeof v === 'number') return v;
      if (typeof v === 'object') return Number(Object.values(v)[0]) || null;
      return Number(v) || null;
    }),
    unit: z.any().catch('').transform(v => {
      if (!v) return '';
      if (typeof v === 'string') return v;
      if (typeof v === 'object') return String(Object.values(v)[0] ?? '');
      return String(v);
    }),
    expression: z.any().catch('').transform(v => {
      if (!v) return '';
      if (typeof v === 'string') return v;
      if (typeof v === 'object') return Object.values(v).join(' | ');
      return String(v);
    }),
  }),
  explanation: z.string().catch(''),
  objects: z.array(ObjectSchema).catch([]),
  environment: z.object({
    totalDistance: z.number().nullable().catch(null),
    distanceUnit: z.string().catch(''),
    timeUnit: z.string().catch(''),
    meetingPoint: z.number().nullable().catch(null),
  }).catch({ totalDistance: null, distanceUnit: '', timeUnit: '', meetingPoint: null }),
  formulas: z.array(z.string()).catch([]),
  sliders: z.array(SliderSchema).catch([]),
  animationDescription: z.string().optional().catch(''),
});

export type ProblemData = z.infer<typeof ProblemSchema>;
export type ObjectData = z.infer<typeof ObjectSchema>;
export type SliderData = z.infer<typeof SliderSchema>;
export type StepData = z.infer<typeof StepSchema>;
