# Simple Recipe - 기술 명세서 (Specification)

> 이 문서는 [docs/prd.md](./prd.md)의 설계안을 기반으로 작성된 기술 명세서입니다.

---

## 1. 기술 스택

| 구분 | 기술 | 버전 | 비고 |
|------|------|------|------|
| **프레임워크** | Next.js (App Router) | 16.2.2 | SSR/SSG 지원 |
| **UI 라이브러리** | React | 19.2.4 | Server/Client Components |
| **언어** | TypeScript | ^5 | strict 모드 |
| **스타일링** | Tailwind CSS | ^4 | @theme inline, CSS 기반 설정 |
| **데이터베이스** | Supabase (PostgreSQL) | - | 사용자 등록 레시피 저장 |
| **패스워드 해싱** | bcryptjs | ^3 | 순수 JS, 서버리스 호환 |
| **스키마 검증** | zod | ^3 | 폼 입력 + API 응답 검증 |
| **배포** | Vercel | - | Hobby 무료 플랜 |
| **폰트** | Geist Sans / Geist Mono | - | next/font/google |
| **린팅** | ESLint 9 + eslint-config-next | - | flat config |

### 추가 설치 패키지
```bash
npm install @supabase/supabase-js bcryptjs zod
npm install -D @types/bcryptjs
```

---

## 2. 데이터 레이어

### 2-1. 정적 레시피 데이터 (큐레이션)

프로젝트 내 JSON 파일로 관리. 빌드 타임에 번들에 포함.

**파일**: `data/recipes.json`

```typescript
// lib/recipes/types.ts
interface Recipe {
  id: string;                    // "korean-001" (큐레이션) | UUID (사용자 등록)
  name: string;                  // "제육볶음"
  cuisine: "korean" | "chinese" | "japanese" | "western";
  difficulty: "easy" | "medium" | "hard";
  cookTime: string;              // "20분"
  servings: number;
  ingredients: string[];         // 필수 재료 (기본양념 제외)
  seasonings: string[];          // 기본 양념 (소금, 간장 등)
  steps: string[];               // 조리 순서
  youtubeUrl: string;            // YouTube 영상 URL
  youtubeTitle: string;          // 영상 제목
  channelName: string;           // YouTube 채널명 (예: "백종원의 요리비책")
  thumbnailUrl: string;          // 썸네일 (img.youtube.com)
  summary: string;               // 레시피 요약 (2~3문장)
  source: "curated";             // 데이터 출처 구분
}
```

> **레시피 ID 네임스페이스 규칙**:
> - 큐레이션 레시피: `"korean-001"`, `"chinese-001"` 등 문자열 형태
> - 사용자 등록 레시피: Supabase UUID (예: `"550e8400-e29b-41d4-a716-446655440000"`)
> - ID 형태가 달라 충돌 없음. 상세 페이지(`/recipe/[id]`) 라우팅 시 ID 형태로 소스를 판별

### 2-2. 사용자 등록 레시피 (Supabase)

사용자가 직접 등록하는 레시피는 Supabase PostgreSQL에 저장.

**Supabase 무료 플랜 한도**:
- 500MB 데이터베이스 저장소
- 50,000 MAU
- 무제한 API 요청
- 2개 프로젝트

**테이블 스키마**:
```sql
CREATE TABLE user_recipes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  author_name VARCHAR(50) NOT NULL,         -- 작성자 닉네임 (아이디)
  password_hash VARCHAR(255) NOT NULL,       -- bcryptjs 해시
  name VARCHAR(100) NOT NULL,
  cuisine VARCHAR(20) NOT NULL CHECK (cuisine IN ('korean','chinese','japanese','western')),
  difficulty VARCHAR(10) NOT NULL CHECK (difficulty IN ('easy','medium','hard')),
  cook_time VARCHAR(20),
  servings INTEGER DEFAULT 2,
  ingredients TEXT[] NOT NULL,               -- 필수 재료 배열
  seasonings TEXT[] DEFAULT '{}',            -- 양념 배열
  steps TEXT[] NOT NULL,                     -- 조리 순서 배열
  youtube_url VARCHAR(500),
  youtube_title VARCHAR(200),
  channel_name VARCHAR(200),                 -- YouTube 채널명
  thumbnail_url VARCHAR(500),
  summary TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_recipes_cuisine ON user_recipes(cuisine);
CREATE INDEX idx_user_recipes_ingredients ON user_recipes USING GIN(ingredients);
```

### 2-3. 재료 사전

**파일**: `data/ingredients.json`

```typescript
interface IngredientDictionary {
  ingredients: {
    name: string;                // 정규화된 이름
    aliases: string[];           // 동의어 ["돼지삼겹살", "삼겹"]
    category: "meat" | "seafood" | "vegetable" | "dairy" | "grain" | "seasoning" | "pantry";
  }[];
}
```

**기본 양념 (pantry)** — 누락 재료 점수 계산 시 제외:

| 구분 | 항목 |
|------|------|
| 기본 조미료 | 소금, 설탕, 후추, 식용유 |
| 한식 기본 양념 | 간장, 된장, 고추장, 참기름, 고춧가루, 다진마늘 |
| 양식/일식/중식 기본 양념 | 올리브오일, 버터, 굴소스 |
| 공통 재료 | 물, 밥, 계란 |

> [Open Question] 마요네즈, 케첩, 식초, 미림 등 빈도 높은 소스류의 포함 여부는 프로토타입 피드백 후 결정. 양식/일식 레시피 완성도에 직접 영향을 미침.

---

## 3. 사용자 레시피 등록 (인증 없이)

### 핵심 원칙
- **로그인/회원가입 없음**
- 레시피 등록 시 닉네임(아이디) + 비밀번호를 그때그때 입력
- 비밀번호는 `bcryptjs`로 해싱하여 DB에 저장
- 수정/삭제 시 동일한 닉네임 + 비밀번호 입력으로 본인 확인

### 등록 플로우
```
[레시피 작성 폼]
  - 닉네임 (작성자명)
  - 비밀번호 (4~20자)
  - 레시피 정보 (이름, 재료, 조리법, YouTube URL 등)
       |
       v
[Server Action: createRecipe]
  1. zod로 입력값 검증
  2. bcryptjs.hash(password, 10) 으로 비밀번호 해싱
  3. Supabase에 INSERT (password_hash 저장)
  4. 성공 시 레시피 상세 페이지로 redirect
```

### 수정/삭제 플로우
```
[수정/삭제 요청]
  - 닉네임 + 비밀번호 입력
       |
       v
[Server Action: verifyAndUpdate / verifyAndDelete]
  1. Supabase에서 해당 레시피의 author_name, password_hash 조회
  2. bcryptjs.compare(password, password_hash) 로 검증
  3. 일치 시 UPDATE/DELETE 수행
  4. 불일치 시 에러 반환
```

### 보안 고려사항
- 비밀번호는 절대 평문 저장하지 않음 (bcrypt salt round: 10)
- 클라이언트에서 비밀번호를 해싱하지 않음 (반드시 서버에서 처리)
- Rate limiting: 동일 IP에서 5회 이상 실패 시 1분 대기 (Supabase RLS 또는 미들웨어)
- SQL Injection 방지: Supabase SDK의 파라미터 바인딩 사용

---

## 4. API / Server Actions 설계

Next.js 16 App Router의 Server Actions를 기본으로 사용. 별도 API Route는 최소화.

### Server Actions

| Action | 파일 | 설명 |
|--------|------|------|
| `searchRecipes` | `lib/recipes/search.ts` | 재료 기반 레시피 검색 (정적 + Supabase) |
| `createRecipe` | `app/recipe/new/actions.ts` | 사용자 레시피 등록 |
| `verifyAndUpdate` | `app/recipe/[id]/edit/actions.ts` | 비밀번호 확인 후 수정 |
| `verifyAndDelete` | `app/recipe/[id]/actions.ts` | 비밀번호 확인 후 삭제 |

### 검색 로직 (클라이언트 + 서버 하이브리드)

정적 JSON 필터링과 Supabase 조회의 실행 위치가 다르다.

```
사용자 입력 (재료[])
       |
       v
[클라이언트 검색 로직]
       |
       +---> [정적 레시피 JSON 필터링]          ← 클라이언트 사이드 (빌드 번들 포함, 네트워크 비용 없음)
       |     (빌드 타임 번들 포함, 60~80개)
       |
       +---> [Server Action: searchUserRecipes]  ← 서버 사이드 (Supabase API 호출)
             (런타임 API 호출)
       |
       v
[결과 합산 + 누락 재료 점수 계산 + 정렬]        ← 클라이언트 사이드 병합
```

```typescript
// lib/recipes/search.ts
// 주의: 이 파일은 Server Action이지만, 정적 JSON 필터링은 서버에서 실행 후 결과를 반환
// 클라이언트에서 직접 import해서 쓰는 경우, filterStaticRecipes는 클라이언트에서 실행 가능
"use server"

async function searchRecipes(ingredients: string[], cuisines: CuisineType[]) {
  // 1. 정적 데이터에서 필터링 (import JSON — 빌드 번들 포함, 네트워크 비용 없음)
  const staticResults = filterStaticRecipes(ingredients, cuisines);

  // 2. Supabase에서 사용자 레시피 검색 (서버 사이드 실행 — Server Action 필수)
  const userResults = await searchUserRecipes(ingredients, cuisines);

  // 3. 합산 + 누락 재료 점수 계산 + 정렬 (클라이언트로 직렬화 후 병합)
  const all = [...staticResults, ...userResults];
  return all
    .map(recipe => scoreRecipe(recipe, ingredients))
    .filter(r => r.missingCount <= 3)
    .sort((a, b) => a.missingCount - b.missingCount);
}
```

> **Supabase 장애 시 폴백**: Supabase 연결 실패 시 `userResults`를 빈 배열로 처리하고 큐레이션 레시피만 반환한다. 사용자 레시피 영역에는 "잠시 서비스가 원활하지 않습니다" 안내를 표시한다.

---

## 5. 폴더 구조 (최종)

```
simple-receipe/
├── app/
│   ├── layout.tsx                      # 루트 레이아웃 (폰트, 테마)
│   ├── globals.css                     # Tailwind v4 @theme + 커스텀 토큰
│   ├── page.tsx                        # 랜딩 (프로토타입 선택)
│   │
│   ├── (prototype-a)/                  # Route Group A: 냉장고 탐색
│   │   └── a/
│   │       └── page.tsx                # URL: /a
│   ├── (prototype-b)/                  # Route Group B: 레시피 보드
│   │   └── b/
│   │       └── page.tsx                # URL: /b
│   ├── (prototype-c)/                  # Route Group C: 퀵 쿡
│   │   └── c/
│   │       └── page.tsx                # URL: /c
│   │
│   ├── recipe/
│   │   ├── [id]/
│   │   │   ├── page.tsx                # 레시피 상세
│   │   │   ├── edit/
│   │   │   │   ├── page.tsx            # 레시피 수정 폼
│   │   │   │   └── actions.ts          # 수정 Server Action
│   │   │   └── actions.ts              # 삭제 Server Action
│   │   └── new/
│   │       ├── page.tsx                # 레시피 등록 폼
│   │       └── actions.ts              # 등록 Server Action
│   │
│   └── _components/
│       ├── ui/                         # 공통 UI (Button, Input, Tag, Card, Badge, Skeleton, Tabs)
│       ├── IngredientInput.tsx         # 태그 기반 재료 입력 + 자동완성
│       ├── RecipeCard.tsx              # 레시피 카드
│       ├── RecipeGrid.tsx              # 필터/정렬 그리드
│       ├── CuisineFilter.tsx           # 한식/중식/일식/양식 탭
│       ├── MissingBadge.tsx            # 누락 재료 뱃지
│       ├── YouTubeEmbed.tsx            # 반응형 YouTube 임베드
│       ├── RecipeSummary.tsx           # 접기/펼치기 레시피 요약
│       ├── RecipeForm.tsx              # 레시피 등록/수정 공통 폼
│       ├── PasswordModal.tsx           # 수정/삭제 시 비밀번호 입력 모달
│       └── ThemeToggle.tsx             # 다크/라이트 토글
│
├── data/
│   ├── recipes.json                    # 큐레이션 레시피 60~80개
│   └── ingredients.json                # 재료 사전 200+
│
├── lib/
│   ├── supabase.ts                     # Supabase 클라이언트 초기화
│   ├── ingredients/
│   │   ├── synonyms.ts                 # 동의어 매핑
│   │   ├── normalize.ts                # 재료명 정규화
│   │   └── pantry.ts                   # 기본 양념 목록
│   └── recipes/
│       ├── types.ts                    # 공통 TypeScript 인터페이스
│       ├── scorer.ts                   # 누락 재료 점수 알고리즘
│       └── search.ts                   # 검색 + 필터 로직
│
├── docs/
│   ├── prd.md                          # 프로젝트 설계안
│   └── specification.md                # 기술 명세서 (이 문서)
│
├── public/
│   └── icons/                          # 요리 카테고리 아이콘
│
├── .env.local                          # 환경변수 (Supabase 키)
├── next.config.ts
├── tailwind.config.ts (불필요)          # Tailwind v4는 CSS 기반 설정
├── tsconfig.json
└── package.json
```

---

## 6. 배포

### 배포 플랫폼: Vercel (Hobby Plan, 무료)

| 항목 | 무료 한도 |
|------|----------|
| 대역폭 | 100GB / 월 |
| Serverless Function 호출 | 100만 / 월 |
| 빌드 시간 | 6,000분 / 월 |
| 비용 | **$0** |

### 데이터베이스: Supabase (Free Plan, 무료)

| 항목 | 무료 한도 |
|------|----------|
| DB 저장소 | 500MB |
| MAU | 50,000 |
| API 요청 | 무제한 |
| 프로젝트 수 | 2개 |
| 비용 | **$0** |

### 총 운영 비용: **$0 / 월**

### 환경변수 (.env.local)
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

### 배포 프로세스
```bash
# 1. GitHub 저장소 연결 후 Vercel에서 자동 배포
#    - main 브랜치 push → 자동 프로덕션 배포
#    - PR 생성 → 프리뷰 배포

# 2. 수동 배포 시
npx vercel --prod
```

### next.config.ts 설정
```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "img.youtube.com",  // YouTube 썸네일
      },
      {
        protocol: "https",
        hostname: "i.ytimg.com",      // YouTube 썸네일 대체
      },
    ],
  },
};

export default nextConfig;
```

### 성능 목표 (Lighthouse 기준)

| 지표 | 목표 |
|------|------|
| 모바일 성능 점수 | > 90 |
| 데스크톱 성능 점수 | > 90 |
| LCP (Largest Contentful Paint) | < 2.5초 |
| 모바일 4G 네트워크 로딩 | < 2초 |
| 재료 입력 → 검색 결과 표시 (정적 JSON) | 체감 1초 이내 |

---

## 7. 누락 재료 점수 알고리즘 상세

```typescript
// lib/recipes/scorer.ts

import { normalizeIngredient } from "@/lib/ingredients/normalize";
import { PANTRY_STAPLES } from "@/lib/ingredients/pantry";

interface ScoredRecipe {
  recipe: Recipe;
  matchedIngredients: string[];   // 사용자가 가진 재료
  missingIngredients: string[];   // 추가 구매 필요
  missingCount: number;           // 누락 수 (정렬 기준)
  matchRatio: number;             // 매칭 비율 0~1
}

function scoreRecipe(recipe: Recipe, userIngredients: string[]): ScoredRecipe {
  const normalizedUser = userIngredients.map(normalizeIngredient);

  // seasonings(기본양념)은 점수 계산에서 제외
  const required = recipe.ingredients; // 필수 재료만 대상

  const matched = required.filter(ing =>
    normalizedUser.some(u => ingredientMatches(u, normalizeIngredient(ing)))
  );
  const missing = required.filter(ing =>
    !normalizedUser.some(u => ingredientMatches(u, normalizeIngredient(ing)))
  );

  return {
    recipe,
    matchedIngredients: matched,
    missingIngredients: missing,
    missingCount: missing.length,
    matchRatio: required.length > 0 ? matched.length / required.length : 1,
  };
}

// 동의어 사전 기반 매칭
function ingredientMatches(a: string, b: string): boolean {
  if (a === b) return true;
  // 동의어 사전에서 같은 그룹인지 확인
  return getSynonymGroup(a) === getSynonymGroup(b);
}
```

**정렬 규칙**:
1. `missingCount` 오름차순 (0 → 1 → 2 → 3)
2. 동점 시 `matchRatio` 내림차순 (매칭 비율 높은 것 우선)
3. `missingCount > 3`인 레시피는 결과에서 제외

---

## 8. YouTube 임베드 규격

YouTube 영상은 API 키 없이 iframe 임베드로 표시.

```typescript
// app/_components/YouTubeEmbed.tsx
// YouTube URL에서 videoId 추출 후 임베드

// 지원 URL 형식:
// - https://www.youtube.com/watch?v=VIDEO_ID
// - https://youtu.be/VIDEO_ID
// - https://www.youtube.com/embed/VIDEO_ID

// 임베드 URL: https://www.youtube.com/embed/{videoId}
// 반응형: aspect-ratio: 16/9, width: 100%
```

**썸네일 URL 규칙**:
```
고화질: https://img.youtube.com/vi/{videoId}/maxresdefault.jpg
중화질: https://img.youtube.com/vi/{videoId}/hqdefault.jpg
저화질: https://img.youtube.com/vi/{videoId}/mqdefault.jpg
```

---

## 9. 반응형 브레이크포인트

Tailwind CSS v4 기본 브레이크포인트 사용:

| 이름 | 너비 | 대상 |
|------|------|------|
| (기본) | < 640px | 모바일 |
| `sm` | >= 640px | 큰 모바일 / 소형 태블릿 |
| `md` | >= 768px | 태블릿 |
| `lg` | >= 1024px | 데스크톱 |
| `xl` | >= 1280px | 큰 데스크톱 |

**디자인 원칙**: 모바일 퍼스트. 기본 스타일이 모바일, `sm:`/`md:`/`lg:`로 확장.

---

## 10. 구현 순서 (Phase별)

### Phase 1: 데이터 + 기반 로직
- [ ] TypeScript 인터페이스 정의 (`lib/recipes/types.ts`)
- [ ] 레시피 JSON 데이터셋 구축 (`data/recipes.json`, 60~80개)
- [ ] 재료 사전 JSON 구축 (`data/ingredients.json`, 200+ 재료)
- [ ] 재료 정규화 + 동의어 매핑 (`lib/ingredients/`)
- [ ] 누락 재료 점수 알고리즘 (`lib/recipes/scorer.ts`)
- [ ] 검색 로직 (`lib/recipes/search.ts`)
- [ ] Supabase 초기화 + 테이블 생성 (`lib/supabase.ts`)
- [ ] next.config.ts 설정
- [ ] globals.css 디자인 토큰 확장

### Phase 2: 공통 컴포넌트
- [ ] 공통 UI 컴포넌트 (`app/_components/ui/`)
- [ ] IngredientInput (태그 입력 + 자동완성)
- [ ] RecipeCard, RecipeGrid, CuisineFilter
- [ ] YouTubeEmbed, RecipeSummary, MissingBadge
- [ ] RecipeForm, PasswordModal

### Phase 3: 3개 UI 프로토타입
- [ ] 프로토타입 A: 냉장고 탐색 `/a` — 미니멀, 검색 중심, 오렌지 액센트 (#F97316)
- [ ] 프로토타입 B: 레시피 보드 `/b` — Pinterest Masonry 스타일, 틸 액센트 (#0D9488)
- [ ] 프로토타입 C: 퀵 쿡 `/c` — 3단계 위자드, 블루 액센트 (#3B82F6)
- [ ] **사용자 피드백 후 최종 디자인 확정**

### Phase 4: 사용자 레시피 등록
- [ ] 레시피 등록 폼 + Server Action
- [ ] 레시피 수정/삭제 + 비밀번호 검증
- [ ] 사용자 레시피를 검색 결과에 통합

### Phase 5: 폴리싱
- [ ] 반응형 테스트 (모바일 375px ~ 데스크톱 1280px)
- [ ] 뒤로가기 시 재료 태그 및 필터 상태 복원 (클라이언트 상태 유지)
- [ ] OG 메타태그 추가 (레시피 상세 페이지: 요리명, 썸네일, 요약)
- [ ] 다크모드
- [ ] 에러 처리 + 빈 상태 UI
- [ ] Lighthouse 성능 측정 + 개선 (목표: 모바일 > 90, 데스크톱 > 90)
- [ ] 배포 (Vercel)

### Phase 6 (향후): API 확장
- [ ] YouTube Data API v3 연동
- [ ] LLM API 연동 (동적 레시피 추천)
