# 📅 SKHY Timetable Studio (`skhy_project`)

구글 스프레드시트(`timetable`)의 데이터를 가져와 직관적이고 미려한 타임라인 그리드로 시각화하고, 드래그 앤 드롭 및 모달을 통해 각 개인별 시간표를 수정한 후 타겟 스프레드시트(`timetable_fixed`)로 동기화하는 웹 애플리케이션입니다.

---

## 🌟 주요 기능

1. **대형 날짜 배너 및 09:00 시간 체계**:
   - 상단에 `2026년 10월 01일 (목)` 형태로 현재 날짜를 크고 선명하게 표시.
   - 모든 시간표는 `09:00` (HH:mm) 표준 규격으로 일관성 있게 관리.
2. **다중 시트 (개인별 탭) 관리**:
   - 구글 시트의 개별 시트를 개인별 탭(`👤 홍길동`, `👤 김철수`, `👤 이영희` 등)으로 시각화.
   - 각 개인별 일정 개수 및 `수정 중(Draft) 🟡` / `수정 완료(Completed) 🟢` 상태 뱃지 제공.
3. **개인별 시간표 수정 완료 (확정) 기능**:
   - 각 개인마다 검토가 끝나면 **[ ✓ {이름} 님 수정 완료 (확정) ]** 버튼을 눌러 상태 확정.
4. **인터랙티브 타임라인 그리드 (08:00 ~ 22:00)**:
   - **드래그 이동**: 마우스로 블록을 잡고 위아래로 끌어 시작/종료 시간을 동시에 이동 (15분 스냅).
   - **리사이징**: 카드 상단/하단 핸들을 당겨 시작 시간이나 종료 시간을 직관적으로 늘리고 줄임.
   - **오버랩 자동 정렬**: 동일 시간대에 겹치는 일정이 있을 경우 나란히(Side-by-Side) 분할 배치.
   - **빈 슬롯 클릭 생성**: 비어 있는 시간 영역을 클릭하면 해당 시간대가 자동으로 입력된 새 일정 생성창 오픈.
5. **스프레드시트 테이블 뷰 지원**:
   - 타임라인 그리드뿐 아니라 전통적인 표(Table) 형태로도 언제든 전환하여 검토 및 수정 가능.
6. **타겟 구글 시트(`timetable_fixed`)로의 일괄 저장**:
   - `start_time`, `end_time`, `task`, `summary`, `etc` 컬럼 규격에 맞춰 각 시트별로 안전하게 덮어쓰기 저장.
7. **오프라인 Mock / 디버깅 모드 완비**:
   - 구글 계정 설정 전에도 즉시 로컬에서 테스트할 수 있도록 샘플 데이터와 로컬 스토리지 캐시 내장.

---

## 🚀 1. 로컬에서 즉시 확인하는 방법

별도의 서버 설치 없이 브라우저에서 바로 열 수 있습니다:

### 방법 1: 직접 열기
- `index.html` 파일을 더블 클릭하여 크롬/엣지 등의 브라우저에서 실행합니다.

### 방법 2: 로컬 웹 서버 실행 (권장)
터미널(PowerShell)에서 아래 명령어를 실행하면 `http://localhost:3000`에서 확인할 수 있습니다:
```bash
python -m http.server 3000
```

---

## 🔗 2. Google Apps Script 1분 연동 방법 (방식 A)

실제 구글 스프레드시트와 데이터를 주고받으려면 다음 단계를 한 번만 진행해주시면 됩니다.

1. **Apps Script 에디터 열기**:
   - [timetable 구글 시트](https://docs.google.com/spreadsheets/d/1rRunNn1fnbEjfLgh7FFwphGVwmdvCQY-Fd1wvmlnzdc/edit?gid=0#gid=0)에 접속합니다.
   - 상단 메뉴의 **확장 프로그램** > **Apps Script**를 클릭합니다.
2. **코드 복사 & 붙여넣기**:
   - 프로젝트 내 [`google-apps-script/Code.gs`](file:///c:/Users/Han/Desktop/1st/google-apps-script/Code.gs) 파일의 전체 내용을 복사하여 Apps Script 편집창에 붙여넣고 저장(`Ctrl + S`)합니다.
3. **웹 앱(Web App)으로 배포**:
   - 우측 상단 파란색 **[배포]** 버튼 > **[새 배포]** 클릭.
   - 유형 선택 (톱니바퀴): **웹 앱 (Web app)** 선택.
   - **다음 사용자 권한으로 실행**: `나(본인 계정)`
   - **액세스 권한이 있는 사용자**: **`모든 사용자 (Anyone)`** (★ 중요!)
   - **[배포]** 클릭 후 구글 계정 접근 권한 승인을 완료합니다.
4. **웹 앱 URL 등록 및 샘플 데이터 생성**:
   - 생성된 **웹 앱 URL (`https://script.google.com/macros/s/.../exec`)**을 복사합니다.
   - 로컬 웹페이지 우측 상단의 **[⚙️ Google 연동 설정]** 버튼을 클릭하여 URL을 붙여넣고 저장합니다.
   - 설정 창의 **[✨ 빈 timetable 구글 시트에 샘플 데이터 자동 생성하기]** 버튼을 누르면 원본 구글 시트에 `홍길동`, `김철수`, `이영희` 시트와 샘플 일정이 즉시 채워집니다!

---

## 🌐 3. GitHub 레포지토리 (`skhy_project`) 배포 가이드

로컬에서 확인이 끝난 후 GitHub에 업로드하고 GitHub Pages로 무료 호스팅 배포하는 절차입니다:

```bash
# 1. 변경사항 커밋
git add .
git commit -m "feat: SKHY Timetable Studio 초기 릴리즈"

# 2. GitHub 원격 저장소 연결 (GitHub에서 'skhy_project' 레포 생성 후 실행)
git remote add origin https://github.com/Han/skhy_project.git  # 본인 GitHub 계정명으로 변경
git branch -M main
git push -u origin main
```

### GitHub Pages 배포 설정 (30초 소요):
1. GitHub의 `skhy_project` 레포지토리 페이지로 이동합니다.
2. **Settings** > **Pages** 메뉴로 이동합니다.
3. **Build and deployment** > **Branch**에서 `main` 브랜치를 선택하고 `/ (root)`를 지정한 뒤 **Save**를 누릅니다.
4. 잠시 후 `https://<계정명>.github.io/skhy_project/` 주소로 전 세계 어디서나 접속할 수 있는 웹 페이지가 배포됩니다!

---

## 📂 파일 구조

```
skhy_project/
├── index.html                 # 메인 웹 페이지 (시간표 뷰어 & 에디터)
├── css/
│   └── style.css              # Pretendard 폰트, 커스텀 스크롤바, 리사이즈 핸들 스타일
├── js/
│   ├── app.js                 # 메인 애플리케이션 상태 컨트롤러 (탭, 통계, 모달)
│   ├── timetable-grid.js      # 시간표 렌더링, 오버랩 계산, 드래그/리사이징 엔진
│   ├── mock-data.js           # 오프라인/디버깅용 샘플 데이터 및 컬러 팔레트
│   └── sheets-api.js          # Google Apps Script Web App 연동 및 로컬 캐시 모듈
├── google-apps-script/
│   └── Code.gs                # 구글 스프레드시트에 등록할 Apps Script 소스
├── .gitignore
└── README.md
```
