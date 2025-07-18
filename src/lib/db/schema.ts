import { pgTable, varchar, timestamp, text, integer } from 'drizzle-orm/pg-core';

export const generations = pgTable('generations', {
  id: varchar('id', { length: 255 }).primaryKey(),
  originalImageUrl: text('original_image_url').notNull(),
  generatedImageUrl: text('generated_image_url'),
  style: varchar('style', { length: 50 }).default('cartoon'),
  status: varchar('status', { length: 20 }).default('pending'), // pending, processing, completed, failed
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  processingTime: integer('processing_time'), // in seconds
});

export type Generation = typeof generations.$inferSelect;
export type NewGeneration = typeof generations.$inferInsert;