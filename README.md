# mulsim

`mulsim`은 사고 싶은 물건을 바로 사지 않고, 내 방과 생활에 들여도 되는지 살펴보는 정적 웹앱입니다.

화면 로고는 `들일까`, 부제는 `물건입주심사`로 표시됩니다.

## 실행

```bash
npm install
npm run dev
```

브라우저에서 Vite가 출력한 로컬 주소로 접속합니다.

## 빌드

```bash
npm run build
```

빌드 결과는 `dist/`에 생성됩니다.

## 저장 방식

- 물건 정보, 상태, 필요사유, 자리확인, 입주조건, 사후관리, 방 배치 좌표는 `localStorage`에 저장합니다.
- 직접 업로드한 이미지는 브라우저 `IndexedDB`에 저장합니다.
- 서버, 로그인, 유료 API, 앱 내부 AI 기능은 사용하지 않습니다.

## 배포

### Vercel

1. GitHub 저장소에 올립니다.
2. Vercel에서 해당 저장소를 Import 합니다.
3. Framework Preset은 `Vite`, Build Command는 `npm run build`, Output Directory는 `dist`를 사용합니다.

### GitHub Pages

저장소 루트가 이 프로젝트라면 `npm run build` 후 `dist/`를 Pages 배포 대상으로 설정합니다.
저장소 하위 경로에 배포할 경우 `vite.config.ts`의 `base` 값을 Pages 경로에 맞게 추가합니다.
