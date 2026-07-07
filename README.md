# QuoteGuard - 영업 견적 자동화 및 리스크 검토 기반 승인 관리 시스템

## 프로젝트 소개

**QuoteGuard**는 B2B 영업 견적 작성, 계산, 리스크 검토를 자동화하여 효율적으로 견적서 작성이 가능하고 보조 AI 리스크 분석 기반으로 관리자가 더 정확한 승인 판단을 내릴 수 있도록 돕는 플랫폼입니다.

> 프로젝트 기간: 2026.06.10 ~ 2026.07.08

---

## 주요 기능

### 1. 계정·권한·운영관리

- 관리자만 계정 생성 가능, 셀프 회원가입 x (로그인 화면만 제공)
- JWT 로그인/갱신, 초기 비밀번호 설정·비밀번호 재설정
- 역할 기반 접근 제어 (`SUPER_ADMIN` / `SALES_MANAGER` / `SALES_STAFF`)
- 관리자 사용자 CRUD, 부서별 통계
- 관리자 대시보드, 인앱 알림 (SSE)

### 2. 견적 작성

- 견적 CRUD, 견적 임시 저장, 만료된 견적 재작성
- 전에 작성한 견적 내용을 복사 후 재작성 가능
- 품목별 할인·VAT·이익률 등 **미리보기** 자동 계산
- 작성 중 내용을 `sessionStorage`에 자동 저장·복원
- 할인 정책 경고·할인 사유 입력 UX (최종 검증은 백엔드)
- 작성한 견적 내용 바탕으로 내부 견적 분석 (원가·이익·정책 대비·승인 요청)
- 고객 등록 및 검색, 기존 고객 정보 자동 입력

### 3. 승인

- 작성완료 후 승인 필요 여부 표시 (할인 초과 / 저이익 / 고액)
- 영업사원: 내 승인 요청 현황
- 관리자: 승인 대기·상세·승인/반려·재요청
- AI 리스크 요약 표시

### 4. 제품 및 할인 정책 관리

- 제품 검색·상세 조회, 견적에 바로 추가
- 자주 사용하는 제품은 즐겨찾기로 등록
- 최고관리자: 거래처·제품·카테고리·할인 정책 관리 화면

### 5. 견적 문서 관리 및 발송

- 견적 PDF 미리보기·엑셀 다운로드
- 견적 이메일 발송·발송 이력 확인
- 견적 만료 알림 (인앱)

### 6. 교육(LMS)

- 교육 영상 이수 현황, 가이드 확인
- 관리자 교육 가이드·영상 관리
- 영업 사원, 영업 관리자는 교육 이수 완료 시에만 견적 작성, 승인 검토 가능

### 7. AI 보조 지원

- AI 리스크 요약 (Gemini, 한도 초과 시 Groq fallback)
- AI 상담 메모 요약
- 제안 문구 생성

---

## 팀원 역할 분담

| 이름   | 역할 | 담당                                                              |
| ------ | ---- | ----------------------------------------------------------------- |
| 홍창희 | 팀장 | 계정 관리, 인증/인가, 사용자 통계, CI/CD                          |
| 박재석 | 팀원 | 제품 관리 및 탐색, 할인 정책 관리, 통계 대시보드                  |
| 박삼령 | 팀원 | 견적 계산 및 작성, 내부 분석, 고객 관리, 임시 저장, 교육(LMS)     |
| 신현섭 | 팀원 | 승인/반려 처리, 재요청, SLA 알림 및 견적 리마인더, AI 리스크 요약 |
| 박준호 | 팀원 | 견적서 미리보기, PDF/엑셀 다운로드, 이메일 발송, 알림(SSE)        |
| 장채은 | 팀원 | 상담 메모 요약, 제안 문구 생성                                    |

---

## 기술 스택 (Frontend)

- **React 19**, **Vite 8**
- **React Router 7**
- **axios** (HTTP 클라이언트)
- **Context API** (인증, 교육 이수 상태 등 전역 상태)
- **Tailwind CSS 4** + CSS
- **recharts** (대시보드 차트)
- **xlsx** (견적 엑셀 다운로드)
- ESLint (린트), CodeRabbit (AI 코드 리뷰)

## 시스템 구성 (전체)

| 구분     | 기술                                                                      |
| -------- | ------------------------------------------------------------------------- |
| Frontend | React, Vite, React Router (본 저장소)                                     |
| Backend  | Spring Boot REST API — [back 저장소](https://github.com/QuoteGuards/back) |
| DB       | MySQL (백엔드 `sql/QuoteGuard.sql`)                                       |
| CI/CD    | GitHub Actions, Docker Compose                                            |
| 외부     | AWS S3, SMTP, Gemini API                                                  |

> 견적 금액·승인 최종 판정은 **백엔드** 기준입니다. 프론트는 미리보기·경고·사유 입력 UX를 담당합니다.

---

## 실행 방법 (프론트 / 백엔드 공통)

### 1. 사전 요구 사항

| 항목           | 버전 |
| -------------- | ---- |
| Node.js        | 18+  |
| npm            | 최신 |
| JDK (백엔드)   | 21   |
| MySQL (백엔드) | 8+   |
| Git            | 최신 |

### 2. 저장소 클론

```bash
# 프론트엔드
git clone https://github.com/QuoteGuards/front.git
cd front

# 백엔드 (별도 터미널)
git clone https://github.com/QuoteGuards/back.git
cd back
```

### 3. 프론트엔드 환경 설정

프로젝트 루트에 `.env` 파일 생성

```env
# 백엔드 API Base URL
VITE_API_BASE_URL=http://localhost:8080
```

### 4. 프론트엔드 실행 (프론트 기본 URL: http://localhost:5173)

```bash
npm install
npm run dev
```

### 5. 백엔드 실행 (API 기본 URL: http://localhost:8080)

백엔드 `.env` 설정·실행 방법은 [back README](https://github.com/QuoteGuards/back) 참고

```bash
# Windows
gradlew.bat bootRun

# macOS / Linux
./gradlew bootRun
```

### 6. 접속 확인

1. 백엔드 `http://localhost:8080` 기동 확인
2. 프론트 `npm run dev` 실행
3. 브라우저에서 `http://localhost:5173` 접속 후 로그인

### 스크립트

| 명령어            | 설명               |
| ----------------- | ------------------ |
| `npm run dev`     | 개발 서버          |
| `npm run build`   | 프로덕션 빌드      |
| `npm run preview` | 빌드 결과 미리보기 |
| `npm run lint`    | ESLint 검사        |

---

## 패키지 구조

```
src/
├── api/              # API 호출 (axios 인스턴스, 도메인별 모듈)
├── components/       # 재사용 UI
├── constants/        # 상수
├── contexts/         # 전역 상태
├── hooks/            # 커스텀 훅
├── pages/            # 라우트 단위 페이지
│   ├── quote/        # 견적 작성·목록·상세·내부분석·미리보기
│   ├── approval/     # 승인 요청·관리자 승인
│   ├── training/     # 교육 이수·교육 관리
│   ├── catalog/      # 제품 검색·즐겨찾기
│   ├── dashboard/    # 대시보드
│   └── ...
├── router/           # AppRouter, ProtectedRoute
└── utils/            # quoteItemUtils, excelExport, jwt …
```

---

## 주요 화면 경로

| 경로                        | 역할        | 설명                     |
| --------------------------- | ----------- | ------------------------ |
| `/login`                    | 공통        | 로그인                   |
| `/quotes`                   | 전체        | 견적 목록                |
| `/quotes/new`               | 사원·관리자 | 견적 작성                |
| `/quotes/:quoteId/detail`   | 전체        | 견적 상세                |
| `/quotes/analysis/:quoteId` | 전체        | 내부 견적 분석·승인 요청 |
| `/quotes/:id/preview`       | 전체        | 미리보기·PDF·이메일      |
| `/staff/approval`           | 사원        | 내 승인 요청             |
| `/admin/approval`           | 관리자      | 승인 관리                |
| `/catalog`                  | 사원·관리자 | 제품 검색                |
| `/training`                 | 사원·관리자 | 교육 이수                |
| `/dashboard`                | 관리자      | 대시보드                 |
| `/admin/users`              | 최고관리자  | 사용자 관리              |

---

## API 명세

| 방식            | 링크                                                                                                     |
| --------------- | -------------------------------------------------------------------------------------------------------- |
| Notion API 문서 | [API 명세](https://app.notion.com/p/38325e891fd6800ea3d9d2ade1b37086?v=38325e891fd6804d9628000c1f0def61) |

---

## 아키텍처 개요

![QuoteGuard 기술 아키텍처](./docs/QuoteGuard_architecture.png)

---

## 협업

- 비즈니스 규칙 : https://app.notion.com/p/df525e891fd68231bd8901734511bba2
- 코드 리뷰: CodeRabbit
- 프론트 저장소: https://github.com/QuoteGuards/front
