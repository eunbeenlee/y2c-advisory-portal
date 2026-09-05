// assets/js/auth.js

document.addEventListener('DOMContentLoaded', () => {
  // 이미 로그인된 상태라면 바로 대시보드로 리다이렉트
  const existingToken = localStorage.getItem(SYSTEM_CONFIG.STORAGE_KEYS.USER_TOKEN);
  if (existingToken) {
    window.location.href = "dashboard.html";
    return;
  }

  // 🌟 [엔터프라이즈 방어 로직] ID가 없어도 form 태그를 스스로 찾아냄
  const loginForm = document.getElementById('loginForm') || document.querySelector('form');
  
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault(); // 페이지 새로고침 방지
      
      // 🌟 유연한 DOM 탐색 (ID가 없어도 input type으로 찾아냄)
      const idInput = document.getElementById('userId') || loginForm.querySelector('input[type="text"], input[type="email"]');
      const pwInput = document.getElementById('userPw') || loginForm.querySelector('input[type="password"]');
      const submitBtn = document.getElementById('submitBtn') || loginForm.querySelector('button[type="submit"]') || loginForm.querySelector('button');
      
      // 에러 메시지 박스가 HTML에 없으면 자바스크립트가 즉석에서 생성
      let errorMsg = document.getElementById('errorMessage');
      if (!errorMsg) {
        errorMsg = document.createElement('div');
        errorMsg.id = 'errorMessage';
        errorMsg.className = 'hidden bg-[#C23347]/10 border border-[#C23347]/20 text-[#C23347] text-[12px] font-bold px-4 py-3 rounded-xl mb-4 text-center';
        loginForm.insertBefore(errorMsg, submitBtn);
      }

      // 필수 요소 누락 시 방어
      if (!idInput || !pwInput || !submitBtn) {
        console.error("Critical System Error: Form elements not found.");
        return;
      }

      if (!idInput.value || !pwInput.value) {
        errorMsg.classList.remove('hidden');
        errorMsg.innerText = "아이디와 비밀번호를 모두 입력해주세요.";
        return;
      }

      errorMsg.classList.add('hidden');
      const originalBtnText = submitBtn.innerHTML;
      submitBtn.disabled = true;
      submitBtn.innerHTML = `<span class="animate-pulse flex items-center justify-center gap-2">⏳ Authenticating...</span>`;
      submitBtn.classList.add('opacity-70', 'cursor-not-allowed');

      try {
        // 🌟 CORS 원천 차단 방어를 위한 특수 fetch 세팅 (text/plain + follow)
        const response = await fetch(SYSTEM_CONFIG.API.BASE_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'text/plain;charset=utf-8' 
          },
          redirect: 'follow', 
          body: JSON.stringify({
            action: SYSTEM_CONFIG.API.ENDPOINTS.LOGIN,
            id: idInput.value,
            pw: pwInput.value
          })
        });

        const textResponse = await response.text();
        const result = JSON.parse(textResponse);

        if (result.success) {
          // 토큰 및 세션 정보 저장
          localStorage.setItem(SYSTEM_CONFIG.STORAGE_KEYS.USER_TOKEN, result.token);
          localStorage.setItem(SYSTEM_CONFIG.STORAGE_KEYS.ROLE, result.role);
          localStorage.setItem(SYSTEM_CONFIG.STORAGE_KEYS.CLIENT_NAME, result.clientName);
          
          submitBtn.innerHTML = "✅ Access Granted";
          submitBtn.classList.remove('bg-[#E84C60]');
          submitBtn.classList.add('bg-emerald-600'); 
          
          setTimeout(() => {
            window.location.href = 'dashboard.html';
          }, 400);
        } else {
          errorMsg.classList.remove('hidden');
          errorMsg.innerText = result.message || "Invalid credentials. Please try again.";
        }
      } catch (err) {
        errorMsg.classList.remove('hidden');
        errorMsg.innerText = "서버 접속이 거부되었습니다. (네트워크 또는 구글 권한 오류)";
      } finally {
        if(!submitBtn.innerText.includes("Access Granted")) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalBtnText;
          submitBtn.classList.remove('opacity-70', 'cursor-not-allowed');
        }
      }
    });
  }
});
