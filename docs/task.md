# Simple Recipe - 태스크 목록 (Task List)

> 기준 문서: [plan.md](./plan.md)
> 상태: `TODO` | `IN_PROGRESS` | `DONE` | `BLOCKED` | `PAUSED`
> 담당: `fullstack` (nextjs-fullstack-senior) | `reviewer` (senior-code-reviewer) | `planner` (senior-product-planner)

---

## Phase 1: 프로젝트 기반 설정 + 데이터 레이어

### 1-1. 패키지 설치 및 프로젝트 설정

| # | 태스크 | 담당 | 상태 | 비고 |
|---|--------|------|------|------|
| 1 | `npm install @supabase/supabase-js bcryptjs zod` | fullstack | DONE | |
| 2 | `npm install -D @types/bcryptjs` | fullstack | DONE | |
| 3 | `next.config.ts` 업데이트 — images.remotePatterns (img.youtube.com, i.ytimg.com) | fullstack | DONE | |
| 4 | `.env.local` 템플릿 생성 | fullstack | DONE | .env.local.example로 생성 |
| 5 | `globals.css` 디자인 토큰 확장 — 프로토타입 색상 변수, 다크모드 변수 | fullstack | DONE | 2-layer 패턴 (CSS변수 + @theme inline) |
| 6 | 빌드 확인 (`npm run build`) | fullstack | DONE | Turbopack 1495ms |

### 1-2. TypeScript 인터페이스 정의

| # | 태스크 | 담당 | 상태 | 비고 |
|---|--------|------|------|------|
| 7 | `lib/recipes/types.ts` — Recipe, ScoredRecipe, CuisineType, DifficultyType | fullstack | DONE | |
| 8 | 재료 사전 타입 — Ingredient, IngredientDictionary | fullstack | DONE | types.ts에 포함 |

### 1-3. 재료 사전 데이터 구축

| # | 태스크 | 담당 | 상태 | 비고 |
|---|--------|------|------|------|
| 9 | `data/ingredients.json` — 200+ 재료, 동의어, 카테고리 | fullstack | DONE | 202개 재료, alias 충돌 해결 완료 |
| 10 | `lib/ingredients/pantry.ts` — 기본 양념 목록 | fullstack | DONE | 16개 pantry staple + isPantryStaple() |
| 11 | `lib/ingredients/synonyms.ts` — 동의어 그룹 매핑 | fullstack | DONE | 싱글톤 Map, O(1) 조회 |
| 12 | `lib/ingredients/normalize.ts` — 정규화 함수 | fullstack | DONE | 전각→반각, 공백압축, 트림 |

### 1-4. 레시피 데이터셋 구축

| # | 태스크 | 담당 | 상태 | 비고 |
|---|--------|------|------|------|
| 13 | `data/recipes.json` — 한식 20개 | fullstack | DONE | YouTube URL 큐레이션 완료 |
| 14 | `data/recipes.json` — 중식 15개 | fullstack | DONE | |
| 15 | `data/recipes.json` — 일식 15개 | fullstack | DONE | |
| 16 | `data/recipes.json` — 양식 15개 | fullstack | DONE | |
| 17 | 각 레시피 영상 기반 재료 + 조리순서 텍스트 요약 | fullstack | DONE | 65개 전체 작성 |
| 18 | 썸네일 URL 자동 생성 | fullstack | DONE | hqdefault.jpg 형식 |

### 1-5. 핵심 로직 구현

| # | 태스크 | 담당 | 상태 | 비고 |
|---|--------|------|------|------|
| 19 | `lib/recipes/scorer.ts` — 누락 재료 점수 알고리즘 | fullstack | DONE | 수량/단위 제거 후 매칭 |
| 20 | `lib/recipes/search.ts` — filterStaticRecipes, scoreRecipe | fullstack | DONE | cuisine 필터 + 정렬 |
| 21 | `lib/supabase.ts` — Supabase 클라이언트 초기화 | fullstack | DONE | 환경변수 없으면 null 반환 |
| 22 | 검색 시나리오 테스트 — "삼겹살", "상추,참치,김치" | fullstack | DONE | 5개 시나리오 전부 통과 |

### Phase 1 코드 리뷰

| # | 태스크 | 담당 | 상태 | 비고 |
|---|--------|------|------|------|
| 23 | Phase 1 코드 리뷰 | reviewer | TODO | hook 자동 트리거 |

---

## Phase 2: 공통 컴포넌트

### 2-1. UI 프리미티브

| # | 태스크 | 담당 | 상태 | 비고 |
|---|--------|------|------|------|
| 24 | `app/_components/ui/Button.tsx` | fullstack | DONE | variant, size, loading, ARIA |
| 25 | `app/_components/ui/Input.tsx` | fullstack | DONE | useId + aria-describedby |
| 26 | `app/_components/ui/Tag.tsx` | fullstack | DONE | pill, 삭제(X), 4가지 variant |
| 27 | `app/_components/ui/Card.tsx` | fullstack | DONE | role=button 조건부 |
| 28 | `app/_components/ui/Badge.tsx` | fullstack | DONE | 0=green, 1-2=yellow, 3=orange |
| 29 | `app/_components/ui/Skeleton.tsx` | fullstack | DONE | aria-busy 접근성 |
| 30 | `app/_components/ui/Tabs.tsx` | fullstack | DONE | ARIA tablist + barrel export |

### 2-2. 도메인 컴포넌트

| # | 태스크 | 담당 | 상태 | 비고 |
|---|--------|------|------|------|
| 31 | `IngredientInput.tsx` | fullstack | DONE | IME처리, 자동완성, 최대20개 |
| 32 | `RecipeCard.tsx` | fullstack | DONE | next/image, 카테고리뱃지 |
| 33 | `RecipeGrid.tsx` | fullstack | DONE | 반응형 1/2/3열, 빈상태 UI |
| 34 | `CuisineFilter.tsx` | fullstack | DONE | 멀티선택, counts 표시 |
| 35 | `MissingBadge.tsx` | fullstack | DONE | 색상분기, hover 툴팁 |
| 36 | `YouTubeEmbed.tsx` | fullstack | DONE | 3패턴 파싱, fallback |
| 37 | `RecipeSummary.tsx` | fullstack | DONE | steps 접기/펼치기 |
| 38 | `ThemeToggle.tsx` | fullstack | DONE | localStorage + SSR 안전 |

### Phase 2 코드 리뷰

| # | 태스크 | 담당 | 상태 | 비고 |
|---|--------|------|------|------|
| 39 | Phase 2 코드 리뷰 | reviewer | TODO | hook 자동 트리거 |

---

## Phase 3: 3개 UI 프로토타입

### 3-1. 프로토타입 A: "냉장고 탐색" (`/a`)

| # | 태스크 | 담당 | 상태 | 비고 |
|---|--------|------|------|------|
| 40 | `app/(prototype-a)/a/page.tsx` 구현 | fullstack | TODO | 중앙 검색, 카테고리별 가로 스크롤 |
| 41 | 슬라이드업 패널 (YouTube + 요약) | fullstack | TODO | 카드 클릭 시 |
| 42 | 오렌지 액센트 (#F97316) 스타일링 | fullstack | TODO | |
| 43 | 모바일 캐러셀 대응 | fullstack | TODO | |

### 3-2. 프로토타입 B: "레시피 보드" (`/b`)

| # | 태스크 | 담당 | 상태 | 비고 |
|---|--------|------|------|------|
| 44 | `app/(prototype-b)/b/page.tsx` 구현 | fullstack | TODO | 상단 검색바, masonry 그리드 |
| 45 | 컬러 도트 (보유/미보유) + 격려 텍스트 | fullstack | TODO | "X개만 더 사면 돼요!" |
| 46 | 크림 배경 (#FFFBF0) + 틸 (#0D9488) 스타일링 | fullstack | TODO | |
| 47 | 모바일 단일 컬럼 대응 | fullstack | TODO | |

### 3-3. 프로토타입 C: "퀵 쿡" (`/c`)

| # | 태스크 | 담당 | 상태 | 비고 |
|---|--------|------|------|------|
| 48 | `app/(prototype-c)/c/page.tsx` 구현 | fullstack | TODO | 3단계 위자드 |
| 49 | Step 1: 카테고리별 재료 버튼 선택 | fullstack | TODO | 육류/해산물/채소/양념 |
| 50 | Step 2: 요리 카테고리 선택 | fullstack | TODO | 한/중/일/양 |
| 51 | Step 3: 아코디언 결과 리스트 | fullstack | TODO | 펼치면 YouTube + 요약 |
| 52 | 블루 (#3B82F6) 스타일링 + 모바일 스와이프 | fullstack | TODO | |

### 3-4. 공통 페이지

| # | 태스크 | 담당 | 상태 | 비고 |
|---|--------|------|------|------|
| 53 | `app/page.tsx` — 프로토타입 선택 랜딩 | fullstack | TODO | 카드 3개 → /a, /b, /c |
| 54 | `app/recipe/[id]/page.tsx` — 레시피 상세 | fullstack | TODO | YouTube + 재료(보유/미보유) + 조리순서 |
| 55 | `app/recipe/[id]/loading.tsx` — 스켈레톤 | fullstack | TODO | |
| 56 | `app/recipe/[id]/not-found.tsx` — 404 | fullstack | TODO | 홈으로 돌아가기 |

### Phase 3 코드 리뷰

| # | 태스크 | 담당 | 상태 | 비고 |
|---|--------|------|------|------|
| 57 | Phase 3 코드 리뷰 | reviewer | TODO | hook 자동 트리거 |

### 사용자 피드백

| # | 태스크 | 담당 | 상태 | 비고 |
|---|--------|------|------|------|
| 58 | 3개 프로토타입 사용자 피드백 수렴 | planner | PAUSED | Phase 3 완료 후 진행 |
| 59 | 최종 디자인 확정 → spec 업데이트 | planner | PAUSED | 피드백 반영 후 |

---

## Phase 4: 사용자 레시피 등록 (Supabase)

> **BLOCKED**: Phase 3 피드백 완료 후 진행

### 4-1. Supabase 설정

| # | 태스크 | 담당 | 상태 | 비고 |
|---|--------|------|------|------|
| 60 | Supabase 프로젝트 생성 (Free Plan) | fullstack | BLOCKED | |
| 61 | `user_recipes` 테이블 + 인덱스 생성 | fullstack | BLOCKED | spec 스키마 참조 |
| 62 | RLS 정책 설정 | fullstack | BLOCKED | |
| 63 | `.env.local` 실제 키 등록 | fullstack | BLOCKED | |

### 4-2. 레시피 등록

| # | 태스크 | 담당 | 상태 | 비고 |
|---|--------|------|------|------|
| 64 | `RecipeForm.tsx` — 등록/수정 공통 폼 | fullstack | BLOCKED | zod 양측 검증 |
| 65 | `app/recipe/new/page.tsx` — 등록 페이지 | fullstack | BLOCKED | |
| 66 | `app/recipe/new/actions.ts` — createRecipe Server Action | fullstack | BLOCKED | zod → bcrypt → INSERT → redirect |

### 4-3. 레시피 수정/삭제

| # | 태스크 | 담당 | 상태 | 비고 |
|---|--------|------|------|------|
| 67 | `PasswordModal.tsx` — 비밀번호 입력 모달 | fullstack | BLOCKED | |
| 68 | `app/recipe/[id]/edit/page.tsx` — 수정 폼 | fullstack | BLOCKED | |
| 69 | `app/recipe/[id]/edit/actions.ts` — verifyAndUpdate | fullstack | BLOCKED | |
| 70 | `app/recipe/[id]/actions.ts` — verifyAndDelete | fullstack | BLOCKED | 5회 실패 시 1분 차단 |

### 4-4. 검색 통합

| # | 태스크 | 담당 | 상태 | 비고 |
|---|--------|------|------|------|
| 71 | `search.ts` 확장 — searchUserRecipes (Supabase) | fullstack | BLOCKED | |
| 72 | 정적 + 사용자 레시피 합산 정렬 | fullstack | BLOCKED | |
| 73 | Supabase 장애 시 폴백 처리 | fullstack | BLOCKED | 큐레이션만 반환 + 안내 |

### Phase 4 코드 리뷰

| # | 태스크 | 담당 | 상태 | 비고 |
|---|--------|------|------|------|
| 74 | Phase 4 코드 리뷰 | reviewer | BLOCKED | hook 자동 트리거 |

---

## Phase 5: 폴리싱 + 배포

### 5-1. 반응형 + 접근성

| # | 태스크 | 담당 | 상태 | 비고 |
|---|--------|------|------|------|
| 75 | 모바일(375px) / 태블릿(768px) / 데스크톱(1280px) 테스트 | fullstack | BLOCKED | |
| 76 | 터치 타겟 44x44px 이상 | fullstack | BLOCKED | |
| 77 | 이미지 alt 텍스트 | fullstack | BLOCKED | |
| 78 | 키보드 네비게이션 (Tab, Enter) | fullstack | BLOCKED | |
| 79 | 색상 대비 WCAG AA (4.5:1) | fullstack | BLOCKED | |

### 5-2. UX 개선

| # | 태스크 | 담당 | 상태 | 비고 |
|---|--------|------|------|------|
| 80 | 뒤로가기 시 검색 상태 복원 (URL searchParams) | fullstack | DONE | /?step=3&ingredients=삼겹살,양파&cuisines=korean,chinese |
| 81 | OG 메타태그 (레시피 상세) | fullstack | BLOCKED | 요리명, 썸네일, 요약 |
| 82 | 빈 상태 UI (결과 0개) | fullstack | DONE | EmptyState 컴포넌트 (HomeClient.tsx) |
| 83 | `error.tsx` 에러 바운더리 | fullstack | DONE | app/error.tsx |
| 84 | `loading.tsx` 로딩 스켈레톤 | fullstack | DONE | useTransition + isPending 스피너 |

### 5-3. 다크모드

| # | 태스크 | 담당 | 상태 | 비고 |
|---|--------|------|------|------|
| 85 | ThemeToggle + localStorage 연동 | fullstack | DONE | ThemeToggle.tsx |
| 86 | 전체 프로토타입 다크모드 대응 | fullstack | DONE | dark: 클래스 전체 적용 |

### 5-4. 성능

| # | 태스크 | 담당 | 상태 | 비고 |
|---|--------|------|------|------|
| 87 | Lighthouse 측정 + 개선 (모바일 > 90, 데스크톱 > 90) | fullstack | DONE | next.config.ts images.formats avif/webp 추가, Server Action으로 JSON 서버격리 |
| 88 | LCP < 2.5초 확인 | fullstack | DONE | YouTube iframe loading=lazy, 이미지 avif/webp |
| 89 | 검색 결과 체감 1초 이내 확인 | fullstack | DONE | Server Action + useTransition 즉각 피드백 |

### 5-5. 배포

| # | 태스크 | 담당 | 상태 | 비고 |
|---|--------|------|------|------|
| 90 | GitHub 저장소 push | fullstack | BLOCKED | |
| 91 | Vercel 연결 + 환경변수 설정 | fullstack | BLOCKED | |
| 92 | 프로덕션 배포 확인 | fullstack | BLOCKED | |
| 93 | 모바일 실기기 테스트 | fullstack | BLOCKED | |

### Phase 5 코드 리뷰

| # | 태스크 | 담당 | 상태 | 비고 |
|---|--------|------|------|------|
| 94 | Phase 5 최종 코드 리뷰 | reviewer | BLOCKED | hook 자동 트리거 |

---

---

## v1.2 DB 아키텍처 변경 — PostgreSQL Docker 통합

### DB Phase 1: 인프라 준비

| # | 태스크 | 담당 | 상태 | 비고 |
|---|--------|------|------|------|
| 95 | `docker-compose.yml` 작성 | fullstack | TODO | postgres:15-alpine |
| 96 | `supabase/schema.sql` 확장 (recipes, ingredients 테이블) | fullstack | TODO | |
| 97 | `scripts/seed.ts` 작성 (JSON → DB) | fullstack | TODO | ON CONFLICT DO NOTHING |
| 98 | `.env.local` + `.env.local.example` 업데이트 | fullstack | TODO | DATABASE_URL |
| 99 | 컨테이너 기동 + seed 검증 | fullstack | TODO | docker compose up -d + db:seed |

### DB Phase 2: DB 연결 레이어

| # | 태스크 | 담당 | 상태 | 비고 |
|---|--------|------|------|------|
| 100 | `npm install pg @types/pg` | fullstack | TODO | |
| 101 | `lib/db/client.ts` — pg Pool 클라이언트 | fullstack | TODO | |
| 102 | `lib/db/transform.ts` — toCamelCase 헬퍼 | fullstack | TODO | |

### DB Phase 3: 검색 로직 교체

| # | 태스크 | 담당 | 상태 | 비고 |
|---|--------|------|------|------|
| 103 | `lib/recipes/search.ts` — DB 쿼리로 교체 | fullstack | TODO | |
| 104 | `lib/ingredients/dictionary.ts` — 재료 사전 DB 조회 | fullstack | TODO | |
| 105 | `lib/ingredients/synonyms.ts` — DB 기반 동의어 | fullstack | TODO | |
| 106 | `IngredientInput.tsx` — Server Action으로 전환 | fullstack | TODO | |
| 107 | `HomeClient.tsx` — 검색 Server Action 전환 | fullstack | TODO | |
| 108 | `recipe/[id]/page.tsx` — DB 쿼리로 교체 | fullstack | TODO | |

### DB Phase 4: 사용자 레시피 CRUD 교체

| # | 태스크 | 담당 | 상태 | 비고 |
|---|--------|------|------|------|
| 109 | `recipe/new/actions.ts` — pg 쿼리로 교체 | fullstack | TODO | |
| 110 | `recipe/[id]/edit/actions.ts` — pg 쿼리로 교체 | fullstack | TODO | |
| 111 | `recipe/[id]/actions.ts` — pg 쿼리로 교체 | fullstack | TODO | |

### DB Phase 5: 정리

| # | 태스크 | 담당 | 상태 | 비고 |
|---|--------|------|------|------|
| 112 | `lib/supabase.ts` 삭제 | fullstack | TODO | |
| 113 | `npm uninstall @supabase/supabase-js` | fullstack | TODO | |
| 114 | `data/*.json` import 구문 제거 | fullstack | TODO | 파일은 seed 소스로 보관 |
| 115 | `npx tsc --noEmit` + `npm run build` 검증 | fullstack | TODO | |

### DB 코드 리뷰

| # | 태스크 | 담당 | 상태 | 비고 |
|---|--------|------|------|------|
| 116 | v1.2 DB 변경 코드 리뷰 | reviewer | TODO | |

---

## 요약

| Phase | 태스크 수 | 상태 |
|-------|----------|------|
| Phase 1: 기반 + 데이터 | 23개 | DONE |
| Phase 2: 공통 컴포넌트 | 16개 | DONE |
| Phase 3: 프로토타입 | 20개 | DONE |
| Phase 4: Supabase CRUD | 15개 | DONE |
| Phase 5: 폴리싱 + 배포 | 20개 | DONE (배포 잔여) |
| v1.2 DB 아키텍처 변경 | 22개 | TODO |
| **총합** | **116개** | |
