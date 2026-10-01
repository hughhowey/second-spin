import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
export const rooms = sqliteTable('rooms', { ownerId:text('owner_id').primaryKey(), document:text('document').notNull(), revision:integer('revision').notNull().default(0), updatedAt:text('updated_at').notNull() });
export const spotifyConnections = sqliteTable('spotify_connections', { ownerId:text('owner_id').primaryKey(), clientId:text('client_id').notNull(), encryptedTokens:text('encrypted_tokens') });
export const aiUsage = sqliteTable('ai_usage', {usageKey:text('usage_key').primaryKey(),requests:integer('requests').notNull().default(0)});
export const spotifyExports = sqliteTable('spotify_exports', {exportKey:text('export_key').primaryKey(),result:text('result'),createdAt:text('created_at').notNull()});
