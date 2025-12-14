import { z } from 'zod'

/**
 * Base validation schemas for common input types
 * These can be used across the application to ensure consistent validation
 */

// User ID validation
export const userIdSchema = z.number().int().positive()

// Text input validation (with sanitization)
export const textInputSchema = z.string().trim().min(1).max(1000)

// Email validation
export const emailSchema = z.string().email().toLowerCase()

// Tier validation
export const tierSchema = z.enum(['S', 'A', 'B', 'C', 'D'])

// ID validation (for items, votes, etc.)
export const idSchema = z.number().int().positive()

// Pagination schemas
export const paginationSchema = z.object({
  limit: z.number().int().positive().max(100).default(20),
  offset: z.number().int().nonnegative().default(0)
})

// Date range validation
export const dateRangeSchema = z.object({
  startDate: z.coerce.date(),
  endDate: z.coerce.date()
}).refine(data => data.endDate >= data.startDate, {
  message: "End date must be after or equal to start date",
  path: ["endDate"]
})

/**
 * Helper function to safely parse and validate input
 * Returns either the validated data or throws a descriptive error
 * @param schema - The Zod schema to validate against
 * @param input - The input data to validate
 * @param isClientFacing - If true, returns generic error messages (default: true)
 */
export function validateInput<T>(
  schema: z.ZodSchema<T>,
  input: unknown,
  isClientFacing: boolean = true
): T {
  const result = schema.safeParse(input)
  
  if (!result.success) {
    if (isClientFacing) {
      // Generic error for client-facing responses
      throw new Error('Invalid input provided')
    }
    // Detailed error for server-side logging
    const errors = result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
    throw new Error(`Validation failed: ${errors}`)
  }
  
  return result.data
}

/**
 * Helper function for async validation (useful for database checks)
 * @param schema - The Zod schema to validate against
 * @param input - The input data to validate
 * @param isClientFacing - If true, returns generic error messages (default: true)
 */
export async function validateInputAsync<T>(
  schema: z.ZodSchema<T>,
  input: unknown,
  isClientFacing: boolean = true
): Promise<T> {
  const result = await schema.safeParseAsync(input)
  
  if (!result.success) {
    if (isClientFacing) {
      // Generic error for client-facing responses
      throw new Error('Invalid input provided')
    }
    // Detailed error for server-side logging
    const errors = result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
    throw new Error(`Validation failed: ${errors}`)
  }
  
  return result.data
}
