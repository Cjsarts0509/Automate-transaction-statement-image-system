# 거래명세서 이미지시스템 자동화

교보 북 스캐너 시스템(`iscan.kyobobook.co.kr`) 자동 로그인 + 거래명세서 이미지(PDF/PNG/JPG)를 DataMatrix 바코드와 함께 PNG로 변환·저장하는 사내 업무 도구입니다.

## 구성

- **React 컨트롤 패널** (`src/app`): 사번/비밀번호 입력, 파일 업로드, PNG 변환·바코드 삽입, IE 자동 로그인 트리거
- **VBS 런처 + 커스텀 프로토콜**: `kyoboscan://` 프로토콜을 통해 IE를 띄우고 폼을 자동으로 채워 로그인. `[IE 모드 초기 설정]` 패널에서 `ie-setup.zip`을 다운로드하여 1회만 설치합니다.

## 사용 방법

1. **초기 설정 (최초 1회)**
   - 좌측 패널에서 `ie-setup.zip` 다운로드 → 압축 해제 → `install.bat` 더블클릭

2. **일상 사용**
   - 사번 5자리 + 비밀번호 입력
   - 스캔 모드 선택(문구/음반 또는 해외문구) 및 필수 정보 입력
   - 파일 업로드(드래그·클릭·`Ctrl+V` 모두 지원)
     - `Win+Shift+S` 캡쳐 후 Ctrl+V
     - 웹 이미지 우클릭 → "이미지 복사" 후 Ctrl+V
     - 웹 이미지 우클릭 → "이미지 주소 복사" 후 Ctrl+V (CORS 허용 시)
   - **파일 저장**: PNG 변환 + DataMatrix 바코드 자동 삽입 후 폴더 저장
   - **IE 자동 로그인**: `kyoboscan://` 프로토콜로 IE 자동 실행 + 로그인

## 개발

```bash
npm install
npm run dev        # 개발 서버 (http://localhost:5173)
npm run build      # 프로덕션 빌드 → dist/
npm run typecheck  # TypeScript 타입 체크
```

`main` 브랜치 푸시 시 GitHub Pages에 자동 배포됩니다 (`.github/workflows/deploy.yml`).

## 보안 메모

- 비밀번호는 커스텀 프로토콜 URL에 임시로 포함되어 VBS 런처에 전달됩니다. 입력값은 별도로 저장되지 않습니다.
- 사내 자동화 한정 도구이며 외부 배포 금지입니다.
