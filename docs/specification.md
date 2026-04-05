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

---

## v1.1 기술 변경사항 (사용자 피드백 반영)

> 기준일: 2026-04-05
> 관련 PRD 섹션: [docs/prd.md — v1.1 사용자 피드백 반영](./prd.md)
> 관련 분석 문서: [docs/feedback-action-plan.md](./feedback-action-plan.md)

아래 변경사항은 MoSCoW 우선순위 순서로 기술한다. 각 항목은 독립적으로 작업 가능하며, 변경 대상 파일이 명시되어 있다.

---

### [M-01] 검색 필터 강화 — matchRatio > 0 조건 추가

**변경 대상 파일**: `lib/recipes/search.ts`

**변경 내용**:

`filterStaticRecipes` 함수 내 필터링 조건에 `matchRatio > 0` 조건을 AND로 추가한다.

```typescript
// 변경 전
const withinThreshold = scoredRecipes.filter(
  (scored) => scored.missingCount <= MAX_MISSING_COUNT,
);

// 변경 후
const withinThreshold = scoredRecipes.filter(
  (scored) =>
    scored.missingCount <= MAX_MISSING_COUNT &&
    scored.matchRatio > 0,  // 선택 재료를 하나도 사용하지 않는 레시피 제외
);
```

**추가 변경 범위**: `getCuisineCounts()` 함수에도 동일한 `matchRatio > 0` 필터를 적용한다. Step 2에서 표시되는 카테고리별 레시피 수가 Step 3 실제 결과 수와 일치해야 한다.

**영향 범위**: `searchAllRecipes()` → `filterStaticRecipes()` → `getCuisineCounts()` 호출 체인 전체.

**검증 명령**: 없음 (정적 JSON 기반 클라이언트 로직). 브라우저에서 "삼겹살" 1개 선택 후 군만두/다마고야끼 미노출 확인.

---

### [M-02] YouTube 임베드 수정 — referrerpolicy 추가 + 썸네일 fallback

**변경 대상 파일**: `app/_components/YouTubeEmbed.tsx`

**변경 내용 1 — iframe에 referrerpolicy 추가**:

```typescript
// 변경 전
<iframe
  src={embedUrl}
  title={title ?? "YouTube 동영상"}
  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
  allowFullScreen
  loading="lazy"
  className="absolute inset-0 h-full w-full"
/>

// 변경 후
<iframe
  src={embedUrl}
  title={title ?? "YouTube 동영상"}
  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
  allowFullScreen
  loading="lazy"
  referrerPolicy="strict-origin-when-cross-origin"
  className="absolute inset-0 h-full w-full"
/>
```

**변경 내용 2 — 썸네일 클릭 후 iframe 교체 패턴 적용**:

컴포넌트에 `activated` 상태를 추가한다. 초기 렌더 시 썸네일 이미지와 재생 버튼을 표시하고, 클릭 시 `autoplay=1` 파라미터가 포함된 iframe으로 교체한다.

```typescript
// YouTubeEmbed.tsx 인터페이스 변경
interface YouTubeEmbedProps {
  url: string;
  title?: string;
  // thumbnailUrl은 없을 경우 https://img.youtube.com/vi/{videoId}/hqdefault.jpg 자동 사용
}

// 상태 추가
const [activated, setActivated] = useState(false);

// 렌더 분기
if (!activated) {
  // 썸네일 + 재생 버튼 오버레이
  // 클릭 시 setActivated(true)
} else {
  // iframe src에 ?autoplay=1 포함
}
```

**변경 내용 3 — videoId 추출 실패 시 에러 UI**:

`extractVideoId(url)`가 null을 반환할 경우 "영상을 불러올 수 없습니다" 안내 텍스트를 렌더한다. 기존에 null 체크 없이 iframe을 렌더하는 경우 이를 수정한다.

**새로 추가되는 타입/인터페이스**: 없음 (기존 인터페이스 확장).

---

### [M-03] 동의어 매핑 수정 — 달걀/계란 통합

**변경 대상 파일**: `data/ingredients.json`

**변경 내용**:

`ingredients.json`에서 달걀과 계란이 별도 항목으로 등록된 경우 아래와 같이 하나로 통합한다.

```json
// 변경 후 (올바른 구조)
{
  "name": "달걀",
  "aliases": ["계란", "에그", "달걀(계란)"],
  "category": "pantry"
}
```

`계란` 독립 항목이 존재한다면 제거한다. `buildSynonymMap()`이 이 항목을 순회할 때 "계란" → "달걀"과 "달걀" → "달걀" 양방향 매핑이 모두 생성된다.

**검증**: `lib/ingredients/synonyms.ts`의 `ingredientMatches("계란", "달걀")` 반환값이 `true`여야 한다.

**주의**: `app/page.tsx`의 `INGREDIENT_CATEGORIES`에 하드코딩된 `"계란"` 문자열은 변경하지 않는다. 동의어 맵에서 "계란" → "달걀"로 정규화되므로 버튼 텍스트를 바꿀 필요가 없다.

---

### [S-01] FOUC 제거 — 테마 초기화 인라인 스크립트

**변경 대상 파일**: `app/layout.tsx`

**변경 내용**:

`<html>` 요소에 `suppressHydrationWarning`을 추가하고, `<head>` 내에 Next.js `<Script strategy="beforeInteractive">`로 테마 초기화 스크립트를 삽입한다.

```typescript
// app/layout.tsx 변경 후 핵심 구조
import Script from "next/script";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" suppressHydrationWarning className={`...기존 클래스...`}>
      <head>
        <Script id="theme-init" strategy="beforeInteractive">{`
          (function() {
            try {
              var stored = localStorage.getItem('theme');
              var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
              if (stored === 'dark' || (!stored && prefersDark)) {
                document.documentElement.classList.add('dark');
              }
            } catch(e) {}
          })();
        `}</Script>
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
```

**주의사항**:
- `suppressHydrationWarning`은 `<html>` 요소에만 추가한다. 서버/클라이언트 간 `class` 속성값이 다를 수 있으므로 React hydration 경고를 억제하기 위함이다.
- 기존 `ThemeToggle.tsx`의 `applyTheme()` 로직과 localStorage 키명("theme")은 변경하지 않는다.
- `Geist` 폰트 변수 등 기존 className은 유지한다.

**새로 추가되는 import**: `import Script from "next/script"` — Next.js 내장 패키지이므로 별도 설치 불필요.

---

### [S-02] PC 2패널 레이아웃 — 데스크톱 아코디언 2컬럼 구조

**변경 대상 파일**: `app/page.tsx`

**변경 내용 1 — `<main>` 컨테이너 너비 확장**:

Step 3(결과 화면) 렌더 시 `<main>` 요소의 최대 너비를 데스크톱에서 확장한다.

```typescript
// 변경 전
<main className="mx-auto w-full max-w-lg flex-1 px-4 pb-28 pt-6">

// 변경 후
<main className="mx-auto w-full max-w-lg lg:max-w-5xl flex-1 px-4 pb-28 pt-6">
```

단, `max-w-lg`는 Step 1~2(재료 선택, 카테고리 선택)에서는 유지하고, Step 3(결과 목록)에서만 `lg:max-w-5xl`로 확장하는 것을 권장한다. step 상태에 따라 className을 조건부 적용한다.

**변경 내용 2 — 아코디언 펼침 영역 2컬럼 그리드**:

`RecipeAccordionItem`의 펼쳐진 컨텐츠 div에 `lg:grid lg:grid-cols-2` 레이아웃을 적용한다.

```typescript
// 변경 전
<div className="space-y-4">
  <YouTubeEmbed url={recipe.youtubeUrl} title={recipe.youtubeTitle} />
  <RecipeSummary steps={recipe.steps} summary={recipe.summary} />
</div>

// 변경 후
<div className="space-y-4 lg:grid lg:grid-cols-2 lg:gap-6 lg:space-y-0">
  {/* 데스크톱: 우측, 모바일: 위 */}
  <div className="lg:order-2">
    <YouTubeEmbed url={recipe.youtubeUrl} title={recipe.youtubeTitle} />
  </div>
  {/* 데스크톱: 좌측, 모바일: 아래 */}
  <div className="lg:order-1">
    <RecipeSummary steps={recipe.steps} summary={recipe.summary} />
  </div>
</div>
```

**브레이크포인트 기준**:

| 구간 | 너비 | 레이아웃 |
|------|------|----------|
| 모바일 | < 1024px | 세로 스택 (YouTube 위, 조리 요약 아래) |
| 데스크톱 | >= 1024px | 2컬럼 그리드 (좌: 조리 요약, 우: YouTube) |

**새로 추가되는 타입/인터페이스**: 없음.

---

### [S-03] 재료 선택 화면 안내 문구 추가

**변경 대상 파일**: `app/page.tsx`

**변경 내용**:

Step 1(재료 선택) 화면에 INGREDIENT_CATEGORIES 버튼 그룹 렌더 직전에 안내 문구 div를 추가한다.

```typescript
// 추가할 JSX (카테고리 버튼 그룹 바로 위에 삽입)
<div className="mb-3 rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-700 dark:bg-blue-900/20 dark:text-blue-300">
  아래 버튼은 레시피에 자주 쓰이는 재료예요. 목록에 없는 재료는 아래에서 직접 입력할 수 있어요.
</div>
```

**카테고리 헤더 스타일 개선**:

```typescript
// 변경 전 (추정)
<h2 className="... uppercase tracking-widest text-xs ...">육류</h2>

// 변경 후
<h2 className="mb-2.5 text-sm font-bold text-gray-600 dark:text-gray-400">
  육류
</h2>
```

**새로 추가되는 타입/인터페이스**: 없음.

---

### [C-01] 조리 단계 시간 정보 추가 (데이터 작업)

**변경 대상 파일**: `data/recipes.json`

**변경 방식**: 방법 A (스키마 변경 없음) — 기존 `steps: string[]` 구조를 유지하고 텍스트 내에 시간 표현을 추가한다.

**수정 기준**: 아래 동사가 포함된 단계에만 시간 표현을 추가한다.

| 동사 | 시간 표현 예시 |
|------|---------------|
| 볶는다 | "중불에서 5~7분 볶는다" |
| 끓인다 | "10분간 끓인다" |
| 굽는다 | "앞뒤로 각 3~4분 굽는다" |
| 재운다 | "20~30분 재운다" |
| 삶는다 | "8~10분 삶는다" |

**타입 변경**: 없음. 기존 `steps: string[]` 유지.

**컴포넌트 변경**: 없음. `RecipeSummary.tsx`는 string 배열을 그대로 렌더하므로 자동 반영된다.

**작업 범위**: `data/recipes.json` 내 65개 레시피의 가열/처리 단계. 전체 steps를 수정하는 것이 아니라 시간 판단이 필요한 단계만 대상으로 한다.

---

### 신규 추가되는 타입/인터페이스 요약

v1.1 변경사항에서 새로 추가되는 TypeScript 타입/인터페이스는 없다. 기존 타입을 그대로 사용하며 데이터와 로직 레이어만 수정한다.

| 항목 | 기존 타입 | v1.1 변경 |
|------|-----------|-----------|
| `Recipe.steps` | `string[]` | 변경 없음 (방법 A 적용) |
| `YouTubeEmbedProps` | `{ url: string; title?: string }` | 변경 없음 |
| `ScoredRecipe.matchRatio` | `number` | 변경 없음 (필터 조건에만 활용) |

---

### 데이터 스키마 변경 요약

| 파일 | 변경 내용 | 영향 범위 |
|------|-----------|-----------|
| `data/ingredients.json` | 달걀/계란 항목 통합 (계란 alias 추가, 중복 항목 제거) | `lib/ingredients/synonyms.ts`의 `buildSynonymMap()` 자동 반영 |
| `data/recipes.json` | steps 배열 내 가열 단계 문자열에 시간 표현 추가 | `RecipeSummary.tsx` 렌더 자동 반영 (타입 변경 없음) |

Supabase `user_recipes` 테이블 스키마 변경: 없음.

---

### v1.1 구현 순서 (권장)

아래 순서는 의존성과 공수를 고려한 권장 작업 순서다.

**1차 스프린트 (총 약 5시간)**:

1. `[M-01]` `lib/recipes/search.ts` — matchRatio 필터 추가 (30분)
2. `[M-03]` `data/ingredients.json` — 달걀/계란 동의어 통합 (1시간)
3. `[M-02]` `app/_components/YouTubeEmbed.tsx` — referrerpolicy + 썸네일 fallback (2시간)
4. `[S-03]` `app/page.tsx` — 재료 선택 안내 문구 추가 (30분)
5. `[S-01]` `app/layout.tsx` — FOUC 해결 스크립트 삽입 (1시간)

**2차 스프린트 (총 약 9시간)**:

6. `[S-02]` `app/page.tsx` — PC 2패널 레이아웃 (3시간)
7. `[C-01]` `data/recipes.json` — 조리 단계 시간 정보 추가 (4시간, 데이터 작업)
8. `[C-02]` `lib/ingredients/popularity.ts` (신규) + `app/page.tsx` — 재료 인기순 정렬 (2시간)

---

## v1.2 데이터베이스 아키텍처 변경 (PostgreSQL Docker)

> 기준일: 2026-04-05
> 변경 배경: 기존 정적 JSON + Supabase 이중 구조를 로컬 PostgreSQL Docker 컨테이너 단일 구조로 통합. Supabase는 코드만 준비된 상태로 실제 연결 이력 없음. JSON 파일의 클라이언트 번들 포함 방식은 레시피 데이터가 60~80개 수준을 넘어설 경우 번들 사이즈 비효율을 초래.

---

### 1. 변경 결정 근거

| 구분 | 기존 구조 | 변경 후 구조 |
|------|-----------|-------------|
| 큐레이션 레시피 | `data/recipes.json` (클라이언트 번들) | PostgreSQL `recipes` 테이블 (서버 쿼리) |
| 재료 사전 | `data/ingredients.json` (클라이언트 번들) | PostgreSQL `ingredients` 테이블 (서버 쿼리) |
| 사용자 레시피 | Supabase PostgreSQL | PostgreSQL `user_recipes` 테이블 (동일 DB) |
| 접속 방법 | Supabase SDK + JSON import | pg 또는 Prisma/Drizzle ORM |
| 환경변수 | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `DATABASE_URL` (단일) |

---

### 2. docker-compose.yml 구성

```yaml
# docker-compose.yml (프로젝트 루트)
version: "3.9"

services:
  db:
    image: postgres:15-alpine
    container_name: simple_recipe_db
    restart: unless-stopped
    environment:
      POSTGRES_DB: simple_recipe
      POSTGRES_USER: recipe_user
      POSTGRES_PASSWORD: recipe_pass   # 로컬 개발 전용, 프로덕션은 환경변수로 교체
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data   # 데이터 영속성 보장
      - ./supabase/schema.sql:/docker-entrypoint-initdb.d/01_schema.sql  # 초기 스키마 자동 실행
      - ./scripts/seed.sql:/docker-entrypoint-initdb.d/02_seed.sql       # 초기 시드 데이터 자동 실행

volumes:
  postgres_data:
```

**컨테이너 시작/종료**:
```bash
# 시작 (백그라운드)
docker compose up -d

# 종료 (데이터 보존)
docker compose stop

# 완전 초기화 (데이터 삭제)
docker compose down -v
```

---

### 3. 데이터베이스 스키마

**파일**: `supabase/schema.sql` (기존 파일 확장)

#### 3-1. recipes 테이블 (큐레이션 레시피)

```sql
CREATE TABLE recipes (
  id            VARCHAR(50)  PRIMARY KEY,                        -- "korean-001" 형태 유지
  name          VARCHAR(100) NOT NULL,
  cuisine       VARCHAR(20)  NOT NULL CHECK (cuisine IN ('korean','chinese','japanese','western')),
  difficulty    VARCHAR(10)  NOT NULL CHECK (difficulty IN ('easy','medium','hard')),
  cook_time     VARCHAR(20),
  servings      INTEGER      DEFAULT 2,
  ingredients   TEXT[]       NOT NULL,                           -- 필수 재료 배열
  seasonings    TEXT[]       DEFAULT '{}',                       -- 기본 양념 배열
  steps         TEXT[]       NOT NULL,                           -- 조리 순서 배열
  youtube_url   VARCHAR(500),
  youtube_title VARCHAR(200),
  channel_name  VARCHAR(200),
  thumbnail_url VARCHAR(500),
  summary       TEXT,
  source        VARCHAR(10)  NOT NULL DEFAULT 'curated'
                CHECK (source = 'curated'),
  created_at    TIMESTAMPTZ  DEFAULT NOW()
);

-- 카테고리 필터링 인덱스
CREATE INDEX idx_recipes_cuisine     ON recipes(cuisine);
-- 재료 배열 전문 검색 GIN 인덱스
CREATE INDEX idx_recipes_ingredients ON recipes USING GIN(ingredients);
```

#### 3-2. ingredients 테이블 (재료 사전)

```sql
CREATE TABLE ingredients (
  id       SERIAL       PRIMARY KEY,
  name     VARCHAR(100) NOT NULL UNIQUE,                         -- 정규화된 대표 이름 (예: "달걀")
  aliases  TEXT[]       DEFAULT '{}',                            -- 동의어 배열 (예: ["계란", "에그"])
  category VARCHAR(20)  NOT NULL
           CHECK (category IN ('meat','seafood','vegetable','dairy','grain','seasoning','pantry'))
);

-- 동의어 포함 전문 검색을 위한 GIN 인덱스
CREATE INDEX idx_ingredients_aliases ON ingredients USING GIN(aliases);
```

#### 3-3. user_recipes 테이블 (사용자 등록 레시피)

기존 Supabase 스키마 (`supabase/schema.sql`) 그대로 유지. 변경 없음.

```sql
-- 기존 스키마 참조 (supabase/schema.sql)
-- updated_at 자동 갱신 트리거 포함
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

-- updated_at 자동 갱신 트리거 (기존 유지)
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
```

---

### 4. seed 스크립트 구조 (JSON → DB)

JSON 데이터를 PostgreSQL로 마이그레이션하는 스크립트를 두 가지 방식으로 제공한다.

#### 방법 A — SQL seed 파일 (docker-compose 자동 실행)

`scripts/seed.sql`: `data/recipes.json`과 `data/ingredients.json`의 내용을 SQL `INSERT` 문으로 변환하여 작성. docker-compose 초기화 시 `02_seed.sql`로 자동 실행.

```sql
-- scripts/seed.sql (발췌 예시)
INSERT INTO recipes (id, name, cuisine, difficulty, cook_time, servings, ingredients, seasonings, steps, youtube_url, youtube_title, channel_name, thumbnail_url, summary, source)
VALUES
  ('korean-001', '제육볶음', 'korean', 'easy', '20분', 2,
   ARRAY['돼지고기 앞다리살', '양파', '대파', '청양고추'],
   ARRAY['간장', '고추장', '참기름', '다진마늘', '설탕'],
   ARRAY['돼지고기를 먹기 좋은 크기로 썬다', '양념 재료를 모두 섞는다', '고기에 양념을 넣고 20분 재운다', '팬에 기름을 두르고 중불에서 7~8분 볶는다'],
   'https://youtu.be/xxxxx', '제육볶음 황금레시피', '백종원의 요리비책',
   'https://img.youtube.com/vi/xxxxx/hqdefault.jpg',
   '간단하고 맛있는 제육볶음 레시피입니다.', 'curated'),
  -- ... 나머지 레시피
;

INSERT INTO ingredients (name, aliases, category)
VALUES
  ('달걀', ARRAY['계란', '에그', '달걀(계란)'], 'pantry'),
  ('돼지고기', ARRAY['돼지', '삼겹살', '목살', '앞다리살'], 'meat'),
  -- ... 나머지 재료
;
```

#### 방법 B — TypeScript seed 스크립트 (수동 실행)

```typescript
// scripts/seed.ts
import { readFileSync } from "fs";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function seed() {
  const recipes = JSON.parse(readFileSync("data/recipes.json", "utf-8"));
  const { ingredients } = JSON.parse(readFileSync("data/ingredients.json", "utf-8"));

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    for (const recipe of recipes) {
      await client.query(
        `INSERT INTO recipes
           (id, name, cuisine, difficulty, cook_time, servings,
            ingredients, seasonings, steps,
            youtube_url, youtube_title, channel_name, thumbnail_url, summary, source)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
         ON CONFLICT (id) DO NOTHING`,
        [
          recipe.id, recipe.name, recipe.cuisine, recipe.difficulty,
          recipe.cookTime, recipe.servings,
          recipe.ingredients, recipe.seasonings, recipe.steps,
          recipe.youtubeUrl, recipe.youtubeTitle, recipe.channelName,
          recipe.thumbnailUrl, recipe.summary, "curated",
        ]
      );
    }

    for (const ing of ingredients) {
      await client.query(
        `INSERT INTO ingredients (name, aliases, category)
         VALUES ($1, $2, $3)
         ON CONFLICT (name) DO NOTHING`,
        [ing.name, ing.aliases, ing.category]
      );
    }

    await client.query("COMMIT");
    console.log("Seed complete.");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
```

**실행 방법**:
```bash
# package.json scripts에 추가
"db:seed": "npx tsx scripts/seed.ts"

# 실행
npm run db:seed
```

---

### 5. 환경변수 변경

#### 변경 전 (`.env.local`)
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

#### 변경 후 (`.env.local`)
```
# 로컬 개발 (Docker)
DATABASE_URL=postgresql://recipe_user:recipe_pass@localhost:5432/simple_recipe

# 프로덕션 (Railway / Neon 등 — 섹션 7 참조)
# DATABASE_URL=postgresql://user:pass@host:5432/dbname?sslmode=require
```

**주의**: `DATABASE_URL`은 서버 사이드 전용이므로 `NEXT_PUBLIC_` 접두사를 붙이지 않는다. 클라이언트 번들에 DB 접속 정보가 노출되면 보안 취약점이 발생한다.

---

### 6. 제거 대상 파일 및 패키지

#### 제거 파일
| 파일/폴더 | 제거 이유 |
|-----------|-----------|
| `lib/supabase.ts` | Supabase 클라이언트 초기화 — 더 이상 불필요 |
| `data/recipes.json` | DB seed 완료 후 참조 제거 (seed 소스로만 일시 보관 가능) |
| `data/ingredients.json` | DB seed 완료 후 참조 제거 (동일) |

> `data/*.json` 파일은 seed 작업 완료 확인 후 제거한다. seed 스크립트의 소스 파일로 일시 보관해도 무방하나, 클라이언트 코드에서 `import`하는 구문은 즉시 제거해야 한다.

#### 제거 패키지
```bash
npm uninstall @supabase/supabase-js
```

---

### 7. 검색 로직 변경

#### ORM 선택 — Prisma vs Drizzle

| 기준 | Prisma | Drizzle |
|------|--------|---------|
| 타입 안전성 | 자동 생성 타입 (스키마 기반) | SQL과 1:1 대응, 완전한 타입 추론 |
| 학습 곡선 | 중간 (Prisma 고유 문법) | 낮음 (SQL을 알면 바로 사용 가능) |
| 번들 사이즈 | 큼 (Prisma Client 엔진) | 작음 (경량 라이브러리) |
| 서버리스 호환 | Prisma Accelerate 별도 필요 | 네이티브 지원 (`pg` 드라이버 직접 사용) |
| Edge Runtime 지원 | 제한적 | 완전 지원 |

> **권장안**: Drizzle ORM + `pg` 드라이버. 서버리스/엣지 환경 호환성이 높고, 기존 SQL 스키마를 그대로 타입으로 변환할 수 있어 이 프로젝트의 스키마 복잡도에 적합.

#### 변경 전 (JSON import 방식)
```typescript
// lib/recipes/search.ts
import recipesData from "@/data/recipes.json";   // 번들 포함

function filterStaticRecipes(ingredients: string[], cuisines: CuisineType[]) {
  return recipesData.filter(recipe => /* ... */);
}
```

#### 변경 후 (DB 쿼리 방식 — pg 직접 사용 예시)
```typescript
// lib/recipes/search.ts
"use server";

import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function searchCuratedRecipes(
  ingredients: string[],
  cuisines: CuisineType[]
): Promise<Recipe[]> {
  const cuisineFilter = cuisines.length > 0
    ? `AND cuisine = ANY($2::text[])`
    : "";

  const { rows } = await pool.query(
    `SELECT id, name, cuisine, difficulty, cook_time, servings,
            ingredients, seasonings, steps,
            youtube_url, youtube_title, channel_name, thumbnail_url, summary,
            'curated' AS source
     FROM recipes
     WHERE ingredients && $1::text[]  -- 입력 재료와 교집합이 있는 레시피만
     ${cuisineFilter}`,
    cuisines.length > 0 ? [ingredients, cuisines] : [ingredients]
  );

  return rows.map(toCamelCase);  // snake_case → camelCase 변환 헬퍼 필요
}
```

**`toCamelCase` 헬퍼 위치**: `lib/db/transform.ts` (신규 파일)

```typescript
// lib/db/transform.ts
export function toCamelCase(row: Record<string, unknown>): Recipe {
  return {
    id:           row.id as string,
    name:         row.name as string,
    cuisine:      row.cuisine as CuisineType,
    difficulty:   row.difficulty as DifficultyType,
    cookTime:     row.cook_time as string,
    servings:     row.servings as number,
    ingredients:  row.ingredients as string[],
    seasonings:   row.seasonings as string[],
    steps:        row.steps as string[],
    youtubeUrl:   row.youtube_url as string,
    youtubeTitle: row.youtube_title as string,
    channelName:  row.channel_name as string,
    thumbnailUrl: row.thumbnail_url as string,
    summary:      row.summary as string,
    source:       row.source as "curated" | "user",
  };
}
```

#### 재료 사전 조회

```typescript
// lib/ingredients/dictionary.ts
"use server";

import { Pool } from "pg";
import type { Ingredient } from "@/lib/recipes/types";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function getAllIngredients(): Promise<Ingredient[]> {
  const { rows } = await pool.query(
    `SELECT name, aliases, category FROM ingredients ORDER BY name`
  );
  return rows as Ingredient[];
}
```

**자동완성 연동**: `IngredientInput.tsx` 마운트 시 `getAllIngredients()`를 호출하여 자동완성 후보 목록을 구성한다. 기존 `data/ingredients.json` import 구문을 이 Server Action 호출로 교체한다.

---

### 8. 배포 시 고려사항

#### 핵심 제약

Vercel은 서버리스(Serverless) 환경이므로 **영속적인 TCP 연결을 유지할 수 없다**. 직접 `pg.Pool`을 사용하는 경우 콜드 스타트마다 커넥션을 재생성하며, 커넥션 풀이 누적될 수 있다. 이를 해결하기 위해 아래 두 가지 방안 중 하나를 선택한다.

#### 방안 A — Neon (권장, 무료 플랜 있음)

Neon은 서버리스 PostgreSQL 서비스로, HTTP 기반 쿼리와 커넥션 풀링을 기본 제공한다.

```bash
npm install @neondatabase/serverless
```

```typescript
// lib/db/client.ts
import { neon } from "@neondatabase/serverless";

export const sql = neon(process.env.DATABASE_URL!);
```

| 항목 | 무료 플랜 한도 |
|------|--------------|
| 스토리지 | 512MB |
| 컴퓨팅 시간 | 191.9시간 / 월 |
| 프로젝트 수 | 1개 |
| 비용 | **$0** |

> Neon 무료 플랜은 Supabase 무료 플랜과 동등한 수준. 로컬 개발은 Docker, 프로덕션은 Neon으로 동일한 PostgreSQL 환경을 유지할 수 있다.

#### 방안 B — Railway

Railway는 컨테이너 기반 PostgreSQL을 제공하며, 영속적 TCP 연결을 지원한다. 무료 크레딧($5/월)이 소진되면 과금이 발생하므로 트래픽이 적은 초기 단계에서는 Neon이 더 적합하다.

#### 환경별 DATABASE_URL 설정

| 환경 | DATABASE_URL |
|------|-------------|
| 로컬 개발 | `postgresql://recipe_user:recipe_pass@localhost:5432/simple_recipe` |
| Vercel 프리뷰 | Neon 개발 브랜치 URL (Neon의 브랜치 기능 활용 가능) |
| Vercel 프로덕션 | Neon 프로덕션 URL (`?sslmode=require` 필수) |

**Vercel 환경변수 등록**:
```
# Vercel 대시보드 → Settings → Environment Variables
DATABASE_URL=postgresql://user:pass@ep-xxx.ap-southeast-1.aws.neon.tech/simple_recipe?sslmode=require
```

#### 마이그레이션 관리

프로덕션 DB 스키마 변경 시 `supabase/schema.sql`을 직접 수정하는 대신, 버전 번호가 붙은 마이그레이션 파일을 운용한다.

```
supabase/
├── migrations/
│   ├── 001_initial_schema.sql    # recipes, ingredients, user_recipes 테이블
│   └── 002_add_indexes.sql       # 추가 인덱스
└── schema.sql                    # 최신 전체 스키마 (참조용)
```

Drizzle ORM을 선택한 경우 `drizzle-kit generate` 명령으로 마이그레이션 파일을 자동 생성할 수 있다.

---

### 9. 변경 구현 순서 (권장)

아래 순서는 의존성을 고려한 권장 작업 순서다. 각 단계는 독립적으로 검증 가능하다.

**Phase 1 — 인프라 준비 (약 1시간)**:
1. `docker-compose.yml` 작성 및 컨테이너 기동 확인
2. `supabase/schema.sql` 확장 (`recipes`, `ingredients` 테이블 추가)
3. `scripts/seed.ts` 작성 및 `npm run db:seed` 실행 검증

**Phase 2 — DB 연결 레이어 (약 2시간)**:
4. `lib/db/client.ts` 작성 (pg Pool 또는 Neon 클라이언트)
5. `lib/db/transform.ts` 작성 (snake_case → camelCase 변환)
6. `.env.local` 환경변수 교체

**Phase 3 — 검색 로직 교체 (약 3시간)**:
7. `lib/recipes/search.ts` — JSON import → DB 쿼리로 교체
8. `lib/ingredients/dictionary.ts` 신규 작성
9. `IngredientInput.tsx` — JSON import → Server Action 호출로 교체
10. `app/recipe/[id]/page.tsx` — JSON lookup → DB 쿼리로 교체

**Phase 4 — 사용자 레시피 CRUD 교체 (약 2시간)**:
11. `app/recipe/new/actions.ts` — Supabase SDK → pg 쿼리로 교체
12. `app/recipe/[id]/edit/actions.ts` — 동일
13. `app/recipe/[id]/actions.ts` — 동일

**Phase 5 — 정리 (약 1시간)**:
14. `lib/supabase.ts` 삭제
15. `npm uninstall @supabase/supabase-js`
16. `data/recipes.json`, `data/ingredients.json` import 구문 제거 (파일 자체는 seed 소스로 보관 가능)
17. `npx tsc --noEmit` 및 `npx eslint . --quiet` 통과 확인
