# Simple Recipe

내 냉장고 재료로 만들 수 있는 레시피를 찾아주는 서비스.

## 핵심 기능

- **3단계 위자드 UI**: 재료 선택 → 카테고리 선택 → 레시피 결과
- **재료 기반 검색**: 가진 재료를 입력하면 누락 재료 3개 이하 레시피를 추천
- **4개 요리 카테고리**: 한식 / 중식 / 일식 / 양식
- **YouTube 영상 + 텍스트 요약**: 각 레시피에 아코디언으로 펼치면 영상과 조리법 표시
- **뒤로가기 상태 복원**: URL searchParams에 상태 저장 (`?step=3&ingredients=삼겹살,양파&cuisines=korean`)
- **다크모드**: ThemeToggle + localStorage 연동
- **사용자 레시피 등록** (Supabase): 닉네임+비밀번호로 레시피 등록/수정/삭제

## 기술 스택

- **Framework**: Next.js 16 (App Router)
- **UI**: React 19 + Tailwind CSS 4
- **Language**: TypeScript (strict)
- **Database**: Supabase (PostgreSQL) — 사용자 등록 레시피
- **Deployment**: Vercel (Hobby Plan, 무료)

## 로컬 개발 시작하기

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경변수 설정

```bash
cp .env.local.example .env.local
```

`.env.local`을 열어 Supabase 프로젝트 정보를 입력합니다:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

> Supabase 없이도 앱이 동작합니다. 미설정 시 큐레이션 레시피(65개)만 표시됩니다.

### 3. Supabase 스키마 설정 (선택)

[Supabase Dashboard](https://supabase.com/dashboard) > SQL Editor에서 아래 파일을 실행합니다:

```
supabase/schema.sql
```

### 4. 개발 서버 실행

```bash
npm run dev
```

`http://localhost:3000` 에서 확인할 수 있습니다.

## 빌드 및 배포

### 로컬 프로덕션 빌드 확인

```bash
npm run build
npm start
```

### Vercel + Supabase 배포

**환경 구성:**
- 로컬 개발: Docker PostgreSQL (localhost:5433)
- 운영 배포: Vercel (프론트) + Supabase (DB)

**Supabase 설정:**
1. [Supabase](https://supabase.com)에서 프로젝트 생성
2. SQL Editor에서 `supabase/schema.sql` 실행
3. SQL Editor에서 `scripts/seed.sql` 실행
4. Settings → Database → Connection string (Transaction mode, port 6543) 복사

**Vercel 배포:**
1. [Vercel](https://vercel.com)에 GitHub 저장소를 연결합니다.
2. **Environment Variables** 설정:
   - `DATABASE_URL` = Supabase connection string (`?sslmode=require` 포함)
3. Deploy 버튼을 클릭합니다.

## 프로젝트 문서

- [PRD (기획서)](docs/prd.md)
- [기술 명세서](docs/specification.md)
- [구현 계획서](docs/plan.md)
- [태스크 목록](docs/task.md)
