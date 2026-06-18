import { z } from 'zod';

// "Irish Word of the Week" — the project's first custom block. Hybrid content
// model: structured fields for the headline parts (styled), markdown bodies for
// the variable definitions and origin note.
const IrishWordOfTheWeekPropsSchema = z.object({
  style: z
    .object({
      padding: z
        .object({
          top: z.number(),
          bottom: z.number(),
          right: z.number(),
          left: z.number(),
        })
        .optional()
        .nullable(),
    })
    .optional()
    .nullable(),
  props: z
    .object({
      word: z.string().optional().nullable(),
      pronunciation: z.string().optional().nullable(),
      partOfSpeech: z.string().optional().nullable(),
      definitions: z.string().optional().nullable(),
      origin: z.string().optional().nullable(),
    })
    .optional()
    .nullable(),
});

export type IrishWordOfTheWeekProps = z.infer<typeof IrishWordOfTheWeekPropsSchema>;
export default IrishWordOfTheWeekPropsSchema;
