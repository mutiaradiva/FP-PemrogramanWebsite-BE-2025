import z from 'zod';

export const CheckAnswerSchema = z.object({
  found_words: z.array(z.string()).min(0),
  time_taken: z.number().min(0),
  lives_remaining: z.number().min(0),
});

export type ICheckAnswer = z.infer<typeof CheckAnswerSchema>;
