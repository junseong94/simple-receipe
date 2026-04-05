/**
 * Supabase 클라이언트 초기화
 *
 * Phase 1에서는 Supabase 없이도 동작해야 하므로,
 * 환경변수가 없을 때 null을 반환하고 에러를 던지지 않습니다.
 *
 * 사용 전 반드시 null 체크가 필요합니다:
 * @example
 * if (!supabase) {
 *   // Supabase 미설정 상태: 정적 데이터로 폴백
 *   return fallback();
 * }
 * const { data } = await supabase.from("recipes").select("*");
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Supabase 클라이언트 인스턴스.
 *
 * 환경변수(NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY)가
 * 설정되지 않은 경우 null을 반환합니다.
 * Phase 1에서는 정적 JSON 데이터 기반으로 동작하므로 null이 정상 상태입니다.
 */
export const supabase: SupabaseClient | null =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

/**
 * Supabase 클라이언트가 초기화되어 있는지 확인합니다.
 *
 * @example
 * if (isSupabaseConfigured()) {
 *   // DB 연동 로직
 * }
 */
export function isSupabaseConfigured(): boolean {
  return supabase !== null;
}
