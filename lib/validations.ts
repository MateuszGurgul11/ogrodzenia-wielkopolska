import { z } from "zod";

export const hexColorSchema = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}$/, "Kolor musi być w formacie #RRGGBB");

export const postSchema = z.object({
  name: z.string().min(1, "Nazwa jest wymagana"),
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9-]+$/, "Slug: małe litery, cyfry i myślniki"),
  description: z.string().optional(),
  previewAsset: z.string().optional(),
  widthCm: z.coerce.number().min(10).max(50),
  sortOrder: z.coerce.number().int().min(0),
  active: z.boolean(),
});

export const panelSchema = z.object({
  name: z.string().min(1, "Nazwa jest wymagana"),
  patternId: z.enum([
    "pattern-solid",
    "pattern-lines",
    "pattern-grid",
    "pattern-brick",
  ]),
  description: z.string().optional(),
  previewAsset: z.string().optional(),
  sortOrder: z.coerce.number().int().min(0),
  active: z.boolean(),
});

export const spacerSchema = z.object({
  name: z.string().min(1, "Nazwa jest wymagana"),
  hasSpacer: z.boolean(),
  openness: z.coerce.number().min(0).max(1),
  sortOrder: z.coerce.number().int().min(0),
  active: z.boolean(),
});

export const heightSchema = z.object({
  label: z.string().min(1, "Etykieta jest wymagana"),
  valueM: z.coerce.number().min(1).max(2.25),
  description: z.string().optional(),
  sortOrder: z.coerce.number().int().min(0),
  active: z.boolean(),
});

export const colorSchema = z.object({
  name: z.string().min(1, "Nazwa jest wymagana"),
  hex: hexColorSchema,
  description: z.string().optional(),
  previewAsset: z.string().optional(),
  sortOrder: z.coerce.number().int().min(0),
  active: z.boolean(),
});

export const loginSchema = z.object({
  email: z.string().email("Podaj poprawny adres e-mail"),
  password: z.string().min(6, "Hasło musi mieć co najmniej 6 znaków"),
});
