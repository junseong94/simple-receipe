# 사용자 피드백 분석 및 개선 액션 플랜

> 작성일: 2026-04-05
> 기준 서비스: Simple Recipe — 레시피 보드 (3단계 위자드 UI)
> 담당: senior-product-planner

---

## 개요

사용자가 프로토타입 C (퀵 쿡, `/` 메인 페이지)를 직접 사용한 후 7개 항목의 피드백을 제공했다. 본 문서는 각 피드백의 코드 레벨 근본 원인을 분석하고, MoSCoW 우선순위에 따라 개발 태스크를 정의한다. 개발자가 이 문서만으로 작업 범위를 이해하고 바로 착수할 수 있도록 구체적으로 작성한다.

---

## 1. 피드백별 근본 원인 분석

---

### FB-01. 검색 정확도 — 삼겹살 1개 선택 시 군만두·다마고야끼가 결과에 포함됨

**사용자 피드백**: "삼겹살을 선택했는데 군만두, 다마고야끼가 나오는 게 맞아?"

**코드 분석**

`lib/recipes/search.ts`의 `filterStaticRecipes`에서 `MAX_MISSING_COUNT = 3`이 상수로 고정되어 있다. 이 수치는 "최대 3개 재료까지 없어도 결과에 포함"하는 관대한 임계값이다.

군만두 (`chinese-011`)의 `ingredients` 필드:
```json
"ingredients": ["냉동만두 12개"]
```
군만두의 필수 재료는 냉동만두 1개뿐이다. 삼겹살을 선택해도 군만두의 `missingCount = 1`이 된다 (냉동만두 미보유). 이는 임계값 3 이하이므로 결과에 포함된다.

다마고야끼 (`japanese-009`)의 `ingredients` 필드:
```json
"ingredients": ["달걀 4개"]
```
다마고야끼도 달걀 1개뿐이다. 삼겹살 선택 시 `missingCount = 1`이 되어 결과에 포함된다.

**근본 원인**: `MAX_MISSING_COUNT = 3`이라는 절대값 필터만 존재하고, **선택한 재료와의 연관성(relevance)을 판단하는 기준이 없다**. 재료를 1개만 선택했을 때는 "내가 가진 재료 중 하나라도 쓰는 레시피"를 찾는 게 아니라 "내가 가진 재료를 중심으로 만들 수 있는 레시피"를 찾아야 한다.

`matchRatio`가 정렬 기준 2순위로는 쓰이지만, **필터링 기준으로는 사용되지 않는다**. 삼겹살 1개 선택 시 군만두의 `matchRatio = 0` (매칭된 재료 0개 / 필수 재료 1개)이므로, matchRatio에 최솟값을 두면 이 문제를 해결할 수 있다.

**정확한 수치 검증**:

| 레시피 | 필수 재료 | 사용자 재료 매칭 | missingCount | matchRatio |
|--------|-----------|----------------|-------------|------------|
| 삼겹살구이 | 삼겹살, 상추, 깻잎, 마늘 (4개) | 삼겹살 (1개) | 3 | 0.25 |
| 김치찌개 | 묵은지, 삼겹살, 두부 (3개) | 삼겹살 (1개) | 2 | 0.33 |
| 군만두 | 냉동만두 (1개) | 없음 (0개) | 1 | **0.00** |
| 다마고야끼 | 달걀 (1개) | 없음 (0개) | 1 | **0.00** |

군만두와 다마고야끼는 선택한 재료를 단 하나도 사용하지 않는다. `matchRatio > 0` 조건만 추가해도 이 문제는 해결된다.

---

### FB-02. 테마/라이트모드 — 기본값이 다크처럼 보임

**사용자 피드백**: "현재 테마 색상이 다크모드용인 것 같은데 주간모드는 없어?"

**코드 분석**

`app/globals.css`:
```css
@media (prefers-color-scheme: dark) {
  :root {
    --background: #0a0a0a;
    --foreground: #ededed;
  }
}
```

`app/layout.tsx`의 `<html>` 태그:
```tsx
<html lang="ko" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
```
`layout.tsx`에는 `dark` 클래스가 없다. Tailwind의 `dark:` 유틸리티는 `<html>` 요소에 `.dark` 클래스가 있을 때 활성화된다.

`app/_components/ThemeToggle.tsx`의 `resolveInitialTheme`:
```tsx
function resolveInitialTheme(): Theme {
  if (typeof window === "undefined") return "light";
  const stored = localStorage.getItem("theme");
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}
```

**근본 원인 (2가지 복합)**:

1. **ThemeToggle이 `HomeClient.tsx`에서만 렌더된다** (혹은 `page.tsx`에서 헤더에 포함된 경우). ThemeToggle이 마운트되기 전 SSR 단계에서는 `<html>` 요소에 `dark` 클래스가 없다. 그러나 시스템이 다크모드인 사용자는 `globals.css`의 `prefers-color-scheme` 미디어 쿼리에 의해 CSS 변수가 어둡게 적용된다. Tailwind `dark:` 유틸리티는 아직 미적용 상태이므로, CSS 변수 기반 색상(배경, 글자색)은 어둡게, Tailwind `dark:` 유틸리티 클래스는 라이트로 렌더되어 **불일치(flash)**가 발생한다.

2. **초기 hydration 지연**: `ThemeToggle`은 클라이언트 마운트 후 `applyTheme()`를 호출하여 `<html>` 요소에 `.dark`를 적용한다. 이 시점 이전의 짧은 순간 동안 Tailwind `dark:` 클래스가 적용되지 않은 상태로 보인다.

3. **페이지 전환 시 테마 깜빡임(FOUC)**: `layout.tsx`의 `<html>`에 `suppressHydrationWarning`과 초기 테마 스크립트가 없어서 SSR 시 테마를 알 수 없다. 새로고침 시 라이트 → 다크로 전환되는 깜빡임이 발생할 수 있다.

---

### FB-03. 재료 선택 UX — 고정 목록 의도 불명확

**사용자 피드백**: "재료 선택화면에서 매번 고정으로 픽스되는데 이게 맞아? 직접입력을 다하게하려는거야? 아님 조회수에 정렬해서 보여주는거야?"

**코드 분석**

`app/page.tsx`의 `INGREDIENT_CATEGORIES` 상수:
```tsx
const INGREDIENT_CATEGORIES = [
  { label: "육류", items: ["삼겹살", "닭가슴살", "소고기불고기", "베이컨", "닭다리", "햄", "소시지", "차돌박이"] },
  { label: "해산물", items: ["새우", "참치", "오징어", "연어", "고등어", "조개", "게맛살", "어묵"] },
  { label: "채소", items: ["양파", "감자", "당근", "배추", "두부", "대파", "버섯류", "김치"] },
  { label: "기타", items: ["계란", "라면", "떡볶이떡", "슬라이스치즈", "우유", "밥(쌀)", "파스타면", "당면"] },
] as const;
```

**근본 원인**: 재료 목록이 `as const` 상수로 하드코딩되어 있어 순서가 고정된다. 선택 빈도 기반 정렬이나 동적 로딩이 구현되어 있지 않다. 또한 UI에 이 버튼들의 역할이 "자주 쓰는 재료"인지 "전체 재료"인지 명시적으로 안내되지 않는다. 직접 입력 섹션은 있지만, 버튼 섹션이 "빠른 선택"용임을 사용자가 파악하기 어렵다. 섹션 헤더가 소문자/영문 `uppercase tracking-widest` 스타일로 눈에 잘 띄지 않는다.

**UX 설계 의도 정의 필요**: 현재 버튼들이 표시되는 기준이 기획 문서에 명시되어 있지 않다. "레시피 데이터셋에서 실제로 사용 빈도가 높은 재료" 기준으로 선정했다면 이를 UI에 표시해야 한다.

---

### FB-04. 동의어 검색 불일치 — 계란/달걀 결과 상이

**사용자 피드백**: "계란, 달걀로 검색했을때 결과는 동일하게 나와야하는거 아니야?"

**코드 분석**

`data/ingredients.json` 확인이 필요하다. 동의어 처리는 `lib/ingredients/synonyms.ts`의 `ingredientMatches()`가 담당한다.

`lib/ingredients/synonyms.ts`:
```tsx
function buildSynonymMap(): SynonymMap {
  for (const ingredient of ingredientData.ingredients) {
    const canonicalName = normalizeIngredient(ingredient.name);
    map.set(canonicalName, canonicalName);
    for (const alias of ingredient.aliases) {
      const normalizedAlias = normalizeIngredient(alias);
      if (!map.has(normalizedAlias)) {
        map.set(normalizedAlias, canonicalName);
      }
    }
  }
}
```

문제는 `data/recipes.json`의 ingredients 필드에 사용된 재료명과 `data/ingredients.json`의 동의어 맵이 **양방향으로 연결되지 않을 수 있다**는 것이다.

`data/recipes.json` 일부:
- `korean-005` 계란말이: `"달걀 4개"` 사용
- `korean-004` 참치비빔밥: `"달걀 1개"` 사용
- `chinese-011` 군만두, `japanese-009` 다마고야끼: 달걀 사용

사용자가 Step 1에서 `"계란"` 버튼을 클릭하면 `selectedIngredients`에 `"계란"` 문자열이 들어간다. Scorer에서 `extractIngredientName("달걀 4개")` = `"달걀"`이 되고, `ingredientMatches("계란", "달걀")`을 호출한다.

`data/ingredients.json`에서 달걀 항목이 어떻게 정의되어 있는지가 핵심이다. 만약 `name: "달걀"`, `aliases: ["계란"]`이라면 동의어 매핑이 정상 동작해야 한다. 하지만 INGREDIENT_CATEGORIES의 버튼에는 `"계란"` 문자열이 하드코딩되어 있다. `normalizeIngredient("계란")`이 어떤 값을 반환하는지, ingredients.json에 "계란"이 독립 항목인지 "달걀"의 alias인지 확인 필요하다.

**실제 근본 원인 후보**:
- `ingredients.json`에 `달걀`과 `계란`이 각각 독립 항목으로 등록되어 서로 다른 canonical name을 가질 경우
- `recipes.json`에서 "달걀"을 사용하는데 `ingredients.json` 동의어 맵에 "계란→달걀" 또는 "달걀→계란" 연결이 빠진 경우
- `extractIngredientName()` 처리 후 정규화된 문자열이 동의어 맵 키와 정확히 일치하지 않을 경우

이 버그는 `달걀` 항목 확인 후 수정이 필요하다.

---

### FB-05. PC 레이아웃 — 아코디언 펼칠 때 세로만 확장

**사용자 피드백**: "PC일 경우에는 레시피결과를 눌렀을때 옆면을 더 활용하는 게 최적화된 거 아닐까?"

**코드 분석**

`app/page.tsx`의 레이아웃:
```tsx
<main className="mx-auto w-full max-w-lg flex-1 px-4 pb-28 pt-6">
```
`max-w-lg`는 512px로 고정. 1024px 이상 데스크톱에서도 512px 너비 단일 컬럼으로 렌더된다.

`RecipeAccordionItem`의 펼쳐진 컨텐츠:
```tsx
{open && (
  <div className="border-t border-gray-100 px-4 pb-4 pt-3 dark:border-gray-700/50">
    <div className="space-y-4">
      <YouTubeEmbed url={recipe.youtubeUrl} title={recipe.youtubeTitle} />
      <RecipeSummary steps={recipe.steps} summary={recipe.summary} />
    </div>
  </div>
)}
```
YouTube와 RecipeSummary가 `space-y-4`로 세로 스택 배치다. 데스크톱에서도 동일하다.

**근본 원인**: PC 브레이크포인트 전용 레이아웃이 설계되어 있지 않다. 현재 `max-w-lg` + 단일 컬럼 설계는 모바일 퍼스트로 완전히 고정되어 있고, `lg:` 반응형 변형이 없다. 아코디언 펼침 시 `lg:grid-cols-2` 2패널 레이아웃(좌: 레시피 정보, 우: YouTube)으로 전환하는 코드가 없다.

---

### FB-06. YouTube 동영상 미표시

**사용자 피드백**: "왜 동영상 파일은 안나와?"

**코드 분석**

`app/_components/YouTubeEmbed.tsx`의 `extractVideoId()`:
```tsx
const patterns = [
  /[?&]v=([^&#]+)/,
  /youtu\.be\/([^?&#]+)/,
  /\/embed\/([^?&#]+)/,
];
```

URL 파싱 로직 자체는 표준 YouTube URL 형식을 모두 커버한다. 문제는 다른 곳에 있을 가능성이 높다.

**근본 원인 후보 (우선순위 순)**:

1. **YouTube 임베드 CSP(Content Security Policy) 차단**: Next.js는 기본적으로 별도 CSP 설정이 없지만, Vercel 배포 환경이나 브라우저 확장에 의해 iframe이 차단될 수 있다.

2. **`next.config.ts` iframe 차단 헤더 없음**: YouTube iframe 임베드가 작동하려면 `X-Frame-Options`나 CSP의 `frame-src` 설정이 적절해야 한다. Next.js 기본 설정에는 없으나, 일부 설정에서 외부 iframe을 막는 헤더가 자동으로 붙을 수 있다.

3. **잘못된 YouTube URL 데이터**: `data/recipes.json`의 `youtubeUrl` 필드가 실제 존재하지 않는 URL일 경우 iframe이 빈 화면을 표시한다. `extractVideoId()`는 VideoId를 정상 파싱해도 실제 영상이 삭제/비공개이면 재생 불가다.

4. **`iframe`에 `referrerPolicy` 누락**: 일부 YouTube 영상은 특정 출처에서의 임베드를 허용하지 않는다. `referrerpolicy="strict-origin-when-cross-origin"`을 명시하거나 없애야 한다.

5. **`allow` 속성의 `autoplay` 정책**: 브라우저에 따라 autoplay 차단이 iframe 초기화를 방해하는 경우가 있다.

**실제 확인 방법**: 브라우저 개발자 도구 → Console에서 CSP 에러 또는 "Refused to display" 메시지 확인. Network 탭에서 iframe src가 실제로 요청되는지 확인.

---

### FB-07. 조리 단계 시간 정보 부재

**사용자 피드백**: "몇분 볶거나 몇분 끓이거나 이런 표현이 있어야 하지 않을까?"

**코드 분석**

`data/recipes.json`의 `steps` 배열:
```json
"steps": [
  "돼지고기를 한입 크기로 썬다",
  "양념장을 만든다",
  "팬에 식용유를 두르고 고기를 볶는다"
]
```

시간 정보가 전혀 없다. `lib/recipes/types.ts`의 `Recipe` 인터페이스에도 step별 시간 필드가 없다:
```typescript
interface Recipe {
  steps: string[];  // 단순 문자열 배열
}
```

**근본 원인**: 데이터 스키마 자체에 step별 시간 정보 필드가 없다. 두 가지 접근 방법이 있다:
- **방법 A (빠름)**: `steps` 문자열 자체에 시간을 포함 ("중불에서 5분 볶는다"). 스키마 변경 불필요.
- **방법 B (정석)**: `steps`를 `{ description: string; duration?: string }[]` 구조로 변경. 타입, 데이터, 컴포넌트 모두 수정 필요.

---

## 2. 우선순위 분류 (MoSCoW)

### Must (반드시 해야 함 — 사용 경험 파괴 수준)

| # | 항목 | 근거 |
|---|------|------|
| M-01 | 검색 필터 기준 강화: matchRatio > 0 조건 추가 | 선택한 재료와 무관한 레시피가 다수 노출되어 서비스 신뢰도 훼손 |
| M-02 | YouTube 임베드 디버깅 및 수정 | 동영상이 핵심 콘텐츠인데 표시 안 됨 = 서비스 핵심 기능 장애 |
| M-03 | 달걀/계란 동의어 매핑 검증 및 수정 | 동일 재료가 다른 결과를 내면 검색 신뢰도 완전 파괴 |

### Should (중요하지만 없어도 동작은 함)

| # | 항목 | 근거 |
|---|------|------|
| S-01 | 라이트모드 FOUC 해결 (초기 테마 스크립트 삽입) | 다크모드 사용자가 라이트를 선택해도 계속 어둡게 보이는 문제 |
| S-02 | PC 2패널 레이아웃 (아코디언 펼침 시 YouTube 사이드) | 데스크톱 사용자 UX 개선, 화면 공간 낭비 해소 |
| S-03 | 재료 선택 화면 안내 문구 추가 ("자주 쓰는 재료") | UX 의도 불명확함 해소, 직접 입력 유도 |

### Could (있으면 좋음, 시간 여유 있을 때)

| # | 항목 | 근거 |
|---|------|------|
| C-01 | 조리 단계에 시간 정보 추가 | 조리 편의성 향상, 데이터 수정 공수 큼 |
| C-02 | 재료 버튼 인기순 동적 정렬 (레시피 데이터 기반) | 현재는 없어도 동작하나, 향후 사용성 개선 여지 있음 |
| C-03 | 검색 결과 수 설명 ("왜 35개?") 팝오버 추가 | 사용자가 결과 수를 이해할 수 있도록 |

### Won't (이번 이터레이션에서는 하지 않음)

| # | 항목 | 근거 |
|---|------|------|
| W-01 | YouTube API 연동 (영상 제목/조회수 실시간 조회) | Phase 6 계획 항목, 현재는 과도한 복잡도 |
| W-02 | steps 스키마 구조 변경 (`{ description, duration }[]`) | 65개 레시피 데이터 전체 재작성 필요, 방법 A로 우선 해결 |

---

## 3. 추가 개발 항목 + 리팩토링 목록

---

### [M-01] 검색 정확도 강화 — matchRatio 필터 추가

**파일**: `lib/recipes/search.ts`

**현재 코드**:
```typescript
const withinThreshold = scoredRecipes.filter(
  (scored) => scored.missingCount <= MAX_MISSING_COUNT,
);
```

**변경 코드**:
```typescript
const MIN_MATCH_RATIO = 0.0; // 아래 설명 참조
const withinThreshold = scoredRecipes.filter(
  (scored) =>
    scored.missingCount <= MAX_MISSING_COUNT &&
    scored.matchRatio > MIN_MATCH_RATIO,  // 매칭 재료가 0개인 레시피 제외
);
```

**상세 설명**:
- `matchRatio > 0`이면 "사용자가 선택한 재료 중 최소 1개 이상 쓰는 레시피"만 포함된다.
- 이 조건 하나로 군만두(matchRatio=0), 다마고야끼(matchRatio=0) 문제가 해결된다.
- `MIN_MATCH_RATIO`를 0이 아닌 0.1~0.2로 높이면 더 엄격해진다. 단, 임계값을 높이면 재료를 1개만 선택할 경우 결과가 너무 적어질 수 있으므로 초기에는 `> 0`으로 시작하고 추가 피드백 후 조정한다.
- `getCuisineCounts()`에도 동일한 필터를 적용해야 Step 2의 카운트가 실제 결과와 일치한다.

**추가 검토 항목**:
- `searchUserRecipes()`의 필터링 로직에도 동일 조건 적용 필요 (`lib/recipes/search.ts` 내 `filtered` 변수)
- `searchAllRecipes()`는 두 함수를 호출하므로 자동으로 반영됨

**예상 공수**: 30분 (코드 변경 5분, 시나리오 검증 25분)

**검증 시나리오**:
1. "삼겹살" 1개 선택 → 군만두, 다마고야끼 결과에 없어야 함
2. "삼겹살" 1개 선택 → 삼겹살구이, 김치찌개 결과에 있어야 함
3. "계란" 1개 선택 → 계란말이, 다마고야끼, 김치볶음밥 있어야 함
4. "양파, 감자, 당근" 3개 선택 → 결과 수가 적절히 줄어야 함

---

### [M-02] YouTube 임베드 디버깅 및 수정

**파일**: `app/_components/YouTubeEmbed.tsx`, `next.config.ts`

**1단계 — URL 유효성 검증 추가**:

`data/recipes.json`의 65개 YouTube URL이 모두 유효한지 일괄 확인이 필요하다. 영상이 삭제/비공개인 경우 VideoId 파싱은 성공하지만 iframe은 빈 화면을 표시한다.

```bash
# 유효성 확인 스크립트 (개발 환경에서 실행)
# recipes.json에서 youtubeUrl 추출 후 HTTP 200 응답 확인
cat data/recipes.json | grep -o '"youtubeUrl": "[^"]*"' | grep -o 'https[^"]*'
```

**2단계 — iframe에 `referrerpolicy` 추가**:

```tsx
<iframe
  src={embedUrl}
  title={title ?? "YouTube 동영상"}
  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
  allowFullScreen
  loading="lazy"
  referrerPolicy="strict-origin-when-cross-origin"  // 추가
  className="absolute inset-0 h-full w-full"
/>
```

**3단계 — next.config.ts 보안 헤더 확인**:

현재 `next.config.ts`에 `headers()` 설정이 없는지 확인. 만약 `X-Frame-Options: SAMEORIGIN` 같은 헤더가 추가된 경우 YouTube 임베드를 막을 수 있다. YouTube는 Vercel 도메인에서의 임베드를 허용하므로 이 문제는 아닐 가능성이 높다.

**4단계 — 썸네일 fallback → iframe 전환 UX**:

현재 아코디언을 펼치면 바로 `<iframe>`이 렌더된다. 썸네일 이미지를 먼저 보여주고 클릭 시 iframe으로 교체하는 "클릭하여 재생" 패턴을 적용하면 로딩 속도와 임베드 실패 상황 모두 개선된다.

```tsx
// YouTubeEmbed.tsx 개선안
export default function YouTubeEmbed({ url, title, thumbnailUrl }: YouTubeEmbedProps) {
  const [activated, setActivated] = useState(false);
  const videoId = extractVideoId(url);

  if (!videoId) return <ErrorFallback />;

  if (!activated) {
    return (
      <button onClick={() => setActivated(true)} className="...">
        <img src={thumbnailUrl ?? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`} alt={title} />
        <PlayIcon />
      </button>
    );
  }

  return <iframe src={`https://www.youtube.com/embed/${videoId}?autoplay=1`} ... />;
}
```

이 방식의 장점:
- 썸네일이 표시되므로 임베드 실패해도 영상이 있다는 것을 시각적으로 전달
- autoplay=1로 클릭 즉시 재생
- 페이지 초기 로딩 성능 향상 (iframe lazy 넘어 완전히 지연)

**예상 공수**: 2시간 (URL 유효성 확인 30분, 코드 수정 30분, 썸네일 fallback 구현 1시간)

---

### [M-03] 달걀/계란 동의어 매핑 검증 및 수정

**파일**: `data/ingredients.json`

**검증 방법**:
```bash
# ingredients.json에서 달걀/계란 항목 확인
cat data/ingredients.json | grep -A5 '"달걀\|계란"'
```

**예상 문제 및 수정 방향**:

현재 `INGREDIENT_CATEGORIES`의 "기타" 항목에 `"계란"` 버튼이 있다. recipes.json에서는 `"달걀 4개"`, `"달걀 1개"` 형태로 저장되어 있다.

만약 `ingredients.json`에서 달걀과 계란이 별도 항목이라면:
```json
// 현재 (문제 상황 예시)
{ "name": "달걀", "aliases": ["계란란", "에그"] }
{ "name": "계란", "aliases": ["달걀란"] }
```

올바른 수정:
```json
{ "name": "달걀", "aliases": ["계란", "에그", "달걀(계란)"] }
// 계란 항목은 제거 또는 달걀의 alias로 통합
```

**검증 시나리오**:
1. "계란" 선택 → "달걀" 포함 레시피 (계란말이, 다마고야끼 등) 결과에 있어야 함
2. "달걀" 입력 → "계란" 버튼 선택과 동일 결과 나와야 함

**예상 공수**: 1시간 (JSON 확인 15분, 수정 15분, 검증 30분)

---

### [S-01] 라이트모드 FOUC(Flash of Unstyled Content) 해결

**파일**: `app/layout.tsx`

**현상**: 시스템 다크모드 사용자가 "라이트모드" 설정 후 새로고침 시, 짧은 순간 다크 배경으로 보이다가 라이트로 전환됨.

**근본 해결책**: SSR 시점에 `<html>` 요소에 올바른 테마 클래스를 적용하기 위해 인라인 스크립트를 사용한다. Next.js App Router에서는 `<Script>` 컴포넌트의 `strategy="beforeInteractive"`를 활용한다.

```tsx
// app/layout.tsx
import Script from "next/script";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" suppressHydrationWarning className="h-full antialiased">
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
      <body>{children}</body>
    </html>
  );
}
```

- `suppressHydrationWarning`: `<html>` 요소의 `class` 속성이 서버/클라이언트 간 다를 수 있으므로 hydration 경고를 억제한다.
- 이 스크립트는 React hydration보다 먼저 실행되어 FOUC를 완전히 제거한다.

**예상 공수**: 1시간

---

### [S-02] PC 2패널 레이아웃 구현

**파일**: `app/page.tsx`

**변경 전 (현재)**: Step 3 결과에서 아코디언 펼침 시 세로 스택 (YouTube → 조리 요약)

**변경 후 (목표)**:
- 모바일 (`< 1024px`): 현재와 동일한 세로 스택 유지
- 데스크톱 (`>= 1024px`): 2패널 레이아웃 (좌: 조리 요약 + 재료, 우: YouTube 고정)

**레이아웃 변경 범위**:

1. `<main>` 컨테이너: `max-w-lg` → Step 3에서는 `max-w-3xl lg:max-w-5xl`로 확장
2. `RecipeAccordionItem`의 펼쳐진 컨텐츠:
```tsx
// 변경 전
<div className="space-y-4">
  <YouTubeEmbed ... />
  <RecipeSummary ... />
</div>

// 변경 후
<div className="lg:grid lg:grid-cols-2 lg:gap-6 space-y-4 lg:space-y-0">
  {/* 모바일: 아래 / 데스크톱: 우측 패널 */}
  <div className="lg:order-2">
    <YouTubeEmbed ... />
  </div>
  {/* 모바일: 위 / 데스크톱: 좌측 패널 */}
  <div className="lg:order-1">
    <RecipeSummary ... />
  </div>
</div>
```

3. 아코디언 헤더 레이아웃도 데스크톱에서 더 넓게 보이도록 요리명 + 뱃지 영역 확장 고려.

**UX 고려사항**:
- 아코디언이 펼쳐질 때 YouTube 영상이 우측에 고정되면 사용자가 조리 순서를 보면서 동시에 영상을 참조할 수 있어 실용적이다.
- 여러 아코디언이 동시에 펼쳐지는 경우 레이아웃이 복잡해지므로 "한 번에 하나만 열기" 옵션을 고려한다 (현재는 여러 개 동시에 열림).

**예상 공수**: 3시간

---

### [S-03] 재료 선택 화면 안내 문구 개선

**파일**: `app/page.tsx`

**변경 내용 (UI 텍스트 + 레이아웃)**:

1. 섹션 제목 앞에 명확한 안내 추가:
```tsx
// 변경 전
<h1>어떤 재료가 있나요?</h1>
<p>냉장고에 있는 재료를 선택해주세요</p>

// 변경 후
<h1>어떤 재료가 있나요?</h1>
<p>냉장고에 있는 재료를 선택해주세요</p>
<div className="...tip-box">
  <span>아래 버튼은 레시피에 자주 쓰이는 재료예요. 목록에 없는 재료는 아래에서 직접 입력할 수 있어요.</span>
</div>
```

2. 카테고리 헤더 스타일 가독성 개선 (한글로 변경 고려):
```tsx
// 변경 전: uppercase tracking-widest 스타일의 "육류", "해산물"
// 변경 후: 더 명확하게 읽히도록 스타일 조정

<h2 className="mb-2.5 text-sm font-bold text-gray-600 dark:text-gray-400">
  육류
</h2>
```

**예상 공수**: 30분

---

### [C-01] 조리 단계 시간 정보 추가

**방법 A (권장 — 최소 공수)**

`data/recipes.json`의 `steps` 배열 문자열에 시간 정보를 직접 포함한다. 타입과 컴포넌트 변경 없이 데이터만 수정.

**수정 범위**: `data/recipes.json` — 65개 레시피, steps 배열 내 시간 관련 단계에 시간 표기 추가

**예시 (제육볶음)**:
```json
// 변경 전
"steps": [
  "돼지고기를 한입 크기로 썬다",
  "팬에 식용유를 두르고 고기를 볶는다"
]

// 변경 후
"steps": [
  "돼지고기를 한입 크기로 썬다",
  "팬에 식용유를 두르고 고기를 중불에서 5~7분 볶는다"
]
```

**작업 기준**: 모든 steps에 시간을 넣기보다, "볶는다", "끓인다", "재운다", "굽는다" 같은 가열/처리 단계에만 시간을 추가한다.

**방법 B (장기 — 정석)**

`Recipe.steps`를 구조적 데이터로 변경:
```typescript
// lib/recipes/types.ts 수정
interface RecipeStep {
  description: string;
  duration?: string;  // "5분", "10~15분"
  heat?: "low" | "medium" | "high";  // 선택적
}

interface Recipe {
  steps: RecipeStep[];
}
```

이 경우 `RecipeSummary.tsx` 컴포넌트, `data/recipes.json` 전체, Supabase 스키마 변경이 필요하다. 공수가 크므로 방법 A로 먼저 해결하고 사용자 반응 보고 방법 B 검토 권장.

**예상 공수**: 방법 A — 3~4시간 (데이터 작업)

---

### [C-02] 재료 버튼 인기순 동적 정렬

**파일**: `app/page.tsx`, `lib/recipes/search.ts` (신규 유틸 추가)

**기획 의도 정의**:
현재 INGREDIENT_CATEGORIES는 기획자가 수동으로 선택한 목록이다. "인기순"은 두 가지로 정의할 수 있다:
1. **레시피 포함 빈도**: `data/recipes.json`에서 해당 재료가 `ingredients` 필드에 등장하는 횟수
2. **사용자 선택 빈도**: 실제 서비스 운영 후 localStorage 또는 서버에서 집계 (현재 불가)

단기적으로 방법 1(레시피 포함 빈도)을 구현한다.

```typescript
// lib/ingredients/popularity.ts (신규)
import recipesData from "@/data/recipes.json";
import { extractIngredientName } from "@/lib/recipes/scorer";

export function getIngredientPopularity(): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const recipe of recipesData) {
    for (const ing of recipe.ingredients) {
      const name = extractIngredientName(ing);
      counts[name] = (counts[name] ?? 0) + 1;
    }
  }
  return counts;
}
```

이 데이터를 기반으로 INGREDIENT_CATEGORIES의 `items` 배열을 빌드 타임에 정렬하거나, 고정 목록 중 더 자주 등장하는 재료를 앞에 오도록 조정한다.

**예상 공수**: 2시간

---

## 4. 태스크 요약 및 실행 계획

### 즉시 시작 (이번 스프린트)

| 태스크 ID | 항목 | 파일 수정 | 예상 공수 |
|-----------|------|-----------|-----------|
| M-01 | 검색 matchRatio > 0 필터 추가 | `lib/recipes/search.ts` (1개) | 30분 |
| M-03 | 달걀/계란 동의어 검증 + 수정 | `data/ingredients.json` (1개) | 1시간 |
| M-02 | YouTube 임베드 수정 (referrerpolicy + fallback UI) | `app/_components/YouTubeEmbed.tsx` (1개) | 2시간 |
| S-03 | 재료 선택 화면 안내 문구 | `app/page.tsx` (1개) | 30분 |
| S-01 | FOUC 해결 (테마 초기화 스크립트) | `app/layout.tsx` (1개) | 1시간 |

**총 1차 공수**: 약 5시간

### 다음 스프린트

| 태스크 ID | 항목 | 파일 수정 | 예상 공수 |
|-----------|------|-----------|-----------|
| S-02 | PC 2패널 레이아웃 | `app/page.tsx` (1개) | 3시간 |
| C-01 | 조리 단계 시간 정보 추가 (방법 A) | `data/recipes.json` (1개, 데이터 작업) | 4시간 |
| C-02 | 재료 인기순 정렬 유틸 | `lib/ingredients/popularity.ts` (신규), `app/page.tsx` (1개) | 2시간 |

**총 2차 공수**: 약 9시간

---

## 5. task.md 신규 태스크 정의

아래 항목들을 `docs/task.md`에 추가한다.

```markdown
## Phase 5: 폴리싱 (피드백 반영 추가 태스크)

### 5-6. 검색 정확도 개선 (FB-01, FB-04)

| # | 태스크 | 담당 | 상태 | 비고 |
|---|--------|------|------|------|
| 95 | matchRatio > 0 필터 추가 (`lib/recipes/search.ts`) | fullstack | TODO | M-01 |
| 96 | getCuisineCounts에도 동일 필터 적용 | fullstack | TODO | M-01 |
| 97 | 달걀/계란 동의어 매핑 검증 (`data/ingredients.json`) | fullstack | TODO | M-03 |
| 98 | 검색 시나리오 재검증 (삼겹살, 계란, 달걀) | fullstack | TODO | M-01+M-03 |

### 5-7. YouTube 임베드 수정 (FB-06)

| # | 태스크 | 담당 | 상태 | 비고 |
|---|--------|------|------|------|
| 99 | youtubeUrl 유효성 일괄 확인 (65개) | fullstack | TODO | M-02 |
| 100 | YouTubeEmbed.tsx — referrerpolicy 추가 | fullstack | TODO | M-02 |
| 101 | YouTubeEmbed.tsx — 썸네일 → iframe 전환 패턴 구현 | fullstack | TODO | M-02 |

### 5-8. 테마/라이트모드 수정 (FB-02)

| # | 태스크 | 담당 | 상태 | 비고 |
|---|--------|------|------|------|
| 102 | layout.tsx — 테마 초기화 인라인 스크립트 추가 (FOUC 제거) | fullstack | TODO | S-01 |
| 103 | layout.tsx — suppressHydrationWarning 추가 | fullstack | TODO | S-01 |

### 5-9. UX 개선 (FB-03, FB-05)

| # | 태스크 | 담당 | 상태 | 비고 |
|---|--------|------|------|------|
| 104 | page.tsx — Step 1 재료 버튼 안내 문구 추가 | fullstack | TODO | S-03 |
| 105 | page.tsx — PC 2패널 레이아웃 (아코디언 펼침) | fullstack | TODO | S-02 |
| 106 | page.tsx — Step 3 max-w-lg → lg:max-w-5xl 확장 | fullstack | TODO | S-02 선행 조건 |

### 5-10. 데이터 개선 (FB-07)

| # | 태스크 | 담당 | 상태 | 비고 |
|---|--------|------|------|------|
| 107 | recipes.json — steps에 조리 시간 표기 추가 (65개) | fullstack | TODO | C-01, 방법 A |
```

---

## 6. 미결 질문 (개발 착수 전 확인 필요)

| # | 질문 | 중요도 | 결정 필요 시점 |
|---|------|--------|----------------|
| Q-01 | PC 2패널 레이아웃에서 "한 번에 하나만 열기" 옵션을 추가할 것인가? 현재 여러 개 동시에 열림. | 중 | S-02 작업 전 |
| Q-02 | 조리 단계 시간 정보 추가 시 방법 A(텍스트 포함)와 방법 B(스키마 변경) 중 어느 것을 선택할 것인가? | 중 | C-01 작업 전 |
| Q-03 | matchRatio 최솟값을 `> 0`으로 할 것인가, `>= 0.1` 등 더 높게 설정할 것인가? 재료 1개 선택 시 결과 수에 영향 있음. | 높 | M-01 작업 전 |
| Q-04 | YouTube 임베드 썸네일 → 클릭 재생 패턴 적용 시, 썸네일 없는 레시피는 어떻게 처리할 것인가? | 낮 | M-02 작업 시 |

---

*이 문서는 피드백 수렴 시점의 코드 상태를 기준으로 작성되었다. 코드 변경 후 본 문서의 "현재 코드" 섹션은 자동으로 구식이 된다. 개선 이후 새로운 피드백이 있으면 별도 iteration 문서로 관리한다.*
