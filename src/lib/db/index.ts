import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

const databaseUrl = process.env.DATABASE_URL;

function isValidDatabaseUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      (parsed.protocol === 'postgresql:' || parsed.protocol === 'postgres:') &&
      Boolean(parsed.hostname) &&
      Boolean(parsed.pathname) &&
      Boolean(parsed.username)
    );
  } catch {
    return false;
  }
}

export const db =
  databaseUrl && databaseUrl !== 'your_neon_database_url_here' && isValidDatabaseUrl(databaseUrl)
    ? drizzle(neon(databaseUrl), { schema })
    : null;

export function isDatabaseConnected(): boolean {
  return db !== null;
}
