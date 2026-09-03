// assets/js/auth.js

document.getElementById('loginForm').addEventListener('submit', async function(e) {
  e.preventDefault(); // 폼 기본 제출(새로고침) 방지
  
  const userId = document.getElementById('userId').value;
  const userPw = document.getElementById('userPw').value;
  const loginBtn = document.getElementById('loginBtn');
  const errorMsg = document.getElementById('errorMessage');

  // 로딩 상태 UI 처리
  loginBtn.innerText = "Authenticating...";
  loginBtn.disabled = true;
  errorMsg.classList.add('hidden');

  try {
    // GAS로 데이터 전송 (CORS 정책을 위해 text/plain 사용)
    const response = await fetch(SYSTEM_CONFIG.API.BASE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8"
      },
      body: JSON.stringify({
        action: SYSTEM_CONFIG.API.ENDPOINTS.AUTH,
        id: userId,
        pw: userPw
      })
    });

    const result = await response.json();

    if (result.success) {
      // 로그인 성공: 브라우저에 사용자 정보 및 권한 임시 저장
      localStorage.setItem(SYSTEM_CONFIG.STORAGE_KEYS.USER_TOKEN, "true");
      localStorage.setItem(SYSTEM_CONFIG.STORAGE_KEYS.ROLE, result.role);
      localStorage.setItem(SYSTEM_CONFIG.STORAGE_KEYS.CLIENT_NAME, result.clientName);
      
      // 권한별 설정된 다음 페이지(대시보드)로 이동
      let nextPage = SYSTEM_CONFIG.ROLES[result.role].redirectAfterLogin;
      window.location.href = nextPage;
    } else {
      // 로그인 실패: 에러 메시지 출력
      errorMsg.innerText = result.message || "Invalid ID or Password.";
      errorMsg.classList.remove('hidden');
    }
  } catch (error) {
    console.error("Login Error:", error);
    errorMsg.innerText = "서버 통신 중 오류가 발생했습니다.";
    errorMsg.classList.remove('hidden');
  } finally {
    // 버튼 원상 복구
    loginBtn.innerText = "Sign In";
    loginBtn.disabled = false;
  }
});
