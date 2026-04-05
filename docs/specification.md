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
