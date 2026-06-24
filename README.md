# Inventory — Frontend

> 외식업 재고·매출 운영 자동화 플랫폼 "인벤토리"의 프론트엔드 레포지토리
📖 **전체 프로젝트 문서 / 백엔드**: [Inventory-BE](https://github.com/yerincho94/Inventory-BE)

<br/>

## 기술 스택

![React](https://img.shields.io/badge/React%2018-61DAFB?style=flat-square&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)
![Axios](https://img.shields.io/badge/Axios-5A29E4?style=flat-square&logo=axios&logoColor=white)

<br/>

## 주요 화면

- **실시간 매출 대시보드** — 30초 폴링 기반 실시간 매출, 시간대별 추이 차트
  <img width="786" height="620" alt="image" src="https://github.com/user-attachments/assets/5f7780a7-24e6-4f94-a95b-f2e4a1f3c816" />

- **매출 분석** — 피크타임 히트맵, 메뉴 랭킹, 전월 대비 성장률 시각화
- 기준 정보 / 입고 / 재고 / 주문 / 리포트 관리 화면
  <img width="786" height="620" alt="image" src="https://github.com/user-attachments/assets/c2978040-7083-4ef6-a546-505d81117f32" />

<br/>

## 로컬 실행 방법
## Local Run

### 사전 준비

- Node.js 18+ 설치

---

### Run

```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev
```

개발 서버 실행 후 아래 URL로 접속할 수 있습니다.

| Service | URL |
|---------|-----|
| Web App | http://localhost:5173 |

---

### Build

```bash
npm run build
```

빌드 결과물은 `dist/` 폴더에 생성됩니다.

---

## With Docker (BE 연동)

백엔드와 함께 실행하려면 BE 레포에서 Docker Compose를 사용하세요.

```
Workspace/
├── AIBE4_FinalProject_Team1_BE
└── AIBE4_FinalProject_Team1_FE
```

```bash
# BE 레포에서 실행
cd ../AIBE4_FinalProject_Team1_BE
docker compose up -d --build
```

| Service | URL |
|---------|-----|
| Web App | http://localhost |
| Swagger UI | http://localhost/api/swagger-ui/index.html |

<br/>

## 담당 (조예린)

매출 분석 대시보드 및 실시간 매출(30초 폴링)·시간대별 추이 차트 화면 구현
자세한 백엔드 기여 내용은 [Inventory-BE README](https://github.com/yerincho94/Inventory-BE)를 참고해 주세요.
