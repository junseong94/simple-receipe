# Simple Recipe

내 냉장고 재료로 만들 수 있는 레시피를 찾아주는 서비스.

## 핵심 기능

- **재료 기반 검색**: 가진 재료를 입력하면 추가 구매 없이(또는 최소 1~3개로) 만들 수 있는 요리 추천
- **4개 요리 카테고리**: 한식 / 중식 / 일식 / 양식
- **YouTube 영상 + 텍스트 요약**: 각 레시피에 유튜브 영상 링크와 조리법 요약 제공
- **사용자 레시피 등록**: 로그인 없이 닉네임+비밀번호로 레시피 등록/수정/삭제

## 기술 스택

- **Framework**: Next.js 16 (App Router)
- **UI**: React 19 + Tailwind CSS 4
- **Language**: TypeScript (strict)
- **Database**: Supabase (PostgreSQL) — 사용자 등록 레시피
- **Deployment**: Vercel (Hobby Plan, 무료)

## 시작하기

```bash
npm install
npm run dev
```

http://localhost:3000 에서 확인할 수 있습니다.

## 프로젝트 문서

- [PRD (기획서)](docs/prd.md)
- [기술 명세서](docs/specification.md)
- [구현 계획서](docs/plan.md)
- [태스크 목록](docs/task.md)
