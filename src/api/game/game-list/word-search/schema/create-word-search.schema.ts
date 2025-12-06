import z from 'zod';

import { fileSchema, StringToBooleanSchema } from '@/common';

export const CreateWordSearchSchema = z.object({
  name: z.string().min(1).max(128).trim(),
  description: z.string().max(256).trim().optional(),
  thumbnail_image: fileSchema({}),
  words: z.array(z.string().min(2).max(20).trim()).min(0).max(20),
  grid_size: z.coerce.number().min(8).max(20).default(15),
  time_limit: z.coerce.number().min(30).max(600).default(480),
  lives: z.coerce.number().min(1).max(10).default(5),
  directions: z
    .array(z.enum(['horizontal', 'vertical', 'diagonal']))
    .min(1)
    .default(['horizontal', 'vertical', 'diagonal']),
  is_publish_immediately: StringToBooleanSchema.default(false),
});

export type ICreateWordSearch = z.infer<typeof CreateWordSearchSchema>;
