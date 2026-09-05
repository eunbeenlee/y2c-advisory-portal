// assets/js/auth.js

document.addEventListener('DOMContentLoaded', () => {
  // 이미 로그인된 상태라면 바로 대시보드로 리다이렉트
  const existingToken = localStorage.getItem(SYSTEM_CONFIG.STORAGE_KEYS.USER_TOKEN);
  if (existingToken) {
    window.location.href = "dashboard.html";
    return;
  }

  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const idInput = document.getElementById('userId');
      const pwInput = document.getElementById('userPw');
      const errorMsg = document.getElementById('errorMessage');
      const submitBtn = document.getElementById('submitBtn');

      if (!idInput.value || !pwInput.value) {
        errorMsg.classList.remove('hidden');
        errorMsg.innerText = "아이디와 비밀번호를 입력해주세요.";
        return;
      }

      errorMsg.classList.add('hidden');
      const originalBtnText = submitBtn.innerHTML;
      submitBtn.disabled = true;
      submitBtn.innerHTML = `<span class="animate-pulse flex items-center justify-center gap-2">⏳ Authenticating...</span>`;
      submitBtn.classList.add('opacity-70', 'cursor-not-allowed');

      try {
        // 🌟 CORS 원천 차단 방어를 위한 특수 fetch 세팅 (text/plain + follow 필수)
        const response = await fetch(SYSTEM_CONFIG.API.BASE_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'text/plain;charset=utf-8' // application/json 사용 시 CORS preflight 발생
          },
          redirect: 'follow', // 구글 스크립트의 302 리다이렉트를 정상적으로 따라가도록 강제
          body: JSON.stringify({
            action: SYSTEM_CONFIG.API.ENDPOINTS.LOGIN,
            id: idInput.value,
            pw: pwInput.value
          })
        });

        const textResponse = await response.text();
        const result = JSON.parse(textResponse);

        if (result.success) {
          localStorage.setItem(SYSTEM_CONFIG.STORAGE_KEYS.USER_TOKEN, result.token);
          localStorage.setItem(SYSTEM_CONFIG.STORAGE_KEYS.ROLE, result.role);
          localStorage.setItem(SYSTEM_CONFIG.STORAGE_KEYS.CLIENT_NAME, result.clientName);
          
          submitBtn.innerHTML = "✅ Access Granted";
          submitBtn.classList.replace('bg-[#E84C60]', 'bg-emerald-600');
          
          setTimeout(() => {
            window.location.href = 'dashboard.html';
          }, 300);
        } else {
          errorMsg.classList.remove('hidden');
          errorMsg.innerText = result.message || "Invalid credentials. Please try again.";
        }
      } catch (err) {
        errorMsg.classList.remove('hidden');
        errorMsg.innerText = "Connection blocked by Google Security or Network Error. Check Apps Script permissions.";
      } finally {
        if(submitBtn.innerText !== "✅ Access Granted") {
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalBtnText;
          submitBtn.classList.remove('opacity-70', 'cursor-not-allowed');
        }
      }
    });
  }
});
