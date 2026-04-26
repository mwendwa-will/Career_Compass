import { z } from 'zod';
import { jobResponseSchema, analysisResponseSchema } from './schema';

export type { AnalysisResponse } from './schema';

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
        200: z.array(jobResponseSchema),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/jobs/:id' as const,
      responses: {
        200: jobResponseSchema,
        404: errorSchemas.notFound,
      },
    },
  },
  analyze: {
    upload: {
      method: 'POST' as const,
      path: '/api/analyze/upload' as const,
      responses: {
        202: z.object({ taskId: z.string() }),
        400: errorSchemas.validation,
        500: errorSchemas.internal,
      },
    }
  },
  tasks: {
    get: {
      method: 'GET' as const,
      path: '/api/tasks/:id' as const,
      responses: {
        200: z.object({
          taskId: z.string(),
          status: z.enum(['pending', 'processing', 'completed', 'failed']),
          progress: z.string().optional().nullable(),
          result: analysisResponseSchema.optional().nullable(),
          error: z.string().optional().nullable(),
        }),
        404: errorSchemas.notFound,
      },
    },
  },
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
