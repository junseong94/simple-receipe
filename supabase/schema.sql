-- user_recipes 테이블: 사용자가 직접 등록한 레시피
-- 비밀번호는 bcrypt 해시로만 저장 (원문 절대 노출 금지)

CREATE TABLE user_recipes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  author_name VARCHAR(50) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL,
  cuisine VARCHAR(20) NOT NULL CHECK (cuisine IN ('korean','chinese','japanese','western')),
  difficulty VARCHAR(10) NOT NULL CHECK (difficulty IN ('easy','medium','hard')),
  cook_time VARCHAR(20),
  servings INTEGER DEFAULT 2,
  ingredients TEXT[] NOT NULL,
  seasonings TEXT[] DEFAULT '{}',
  steps TEXT[] NOT NULL,
  youtube_url VARCHAR(500),
  youtube_title VARCHAR(200),
  channel_name VARCHAR(200),
  thumbnail_url VARCHAR(500),
  summary TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- cuisine 기반 필터링 성능을 위한 인덱스
CREATE INDEX idx_user_recipes_cuisine ON user_recipes(cuisine);

-- 재료 배열 전문 검색을 위한 GIN 인덱스
CREATE INDEX idx_user_recipes_ingredients ON user_recipes USING GIN(ingredients);

-- updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON user_recipes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
