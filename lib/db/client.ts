import { Pool } from "pg";

// Next.js 개발 모드의 HMR(Hot Module Replacement) 시 Pool 인스턴스 중복 생성 방지
// globalThis에 캐싱하여 단일 Pool 유지
declare global {
  // eslint-disable-next-line no-var
  var __pgPool: Pool | undefined;
}

function createPool(): Pool {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL 환경변수가 설정되지 않았습니다.");
  }
  return new Pool({
    connectionString: process.env.DATABASE_URL,
  });
}

const pool: Pool =
  process.env.NODE_ENV === "production"
    ? createPool()
    : (globalThis.__pgPool ??= createPool());

export { pool };

export async function query<T>(
  text: string,
  params?: unknown[],
): Promise<T[]> {
  const { rows } = await pool.query(text, params);
  return rows as T[];
}
