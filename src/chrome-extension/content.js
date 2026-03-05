// content.js
// This script runs on http://iscan.kyobobook.co.kr/*

console.log("Kyobo Scanner Extension Active");

function autoLogin() {
  const urlParams = new URLSearchParams(window.location.search);
  
  // 1. URL에서 파라미터 추출 (최초 접속 시점)
  // App.tsx에서 전달한 파라미터: ?id=...&pw=...
  const urlId = urlParams.get('id');
  const urlPw = urlParams.get('pw');

  // URL에 파라미터가 있다면 (최초 진입 시) 브라우저 SessionStorage에 백업합니다.
  // 이렇게 해두면 IE 모드로 전환되면서 페이지가 강제 새로고침되어도 값이 유지됩니다.
  if (urlId && urlPw) {
    console.log("URL 파라미터 확인됨. SessionStorage에 임시 저장합니다.");
    sessionStorage.setItem('kyobo_scan_auto_id', urlId);
    sessionStorage.setItem('kyobo_scan_auto_pw', urlPw);
  }

  // 2. SessionStorage에서 ID/PW 읽어오기 (재로딩 후 진입 시점)
  const storedId = sessionStorage.getItem('kyobo_scan_auto_id');
  const storedPw = sessionStorage.getItem('kyobo_scan_auto_pw');

  // 저장된 값이 있다면 자동 로그인 절차를 진행합니다.
  if (storedId && storedPw) {
    console.log("저장된 자동 로그인 정보 발견. 로그인 폼 렌더링을 대기합니다...");
    
    let attempts = 0;
    const maxAttempts = 50; // 최대 50번 확인 (약 10초 대기)
    
    // 3. 페이지 렌더링 지연을 대비하여 0.2초마다 폼 요소가 있는지 반복 확인(Polling)
    const intervalId = setInterval(() => {
      attempts++;
      
      const idField = document.getElementById('username');
      const pwField = document.getElementById('password');
      const loginBtn = document.getElementById('authUser');

      // 로그인 폼 요소들이 DOM에 완전히 나타났을 때
      if (idField && pwField && loginBtn) {
        clearInterval(intervalId); // 반복 확인 중지
        console.log("로그인 폼 발견 완료! 자동 입력을 시작합니다.");
        
        idField.value = storedId;
        pwField.value = storedPw;
        
        // React/Vue 등 최신 프레임워크나 내부 자바스크립트가 값 변경을 인식하도록 이벤트 강제 발생
        idField.dispatchEvent(new Event('input', { bubbles: true }));
        idField.dispatchEvent(new Event('change', { bubbles: true }));
        pwField.dispatchEvent(new Event('input', { bubbles: true }));
        pwField.dispatchEvent(new Event('change', { bubbles: true }));

        // 로그인 무한 루프 방지 및 보안을 위해 클릭 직전에 SessionStorage 비우기
        sessionStorage.removeItem('kyobo_scan_auto_id');
        sessionStorage.removeItem('kyobo_scan_auto_pw');

        // 입력값이 화면에 반영될 수 있도록 아주 짧게 대기 후 로그인 버튼 클릭
        setTimeout(() => {
            loginBtn.click();
            console.log("로그인 버튼 클릭 완료");
        }, 800);
        
      } else if (attempts >= maxAttempts) {
        // 지정된 시간(10초)이 지나도 폼이 안 나타나면 중단 (무한 루프 방지)
        clearInterval(intervalId);
        console.error("로그인 폼을 찾을 수 없습니다. (타임아웃)");
        sessionStorage.removeItem('kyobo_scan_auto_id');
        sessionStorage.removeItem('kyobo_scan_auto_pw');
      }
    }, 200); // 200ms(0.2초) 마다 실행
  }
}

// 스크립트 실행 타이밍 처리
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoLogin);
} else {
    autoLogin();
}