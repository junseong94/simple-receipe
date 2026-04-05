# Simple Recipe - 구현 계획서 (Implementation Plan)

> 기준 문서: [specification.md](./specification.md) | [prd.md](./prd.md)
> 작성일: 2026-04-05
> 담당 에이전트: nextjs-fullstack-senior (개발) → senior-code-reviewer (리뷰)

---

## Phase 1: 프로젝트 기반 설정 + 데이터 레이어

### 1-1. 패키지 설치 및 프로젝트 설정
- [ ] `npm install @supabase/supabase-js bcryptjs zod`
- [ ] `npm install -D @types/bcryptjs`
- [ ] `next.config.ts` 업데이트 — `images.remotePatterns` (img.youtube.com, i.ytimg.com)
- [ ] `.env.local` 템플릿 생성 (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY)
- [ ] `globals.css` 디자인 토큰 확장 — 3개 프로토타입 색상 변수, 다크모드 기본 변수

**산출물**: 프로젝트 빌드 성공 (`npm run build`)

### 1-2. TypeScript 인터페이스 정의
- [ ] `lib/recipes/types.ts` — Recipe, ScoredRecipe, CuisineType, DifficultyType
- [ ] 재료 사전 타입 — Ingredient, IngredientDictionary
- [ ] 레시피 ID 네임스페이스: 큐레이션 `"korean-001"` / 사용자 UUID

**주요 타입**:
```
Recipe { id, name, cuisine, difficulty, cookTime, servings, ingredients[], seasonings[], steps[], youtubeUrl, youtubeTitle, channelName, thumbnailUrl, summary, source }
ScoredRecipe { recipe, matchedIngredients[], missingIngredients[], missingCount, matchRatio }
```

### 1-3. 재료 사전 데이터 구축
- [ ] `data/ingredients.json` — 200+ 재료, 동의어, 카테고리(meat/seafood/vegetable/dairy/grain/seasoning/pantry)
- [ ] `lib/ingredients/pantry.ts` — 기본 양념 목록 (기본 조미료 + 한식 + 양식/일식/중식 + 공통)
- [ ] `lib/ingredients/synonyms.ts` — 동의어 그룹 매핑 (삼겹살=돼지삼겹살=삼겹, 참치=참치캔 등)
- [ ] `lib/ingredients/normalize.ts` — 공백제거, 정규화 함수

### 1-4. 레시피 데이터셋 구축
- [ ] `data/recipes.json` — 60~80개 레시피 (한식/중식/일식/양식 각 15~20개)
- [ ] 각 레시피: 실제 YouTube 영상 URL 큐레이션 (웹검색으로 인기 영상 찾기)
- [ ] 영상 기반 재료 목록 + 조리순서 텍스트 요약 작성
- [ ] 썸네일 URL 자동 생성 (img.youtube.com/vi/{videoId}/hqdefault.jpg)

### 1-5. 핵심 로직 구현
- [ ] `lib/recipes/scorer.ts` — 누락 재료 점수 알고리즘
  - 기본양념 제외, missingCount 계산, matchRatio 계산
  - missingCount > 3 결과 제외
  - 정렬: missingCount ASC → matchRatio DESC
- [ ] `lib/recipes/search.ts` — 검색 + 필터 함수
  - `filterStaticRecipes(ingredients, cuisines)` — 정적 JSON 필터링
  - `scoreRecipe(recipe, ingredients)` — 점수 계산
- [ ] Supabase 클라이언트 초기화 (`lib/supabase.ts`)

**검증**: 단위 테스트로 검색 시나리오 확인
- "삼겹살" → 삼겹살구이, 제육볶음 등 (누락 0~3개)
- "상추, 참치, 김치" → 참치비빔밥, 참치김치볶음 등 (최소재료)

---

## Phase 2: 공통 컴포넌트

### 2-1. UI 프리미티브 (`app/_components/ui/`)
- [ ] `Button.tsx` — variant(primary/secondary/ghost), size(sm/md/lg), disabled, loading
- [ ] `Input.tsx` — 기본 텍스트 입력, placeholder, error 상태
- [ ] `Tag.tsx` — pill 형태, 삭제(X) 버튼, 색상 variant(default/matched/missing/disabled)
- [ ] `Card.tsx` — 썸네일 + 콘텐츠 영역, hover 효과
- [ ] `Badge.tsx` — 누락 재료 수 표시용 (0=green, 1-2=yellow, 3=orange)
- [ ] `Skeleton.tsx` — 로딩 스켈레톤 (카드, 텍스트)
- [ ] `Tabs.tsx` — 요리 카테고리 탭 (전체/한식/중식/일식/양식)

### 2-2. 도메인 컴포넌트 (`app/_components/`)
- [ ] `IngredientInput.tsx` (Client)
  - 태그 기반 입력 + 자동완성 드롭다운
  - Enter/콤마로 추가, 백스페이스로 삭제
  - 최대 20개 제한
  - 중복 무시, 동의어 정규화
  - 사전에 없는 재료 "인식 불가" 회색 표시
- [ ] `RecipeCard.tsx` — 썸네일, 요리명, 카테고리 뱃지, 누락 재료 수/목록
- [ ] `RecipeGrid.tsx` (Client) — 검색 결과 그리드, CuisineFilter 연동
- [ ] `CuisineFilter.tsx` (Client) — 전체/한식/중식/일식/양식 탭, 즉시 필터링
- [ ] `MissingBadge.tsx` — 누락 재료 수 + 목록 툴팁
- [ ] `YouTubeEmbed.tsx` (Client) — 반응형 16:9 iframe, URL→videoId 파싱
- [ ] `RecipeSummary.tsx` (Client) — 단계별 조리순서, 접기/펼치기
- [ ] `ThemeToggle.tsx` (Client) — 다크/라이트 모드 전환

**검증**: 각 컴포넌트 개별 렌더링 확인, 모바일/데스크톱 반응형

---

## Phase 3: 3개 UI 프로토타입

> **목표**: 3가지 UX 컨셉을 실제 동작하는 형태로 구현, 사용자 피드백 후 최종 확정.
> 모든 프로토타입은 Phase 2의 공통 컴포넌트를 조합하되, 레이아웃/색상/인터랙션만 다름.

### 3-1. 프로토타입 A: "냉장고 탐색" (`/a`)
- [ ] `app/(prototype-a)/a/page.tsx`
- 화면 중앙 큰 IngredientInput — "냉장고에 뭐가 있나요?"
- 결과: 카테고리별 가로 스크롤 카드 행 (한식 행, 중식 행, 일식 행, 양식 행)
- 카드 클릭 → 슬라이드업 패널 (YouTube 임베드 + 요약)
- 색상: 흰 배경, 오렌지 액센트 (#F97316)
- 모바일: 카드 행 → 가로 캐러셀

### 3-2. 프로토타입 B: "레시피 보드" (`/b`)
- [ ] `app/(prototype-b)/b/page.tsx`
- 상단 고정 검색바 + 카테고리 탭
- Pinterest masonry 그리드
- 카드: 큰 썸네일 + 컬러 도트(녹색=보유, 주황=미보유) + "X개만 더 사면 돼요!"
- 색상: 크림 배경 (#FFFBF0), 딥 틸 (#0D9488)
- 모바일: 단일 컬럼

### 3-3. 프로토타입 C: "퀵 쿡" (`/c`)
- [ ] `app/(prototype-c)/c/page.tsx`
- 3단계 위자드: Step 1(재료 버튼 선택) → Step 2(카테고리 선택) → Step 3(결과 리스트)
- 결과: 누락 재료순 아코디언 (펼치면 YouTube + 요약)
- 색상: 일렉트릭 블루 (#3B82F6), 볼드 타이포
- 모바일 퍼스트: 스와이프 네비게이션

### 3-4. 랜딩 페이지 + 레시피 상세
- [ ] `app/page.tsx` — 3개 프로토타입 선택 화면 (카드 3개 → /a, /b, /c 링크)
- [ ] `app/recipe/[id]/page.tsx` — 레시피 상세 페이지
  - YouTube 임베드 (16:9 반응형)
  - 재료 목록 (보유=녹색체크, 미보유=주황강조)
  - 단계별 조리순서
  - 출처 (채널명, 영상 제목)
  - 큐레이션/사용자 등록 구분 표시
- [ ] `app/recipe/[id]/loading.tsx` — 스켈레톤
- [ ] `app/recipe/[id]/not-found.tsx` — 404 (홈으로 돌아가기)

**검증**: `npm run dev`로 3개 URL 접속, 재료 검색 → 결과 → 상세 플로우 동작 확인

### ⏸️ 사용자 피드백 대기
→ 3개 프로토타입 중 최종 디자인 확정 후 Phase 4 진행

---

## Phase 4: 사용자 레시피 등록 (Supabase 연동)

### 4-1. Supabase 설정
- [ ] Supabase 프로젝트 생성 (Free Plan)
- [ ] `user_recipes` 테이블 생성 (specification.md 스키마 참조)
- [ ] RLS(Row Level Security) 정책 설정
- [ ] `.env.local`에 실제 키 등록

### 4-2. 레시피 등록
- [ ] `app/_components/RecipeForm.tsx` — 등록/수정 공통 폼
  - 닉네임(4~20자, 한글/영문/숫자), 비밀번호(4~20자)
  - 요리명, 카테고리, 난이도, 조리시간, 인분
  - 재료/양념 태그 입력, 조리순서 동적 추가/삭제
  - YouTube URL(선택, 형식 검증)
  - zod 클라이언트+서버 양측 검증
- [ ] `app/recipe/new/page.tsx` — 등록 폼 페이지
- [ ] `app/recipe/new/actions.ts` — `createRecipe` Server Action
  - zod 검증 → bcryptjs.hash(pw, 10) → Supabase INSERT → redirect

### 4-3. 레시피 수정/삭제
- [ ] `app/_components/PasswordModal.tsx` — 닉네임+비밀번호 입력 모달
- [ ] `app/recipe/[id]/edit/page.tsx` — 수정 폼
- [ ] `app/recipe/[id]/edit/actions.ts` — `verifyAndUpdate` Server Action
- [ ] `app/recipe/[id]/actions.ts` — `verifyAndDelete` Server Action
  - bcrypt.compare로 검증, 5회 실패 시 1분 차단

### 4-4. 검색 통합
- [ ] `lib/recipes/search.ts` 확장 — `searchUserRecipes` (Supabase 조회)
- [ ] 정적 + 사용자 레시피 합산 결과 정렬
- [ ] Supabase 장애 시 폴백 (큐레이션만 반환 + 안내 메시지)

**검증**: 레시피 등록 → 검색 결과에 표시 → 수정/삭제 플로우

---

## Phase 5: 폴리싱 + 배포

### 5-1. 반응형 + 접근성
- [ ] 모바일(375px), 태블릿(768px), 데스크톱(1280px) 테스트
- [ ] 터치 타겟 44x44px 이상 확인
- [ ] 이미지 alt 텍스트
- [ ] 키보드 네비게이션 (Tab, Enter)
- [ ] 색상 대비 WCAG AA (4.5:1 이상)

### 5-2. UX 개선
- [ ] 뒤로가기 시 재료 태그 + 필터 상태 복원 (URL searchParams 활용)
- [ ] OG 메타태그 (레시피 상세: 요리명, 썸네일, 요약)
- [ ] 빈 상태 UI (검색 결과 0개 → 안내 메시지 + 일러스트)
- [ ] 에러 바운더리 (`error.tsx`)
- [ ] 로딩 스켈레톤 (`loading.tsx`)

### 5-3. 다크모드
- [ ] ThemeToggle + localStorage 저장
- [ ] 3개 프로토타입 모두 다크모드 대응

### 5-4. 성능
- [ ] Lighthouse 측정 (목표: 모바일 > 90, 데스크톱 > 90)
- [ ] LCP < 2.5초
- [ ] 검색 결과 표시 체감 1초 이내

### 5-5. 배포
- [ ] GitHub 저장소 push
- [ ] Vercel 연결 + 환경변수 설정
- [ ] 프로덕션 배포 확인
- [ ] 모바일 실기기 테스트

**검증**: Lighthouse 리포트, 모바일 실기기 테스트, E2E 시나리오 확인

---

## 에이전트 역할 분담

| 작업 | 담당 에이전트 |
|------|-------------|
| 기획 검토/수정 | senior-product-planner |
| Phase 1~5 개발 | nextjs-fullstack-senior |
| 각 Phase 완료 후 코드 리뷰 | senior-code-reviewer (PostToolUse hook 자동 트리거) |

---

## 의존성 그래프

```
Phase 1 (데이터 + 기반)
   ↓
Phase 2 (공통 컴포넌트)
   ↓
Phase 3 (3개 프로토타입)
   ↓
⏸️ 사용자 피드백 (디자인 확정)
   ↓
Phase 4 (사용자 레시피 등록)
   ↓
Phase 5 (폴리싱 + 배포)
```

> Phase 1~3은 순차 진행. Phase 4는 피드백 후 진행.
> Phase 5는 Phase 4와 병렬 가능 (반응형/다크모드는 Phase 3 이후 바로 시작 가능).

---

## v1.1 사용자 피드백 반영 — 추가 구현 계획

> 기준 문서: [specification.md v1.1](./specification.md) | [feedback-action-plan.md](./feedback-action-plan.md)
> 피드백 일시: 2026-04-05
> 피드백 출처: 프로토타입 직접 사용 테스트

---

### 1차 스프린트 (Must + Should 핵심) — 예상 5시간

#### Sprint 1-1. 검색 정확도 수정 [M-01]
- [ ] `lib/recipes/search.ts` — `matchRatio > 0` 필터 추가
  - `filterStaticRecipes()`: `scored.matchRatio > 0` AND 조건 추가
  - `getCuisineCounts()`: 동일 필터 적용 (Step 2 수치와 Step 3 결과 일치)
- [ ] 검증: "삼겹살" 1개 선택 → 군만두, 다마고야끼 미노출 확인

#### Sprint 1-2. 동의어 매핑 수정 [M-03]
- [ ] `data/ingredients.json` — 달걀/계란 통합
  - "달걀" 항목의 aliases에 "계란", "에그" 추가
  - "계란" 독립 항목 제거 (있다면)
  - PANTRY_STAPLES에 "달걀"과 "계란" 모두 포함 확인
- [ ] 검증: `ingredientMatches("계란", "달걀")` === true

#### Sprint 1-3. YouTube 임베드 수정 [M-02]
- [ ] `app/_components/YouTubeEmbed.tsx` 리팩토링
  - iframe에 `referrerPolicy="strict-origin-when-cross-origin"` 추가
  - 썸네일 클릭 → iframe 활성화 패턴 (activated 상태)
  - 초기: 썸네일 이미지 + 재생 버튼 오버레이
  - 클릭 시: `?autoplay=1` 포함 iframe으로 교체
  - videoId 추출 실패 시 "영상을 불러올 수 없습니다" fallback UI
- [ ] `data/recipes.json` YouTube URL 유효성 검증 (삭제/비공개 영상 교체)

#### Sprint 1-4. 재료 선택 안내 문구 [S-03]
- [ ] `app/_components/HomeClient.tsx` Step 1에 안내 문구 추가
  - "아래 버튼은 레시피에 자주 쓰이는 재료예요. 목록에 없는 재료는 아래에서 직접 입력할 수 있어요."
  - bg-blue-50 rounded-lg 스타일

#### Sprint 1-5. 라이트모드 FOUC 수정 [S-01]
- [ ] `app/layout.tsx` — 테마 초기화 인라인 스크립트 삽입
  - `<Script id="theme-init" strategy="beforeInteractive">` 사용
  - localStorage 'theme' 키 읽어서 즉시 `.dark` 클래스 적용
  - `<html>` 태그에 `suppressHydrationWarning` 추가

**Sprint 1 검증**: `npx tsc --noEmit` + `npm run build` + 브라우저 테스트

---

### 2차 스프린트 (Should + Could) — 예상 9시간

#### Sprint 2-1. PC 2패널 레이아웃 [S-02]
- [ ] `app/_components/HomeClient.tsx` Step 3 레이아웃 수정
  - `<main>` 너비: Step 1~2는 `max-w-lg`, Step 3는 `lg:max-w-5xl`
  - 아코디언 펼침 영역: `lg:grid lg:grid-cols-2 lg:gap-6`
  - 데스크톱: 좌=조리요약, 우=YouTube
  - 모바일: 세로 스택 유지 (YouTube 위, 조리요약 아래)
- [ ] 브레이크포인트: `lg` (1024px) 기준

#### Sprint 2-2. 조리 단계 시간 정보 추가 [C-01]
- [ ] `data/recipes.json` — 65개 레시피 steps 수정
  - 가열/처리 단계에 시간 표현 추가
  - "볶는다" → "중불에서 5~7분 볶는다"
  - "끓인다" → "10분간 끓인다"
  - "굽는다" → "앞뒤로 각 3~4분 굽는다"
  - 기존 `steps: string[]` 타입 변경 없음

#### Sprint 2-3. 재료 인기순 정렬 [C-02] (선택)
- [ ] 레시피 데이터에서 재료 출현 빈도 계산
- [ ] Step 1 재료 버튼을 빈도순으로 정렬
- [ ] 또는 "최근 선택한 재료" 로컬 히스토리 기반 정렬

**Sprint 2 검증**: 반응형 테스트 (모바일 375px, 데스크톱 1280px) + Lighthouse

---

### 의존성 그래프

```
Sprint 1-1 (matchRatio 필터) ← 독립
Sprint 1-2 (동의어) ← 독립
Sprint 1-3 (YouTube) ← 독립
Sprint 1-4 (안내 문구) ← 독립
Sprint 1-5 (FOUC) ← 독립
   ↓ (모두 독립, 병렬 가능)
Sprint 2-1 (PC 2패널) ← Sprint 1 완료 후
Sprint 2-2 (시간 정보) ← 독립 (데이터 작업)
Sprint 2-3 (인기순) ← Sprint 2-2 이후 권장
```

> Sprint 1의 5개 태스크는 모두 독립적이므로 병렬 워크트리로 동시 진행 가능.
> Sprint 2-1(PC 레이아웃)은 Sprint 1의 YouTube 수정(1-3)이 완료된 후 진행 권장.
