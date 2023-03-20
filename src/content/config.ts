import { z, defineCollection } from "astro:content";

const blog = defineCollection({
    schema: z.object({
      title: z.string(),
      description: z.string(),
      tags: z.array(z.string()),
      pubDate: z.date(),
      draft: z.boolean(),
      renderer: z.enum(["html", "md"]).optional().default("md"),
      sticky: z.boolean().optional().default(false),
    })
});

export const collections = { blog };