import z from 'zod';

import { fileSchema, StringToBooleanSchema } from '@/common';

export const UpdateWordSearchSchema = z.object({
  name: z.string().min(1).max(128).trim().optional(),
  description: z.string().max(256).trim().optional(),
  thumbnail_image: fileSchema({}).optional(),
  words: z.array(z.string().min(2).max(20).trim()).min(0).max(20).optional(),
  grid_size: z.coerce.number().min(8).max(20).optional(),
  time_limit: z.coerce.number().min(30).max(600).optional(),
  lives: z.coerce.number().min(1).max(10).optional(),
  directions: z
    .array(z.enum(['horizontal', 'vertical', 'diagonal']))
    .min(1)
    .optional(),
  is_publish: StringToBooleanSchema.optional(),
});

export type IUpdateWordSearch = z.infer<typeof UpdateWordSearchSchema>;
