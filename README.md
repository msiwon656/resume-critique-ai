# 이력서 + 포트폴리오 첨삭 AI (Resume Critique AI)

## 프로젝트 개요

취업 준비생을 위해, 이력서를 등록하면 AI가 채용 담당자 관점에서 첨삭 피드백을 제공하는 풀스택 웹 애플리케이션.
회원가입/로그인 기반의 개인화된 서비스로 설계했으며, 추후 GitHub 포트폴리오 분석 기능까지 확장할 예정이다.

- **기간**: 2026년 7월 ~ (진행 중)
- **저장소**: https://github.com/msiwon656/resume-critique-ai
- **배포**: (배포 시 링크 추가 예정)

---

## 기술 스택

| 영역 | 기술 |
|---|---|
| 프론트엔드 | React (Vite) |
| 백엔드 | Node.js, Express (ESM) |
| DB | PostgreSQL |
| ORM | Prisma 7 |
| AI | Claude API (Anthropic, `@anthropic-ai/sdk`) |
| 인증 | JWT (jsonwebtoken), bcryptjs |
| 개발 도구 | VS Code, Postman, TablePlus |

---

## 주요 기능

- 회원가입 / 로그인 (JWT 기반 인증, bcrypt 비밀번호 암호화)
- 이력서 등록 및 AI 첨삭 (Claude API 연동)
- 첨삭 결과 DB 저장 (원문/수정문/이유가 구조화된 JSON 형태)
- 로그인한 사용자만 접근 가능한 이력서 관리 API (JWT 미들웨어 인증)
- **개발 단계 비용 절감 설계**: `USE_MOCK_AI` 환경변수로 실제 API 호출 여부를 스위치. 개발 중에는 mock 함수로 로직을 검증하고, 실제 배포 시점에만 Claude API를 호출하도록 구조화하여 불필요한 API 비용 발생을 방지함

---

## 아키텍처

```
React (localhost:5173)
    ↓ fetch (REST API, JWT 토큰 포함)
Express (localhost:3001)
    ↓ Prisma Client (Driver Adapter 방식)
PostgreSQL (localhost:5432)
    ↓
Claude API (Anthropic) — 이력서 첨삭 생성
```

### API 엔드포인트

| 메소드 | 경로 | 인증 필요 | 설명 |
|---|---|---|---|
| POST | `/auth/signup` | X | 회원가입 |
| POST | `/auth/login` | X | 로그인, JWT 토큰 발급 |
| POST | `/resumes/critique` | O | 이력서 첨삭 요청 + DB 저장 |
| GET | `/resumes` | O | 내 이력서 목록 조회 |

### DB 스키마

```prisma
model User {
  id        Int      @id @default(autoincrement())
  email     String   @unique
  password  String
  name      String?
  createdAt DateTime @default(now())
  resumes   Resume[]
}

model Resume {
  id        Int      @id @default(autoincrement())
  userId    Int
  user      User     @relation(fields: [userId], references: [id])
  title     String
  content   String
  feedback  String?
  version   Int      @default(1)
  createdAt DateTime @default(now())
}
```

---

## 핵심 설계 포인트

### 1. 프롬프트를 통한 구조화된 응답 강제

AI 응답을 프론트에서 다루기 쉽도록, 시스템 프롬프트에서 반드시 아래 JSON 형식으로만 답하도록 강제함.

```json
{
  "overallFeedback": "전체적인 총평",
  "suggestions": [
    { "original": "원문 문장", "revised": "수정 제안 문장", "reason": "수정 이유" }
  ]
}
```

이를 통해 AI 응답을 그대로 파싱해서 화면에 렌더링할 수 있도록 설계함.

### 2. Mock/Real 전환 가능한 AI 클라이언트 구조

```javascript
export async function critiqueResume(content) {
  const useMock = process.env.USE_MOCK_AI === 'true';
  return useMock ? mockCritique(content) : realCritique(content);
}
```

개발 단계에서는 `.env`의 `USE_MOCK_AI=true`로 설정해 실제 API 호출 없이 전체 기능(라우팅, DB 저장, 인증 흐름)을 검증하고, 실제 AI 응답이 필요한 시점에만 값을 `false`로 바꿔 전환하는 구조. 불필요한 API 비용 발생을 원천 차단하면서 개발 생산성을 유지함.

### 3. JWT 인증 미들웨어

```javascript
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: '토큰이 없습니다.' });
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (err) {
    res.status(401).json({ error: '유효하지 않은 토큰입니다.' });
  }
}
```

`Authorization: Bearer <token>` 헤더를 검증해, 로그인한 사용자만 이력서 첨삭/조회 API에 접근 가능하도록 구현.

---

## 트러블슈팅

지출관리 프로젝트에서 Prisma 7 이슈를 미리 겪었기 때문에, 이번 프로젝트는 초기 세팅 단계에서 해당 이슈들(datasource url 분리, ESM 전환, Driver Adapter 필수화)을 처음부터 반영해서 시작함. 대신 이번 프로젝트에서는 다음과 같은 새로운 이슈들을 겪음.

### 1. bcrypt 네이티브 바이너리 호환성 문제

**문제**: `bcrypt` 패키지 설치 후 회원가입 API 호출 시 `publicDecrypt is not defined` 에러 발생.

**원인**: `bcrypt`는 C++로 컴파일된 네이티브 바이너리를 사용하는데, 최신 Node.js 버전(v26.5.0)과의 호환성 문제로 추정됨.

**해결**: 순수 JavaScript로 구현된 `bcryptjs` 패키지로 교체. API(`hash`, `compare`)가 동일해 코드 변경은 최소화됨.

```javascript
// 변경 전
import bcrypt from 'bcrypt';
// 변경 후
import bcrypt from 'bcryptjs';
```

### 2. 코드 오타로 인한 잘못된 에러 메시지

**문제**: 위 1번과 동일한 에러 메시지(`publicDecrypt is not defined`)가 `bcryptjs`로 교체한 후에도 계속 발생.

**원인**: 실제 원인은 패키지 문제가 아니라, 코드 작성 중 `bcrypt.hash(password, 10)`을 `publicDecrypt.hah(password, 10)`로 잘못 입력한 오타였음.

**교훈**: 동일한 에러 메시지가 반복될 때는 이전 조치가 문제를 해결하지 못한 것인지, 아니면 전혀 다른 원인(단순 오타 등)인지 구분하기 위해 실제 코드를 한 줄씩 재확인하는 과정이 필요함을 체감함.

### 3. Vite 프로젝트 생성 시 오타로 인한 잘못된 폴더 생성

**문제**: `npm create vite@latest frontend -- --template react` 명령어에서 `frontend`를 `fronted`로 오타 입력해, 의도한 위치가 아닌 다른 폴더에 프로젝트가 생성됨. 이후 `src` 폴더 안에 `App.jsx` 없이 `main.ts`, `counter.ts` 등 Vanilla 템플릿 파일만 존재하는 문제로 이어짐 (원인이 다른 곳에 있었음에도 증상만 보고 템플릿 선택 문제로 오인해 삭제 후 재생성을 반복함).

**교훈**: 명령어 실행 결과가 예상과 다를 때는 실행한 명령어 자체를 한 글자씩 재확인하는 것이 문제 해결의 첫 단계가 되어야 함.

### 4. rm -rf 이후 터미널 working directory 유실

**문제**: `rm -rf frontend`로 폴더를 삭제한 뒤 재생성하는 과정에서, 터미널이 이미 삭제된 디렉토리를 현재 위치로 계속 참조해 `npm run dev` 실행 시 `ENOENT: uv_cwd` 에러 발생.

**해결**: `cd ~`로 홈 디렉토리로 나갔다가 정확한 경로로 다시 진입해 터미널 상태를 초기화.

### 5. Authorization 헤더 형식 누락

**문제**: JWT 인증이 필요한 API 호출 시 계속 401 에러 발생.

**원인**: `Authorization` 헤더 값에 `Bearer ` 접두어 없이 토큰 값만 입력함. 서버 코드가 `authHeader.split(' ')[1]`로 토큰을 추출하는 구조라, `Bearer ` 없이는 정상적으로 파싱되지 않음.

**해결**: 헤더 값을 `Bearer <토큰>` 형식으로 정정.

### 6. API 비용 문제 사전 방지

**문제 인식**: Claude API는 선불 크레딧제이며, 신규 계정에 크레딧이 없을 경우 `Your credit balance is too low` 에러가 발생함을 확인.

**대응**: 실제 배포 전 개발/테스트 단계에서는 비용이 전혀 발생하지 않도록, mock 함수로 AI 응답을 흉내 내는 구조를 설계해 적용함 (위 "핵심 설계 포인트" 참고).

---

## 배운 점

- JWT 기반 인증 흐름(로그인 → 토큰 발급 → 이후 요청에 토큰 첨부 → 서버 미들웨어 검증)을 처음부터 끝까지 직접 구현해봄.
- 외부 유료 API(Claude API)를 프로젝트에 안전하게 통합하는 방법(선불 크레딧 구조 이해, 비용 상한 설정, mock 전환 가능한 설계)을 고민하고 적용함.
- 동일한 에러 메시지라도 원인이 매번 같지 않을 수 있다는 것을 경험하며, 에러 메시지에 의존하기보다 실제 코드와 요청/응답을 직접 확인하는 디버깅 습관의 중요성을 체감함.

---

## 향후 개선 계획

- [ ] 프론트엔드에 이력서 입력 화면 + 첨삭 결과(Before/After) 화면 구현
- [ ] 이력서 히스토리/버전 비교 기능
- [ ] GitHub 저장소 연동 및 포트폴리오(README, 커밋 히스토리) 분석 기능 추가
- [ ] PDF 이력서 업로드 및 텍스트 추출 기능
- [ ] 직무별 맞춤 첨삭 기준 적용 (예: 백엔드/프론트엔드/디자이너 등)
- [ ] 실제 Claude API 연동 전환 (`USE_MOCK_AI=false`) 및 프롬프트 품질 개선
- [ ] 배포 (Vercel + Render)
- [ ] UI/UX 개선

---

## 스크린샷

*(추후 실제 화면 캡처 이미지 추가 예정)*
