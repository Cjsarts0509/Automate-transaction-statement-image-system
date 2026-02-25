// content.js
// This script runs on http://iscan.kyobobook.co.kr/*

console.log("Kyobo Scanner Extension Active");

function autoLogin() {
  const urlParams = new URLSearchParams(window.location.search);
  const shouldAutoLogin = urlParams.get('auto_login');

  if (shouldAutoLogin === 'true') {
    const id = urlParams.get('id');
    const pw = urlParams.get('pw');

    if (id && pw) {
      console.log("Attempting auto-login...");
      
      const idField = document.getElementById('username');
      const pwField = document.getElementById('password');
      const loginBtn = document.getElementById('authUser');

      if (idField && pwField && loginBtn) {
        idField.value = id;
        pwField.value = pw;
        
        // Dispatch events to ensure frameworks pick up the change
        idField.dispatchEvent(new Event('input', { bubbles: true }));
        idField.dispatchEvent(new Event('change', { bubbles: true }));
        pwField.dispatchEvent(new Event('input', { bubbles: true }));
        pwField.dispatchEvent(new Event('change', { bubbles: true }));

        setTimeout(() => {
            loginBtn.click();
            console.log("Login button clicked");
        }, 800);
      } else {
        console.error("Login fields not found on this page.");
      }
    }
  }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoLogin);
} else {
    autoLogin();
}
