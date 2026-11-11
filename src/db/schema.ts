import { relations } from 'drizzle-orm';
import { boolean, integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  displayName: text('display_name'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const projects = pgTable('projects', {
  id: text('id').primaryKey(),
  userUid: text('user_uid')
    .references(() => users.uid)
    .notNull(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  customInstructions: text('custom_instructions').notNull(),
  knowledgeDocsJson: text('knowledge_docs_json').notNull(),
  starred: boolean('starred').default(false),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const threads = pgTable('threads', {
  id: text('id').primaryKey(),
  userUid: text('user_uid')
    .references(() => users.uid)
    .notNull(),
  projectId: text('project_id'),
  title: text('title').notNull(),
  modelId: text('model_id').notNull(),
  styleId: text('style_id').notNull(),
  extendedThinking: boolean('extended_thinking').default(true),
  starred: boolean('starred').default(false),
  messagesJson: text('messages_json').notNull(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const documents = pgTable('documents', {
  id: serial('id').primaryKey(),
  userUid: text('user_uid')
    .references(() => users.uid)
    .notNull(),
  filename: text('filename').notNull(),
  mimeType: text('mime_type').notNull(),
  pageCount: integer('page_count').default(1).notNull(),
  extractedText: text('extracted_text').notNull(),
  summary: text('summary'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const usersRelations = relations(users, ({ many }) => ({
  projects: many(projects),
  threads: many(threads),
  documents: many(documents),
}));

export const projectsRelations = relations(projects, ({ one }) => ({
  author: one(users, {
    fields: [projects.userUid],
    references: [users.uid],
  }),
}));

export const threadsRelations = relations(threads, ({ one }) => ({
  author: one(users, {
    fields: [threads.userUid],
    references: [users.uid],
  }),
}));

export const documentsRelations = relations(documents, ({ one }) => ({
  author: one(users, {
    fields: [documents.userUid],
    references: [users.uid],
  }),
}));
