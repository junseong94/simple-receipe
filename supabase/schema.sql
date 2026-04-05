-- Simple Recipe DB Schema
-- 비밀번호는 bcrypt 해시로만 저장 (원문 절대 노출 금지)

-- ============================================================
-- recipes 테이블: 큐레이션 레시피 (기존 JSON 데이터 → DB 이관)
-- ============================================================
CREATE TABLE recipes (
  id            VARCHAR(50)  PRIMARY KEY,
  name          VARCHAR(100) NOT NULL,
  cuisine       VARCHAR(20)  NOT NULL CHECK (cuisine IN ('korean','chinese','japanese','western')),
  difficulty    VARCHAR(10)  NOT NULL CHECK (difficulty IN ('easy','medium','hard')),
  cook_time     VARCHAR(20),
  servings      INTEGER      DEFAULT 2,
  ingredients   TEXT[]       NOT NULL,
  seasonings    TEXT[]       DEFAULT '{}',
  steps         TEXT[]       NOT NULL,
  youtube_url   VARCHAR(500),
  youtube_title VARCHAR(200),
  channel_name  VARCHAR(200),
  thumbnail_url VARCHAR(500),
  summary       TEXT,
  source        VARCHAR(10)  NOT NULL DEFAULT 'curated'
                CHECK (source = 'curated'),
  created_at    TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX idx_recipes_cuisine      ON recipes(cuisine);
CREATE INDEX idx_recipes_ingredients  ON recipes USING GIN(ingredients);

-- ============================================================
-- ingredients 테이블: 재료 사전 (동의어 포함)
-- ============================================================
CREATE TABLE ingredients (
  id       SERIAL       PRIMARY KEY,
  name     VARCHAR(100) NOT NULL UNIQUE,
  aliases  TEXT[]       DEFAULT '{}',
  category VARCHAR(20)  NOT NULL
           CHECK (category IN ('meat','seafood','vegetable','dairy','grain','seasoning','pantry'))
);

CREATE INDEX idx_ingredients_aliases ON ingredients USING GIN(aliases);

-- ============================================================
-- user_recipes 테이블: 사용자가 직접 등록한 레시피
-- ============================================================
CREATE TABLE user_recipes (
  id            UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  author_name   VARCHAR(50)  NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name          VARCHAR(100) NOT NULL,
  cuisine       VARCHAR(20)  NOT NULL CHECK (cuisine IN ('korean','chinese','japanese','western')),
  difficulty    VARCHAR(10)  NOT NULL CHECK (difficulty IN ('easy','medium','hard')),
  cook_time     VARCHAR(20),
  servings      INTEGER      DEFAULT 2,
  ingredients   TEXT[]       NOT NULL,
  seasonings    TEXT[]       DEFAULT '{}',
  steps         TEXT[]       NOT NULL,
  youtube_url   VARCHAR(500),
  youtube_title VARCHAR(200),
  channel_name  VARCHAR(200),
  thumbnail_url VARCHAR(500),
  summary       TEXT,
  created_at    TIMESTAMPTZ  DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX idx_user_recipes_cuisine      ON user_recipes(cuisine);
CREATE INDEX idx_user_recipes_ingredients  ON user_recipes USING GIN(ingredients);

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
