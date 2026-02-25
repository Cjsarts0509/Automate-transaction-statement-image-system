export const MANIFEST_JSON = `{
  "manifest_version": 3,
  "name": "Kyobo Scan Auto Login",
  "version": "1.0",
  "permissions": [
    "scripting",
    "activeTab"
  ],
  "host_permissions": [
    "http://iscan.kyobobook.co.kr/*"
  ],
  "content_scripts": [
    {
      "matches": ["http://iscan.kyobobook.co.kr/kbb/intro*"],
      "js": ["content.js"],
      "run_at": "document_idle"
    }
  ],
  "externally_connectable": {
    "matches": ["*://localhost/*", "https://*.figma.com/*"] 
  }
}`;

export const CONTENT_JS = `// Kyobo Scan Auto Login Content Script

console.log("Kyobo Auto Login Extension Active");

// Listen for messages from the React App
window.addEventListener("message", (event) => {
  // Security check: You might want to verify event.origin in a real production app
  // if (event.origin !== "http://localhost:5173") return;

  if (event.data.type === "LOGIN_DATA") {
    console.log("Received login data");
    const { username, password } = event.data;
    performLogin(username, password);
  }
});

function performLogin(username, password) {
  try {
    const idInput = document.getElementById("username");
    const pwInput = document.getElementById("password");
    const loginBtn = document.getElementById("authUser");

    if (idInput && pwInput && loginBtn) {
      // Set values directly
      idInput.value = username;
      pwInput.value = password;

      // Trigger events to ensure JS frameworks (if any) detect the change
      idInput.dispatchEvent(new Event('input', { bubbles: true }));
      pwInput.dispatchEvent(new Event('input', { bubbles: true }));

      // Click the login button
      console.log("Clicking login button...");
      loginBtn.click();
    } else {
      console.error("Login elements not found!");
      alert("Error: Login elements not found on this page.");
    }
  } catch (error) {
    console.error("Login failed:", error);
  }
}
`;
