document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('loginForm');
  const userId = document.getElementById('userId');
  const userPw = document.getElementById('userPw');
  const errorMessage = document.getElementById('errorMessage');
  const errorText = document.getElementById('errorText');
  const loginBtn = document.getElementById('loginBtn');
  const btnText = document.getElementById('btnText');
  const btnSpinner = document.getElementById('btnSpinner');

  if (localStorage.getItem(SYSTEM_CONFIG.STORAGE_KEYS.USER_TOKEN)) {
    window.location.href = "dashboard.html";
  }

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorMessage.classList.add('hidden');
    userId.classList.remove('shake', 'border-[#C23347]');
    userPw.classList.remove('shake', 'border-[#C23347]');
    
    // 버튼 비활성화 방어 (2번 로직)
    loginBtn.disabled = true;
    btnText.innerText = "Authenticating...";
    btnSpinner.classList.remove('hidden');

    try {
      const response = await fetch(SYSTEM_CONFIG.API.BASE_URL, {
        method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, redirect: "follow",
        body: JSON.stringify({
          action: SYSTEM_CONFIG.API.ENDPOINTS.AUTH,
          id: userId.value.trim(),
          pw: userPw.value.trim()
        })
      });

      const responseText = await response.text();
      let result = JSON.parse(responseText);

      if (result.success) {
        // 🌟 JWT 토큰 저장
        localStorage.setItem(SYSTEM_CONFIG.STORAGE_KEYS.USER_TOKEN, result.token);
        localStorage.setItem(SYSTEM_CONFIG.STORAGE_KEYS.ROLE, result.role);
        localStorage.setItem(SYSTEM_CONFIG.STORAGE_KEYS.CLIENT_NAME, result.clientName);
        window.location.href = "dashboard.html";
      } else {
        showError(result.message || "Invalid credentials.");
      }
    } catch (err) {
      console.error(err);
      showError("Connection failed. Please try again.");
    } finally {
      loginBtn.disabled = false;
      btnText.innerText = "Sign In to Portal";
      btnSpinner.classList.add('hidden');
    }
  });

  function showError(msg) {
    errorMessage.classList.remove('hidden');
    errorText.innerText = msg;
    userId.classList.add('shake', 'border-[#C23347]');
    userPw.classList.add('shake', 'border-[#C23347]');
    setTimeout(() => {
      userId.classList.remove('shake');
      userPw.classList.remove('shake');
    }, 400);
  }
});
