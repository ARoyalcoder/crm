import { z } from 'zod'

/**
 * The shape of a record chosen in an `EntityPicker`, for a form's validation schema. `data` is kept so a form can read
 * what the picker carries along (an employee's user id); leaving it out would make the schema drop it silently.
 */
export const pickedOption = z.object({
  id: z.string(),
  name: z.string(),
  hint: z.string().optional(),
  data: z.record(z.string(), z.string()).optional(),
})
