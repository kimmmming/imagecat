import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

// 检查数据库URL是否配置
const databaseUrl = process.env.DATABASE_URL;

// 验证数据库URL格式
function isValidDatabaseUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'postgresql:' && 
           !!parsed.hostname && 
           !!parsed.pathname && 
           !!parsed.username;
  } catch {
    return false;
  }
}

// 使用条件导出来避免类型错误
export const db = (databaseUrl && 
                  databaseUrl !== 'your_neon_database_url_here' && 
                  isValidDatabaseUrl(databaseUrl)) 
  ? drizzle(neon(databaseUrl), { schema })
  : null;

// 导出连接状态检查函数
export function isDatabaseConnected(): boolean {
  return db !== null;
}