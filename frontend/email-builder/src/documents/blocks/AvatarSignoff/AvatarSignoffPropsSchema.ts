import { z } from 'zod';

// "Avatar signoff" — a footer/signature block: an avatar image beside a name and
// a secondary line (defaults to the brand). The project's second custom block.
const AvatarSignoffPropsSchema = z.object({
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
      imageUrl: z.string().optional().nullable(),
      name: z.string().optional().nullable(),
      subtitle: z.string().optional().nullable(),
      shape: z.enum(['circle', 'square']).optional().nullable(),
    })
    .optional()
    .nullable(),
});

export type AvatarSignoffProps = z.infer<typeof AvatarSignoffPropsSchema>;
export default AvatarSignoffPropsSchema;
