import { z } from 'zod';
import { insertJobSchema, jobs, analysisResponseSchema } from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export const api = {
  jobs: {
    list: {
      method: 'GET' as const,
      path: '/api/jobs' as const,
      responses: {
        200: z.array(z.custom<typeof jobs.$inferSelect>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/jobs/:id' as const,
      responses: {
        200: z.custom<typeof jobs.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
  },
  analyze: {
    upload: {
      method: 'POST' as const,
      path: '/api/analyze/upload' as const,
      // Input is multipart/form-data, so we don't strictly validate body schema here in the route definition
      // The backend will handle the file parsing
      responses: {
        200: analysisResponseSchema,
        400: errorSchemas.validation,
        500: errorSchemas.internal,
      },
    }
  }
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
