import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

// 检查数据库URL是否配置
const databaseUrl = process.env.DATABASE_URL;

// 使用条件导出来避免类型错误
export const db = databaseUrl && databaseUrl !== 'your_neon_database_url_here' 
  ? drizzle(neon(databaseUrl), { schema })
  : null;