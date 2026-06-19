import { z } from 'zod';

// "Social links" — a row of green icon buttons linking out to the brand's
// channels. Only platforms with a URL set are rendered. Third custom block.
const SocialLinksPropsSchema = z.object({
  style: z
    .object({
      backgroundColor: z.string().optional().nullable(),
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
      website: z.string().optional().nullable(),
      facebook: z.string().optional().nullable(),
      instagram: z.string().optional().nullable(),
      tiktok: z.string().optional().nullable(),
      alignment: z.enum(['left', 'center', 'right']).optional().nullable(),
    })
    .optional()
    .nullable(),
});

export type SocialLinksProps = z.infer<typeof SocialLinksPropsSchema>;
export default SocialLinksPropsSchema;
