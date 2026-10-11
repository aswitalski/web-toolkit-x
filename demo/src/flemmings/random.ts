/* A range of numbers, from the lowest to the highest. */
export type Range = readonly [number, number]

/* A random number in the range, any equally likely. */
export const uniform = ([min, max]: Range) => min + Math.random() * (max - min)

/* A random number in the range, more likely around its middle. */
export const triangular = ([min, max]: Range) =>
  min + ((Math.random() + Math.random()) / 2) * (max - min)
