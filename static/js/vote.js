// 전역 변수
let selectedFeeling = null;

const detailOptions = {
  hot: [
    "지옥 입성",
    "모기가 피 대신 얼음물 찾는 더움",
    "전기세는 뜨겁고 내 지갑은 차갑고",
    "아이스크림이 생각난다",
    "부채질 한 번이면 충분",
  ],
  normal: ["오늘 산책 나가도 될 정도"],
  cold: [
    "빙하기 입성",
    "펭귄도 엉뜨 키는 추움",
    "손가락이 오타 파티 엶",
    "눈싸움하기 딱 좋다",
    "겉옷 하나 챙겨야지",
  ],
};

const value = {
  "지옥 입성": 5,
  "모기가 피 대신 얼음물 찾는 더움": 4,
  "전기세는 뜨겁고 내 지갑은 차갑고": 3,
  "아이스크림이 생각난다": 2,
  "부채질 한 번이면 충분": 1,
  "오늘 산책 나가도 될 정도": 1,
  "빙하기 입성": 5,
  "펭귄도 엉뜨 키는 추움": 4,
  "손가락이 오타 파티 엶": 3,
  "눈싸움하기 딱 좋다": 2,
  "겉옷 하나 챙겨야지": 1,
};

function vote(feeling, btn) {
  selectedFeeling = feeling;
  localStorage.setItem("userVote", feeling);

  document.querySelectorAll(".vote-options button").forEach((b) => {
    b.classList.remove("active");
  });

  btn.classList.add("active");

  const detailDiv = document.querySelector(".detail-vote");
  const detailSelect = document.getElementById("detailSelect");

  detailSelect.innerHTML = "<option value=''>선택하세요.</option>";
  detailOptions[feeling].forEach((opt) => {
    const option = document.createElement("option");
    option.value = value[opt];
    option.textContent = opt;
    detailSelect.appendChild(option);
  });

  detailDiv.style.display = "block";
}

function saveDetail() {
  const detail = document.getElementById("detailSelect").value;
  const userVote = localStorage.getItem("userVote");
  const d0 = localStorage.getItem("do");
  const si = localStorage.getItem("si");

  let userIP;
  if (!document.cookie.includes("userip")) {
    fetch("https://api.ipify.org?format=json")
      .then((response) => response.json())
      .then((data) => {
        userIp = data.ip;
        // 현재 시각 기준 30분 뒤
        const banUntil = new Date();
        banUntil.setMinutes(banUntil.getMinutes() + 30);
        // 쿠키에 저장 (ISO 문자열로)
        document.cookie = `userip=${userIp}; expires=${banUntil.toUTCString()}; path=/`;
        document.cookie = `banUntil=${banUntil.toISOString()}; path=/`;
      });
  }
  // // 쿠키에서 banUntil 꺼내기
  // function getCookie(name) {
  //   const value = `; ${document.cookie}`;
  //   const parts = value.split(`; ${name}=`);
  //   if (parts.length === 2) return parts.pop().split(";").shift();
  // }

  // const banUntilCookie = getCookie("banUntil");
  // if (banUntilCookie) {
  //   const banUntilDate = new Date(banUntilCookie);
  //   if (banUntilDate > new Date()) {
  //     const diffMin = Math.ceil((banUntilDate - new Date()) / 60000);
  //     alert(`이미 투표한 사용자입니다. ${diffMin}분 후 다시 시도해주세요.`);
  //     window.location.href = "/"; // 결과 화면으로 이동
  //     return;
  //   }
  // } else {
  //   // 쿠키가 없으면 새로 생성
  //   const banUntil = new Date();
  //   banUntil.setMinutes(banUntil.getMinutes() + 30);
  //   document.cookie = `banUntil=${banUntil.toISOString()}; path=/`;
  // }

  // 기존 쿠키 확인
  const banUntilCookie = getCookie("banUntil");
  if (banUntilCookie) {
    const banUntilDate = new Date(banUntilCookie);
    if (banUntilDate > new Date()) {
      const diffMin = Math.ceil((banUntilDate - new Date()) / 60000);
      alert(`이미 투표한 사용자입니다. ${diffMin}분 후 다시 시도해주세요.`);
      showScreen(3);
      if (typeof loadKoreaMap === "function") {
        loadKoreaMap("provinces");
      }
      return;
    }
  }

  if (detail) {
    // 새 쿠키 생성
    const banUntil = new Date();
    banUntil.setMinutes(banUntil.getMinutes() + 30);
    document.cookie = `banUntil=${banUntil.toISOString()}; path=/`;

    // 결과 화면으로 이동
    showScreen(3);

    // 지도 로드 (기존 map.js 함수 호출)
    if (typeof loadKoreaMap === "function") {
      loadKoreaMap("provinces");
      // loadWeatherData();
    }

    // 서버에 투표 데이터 전송
    submitVote(userVote, d0, si, detail);
  } else {
    alert("세부 체감을 선택해주세요.");
  }
}

// 투표 데이터를 서버에 전송하고 온도 데이터를 받아오는 함수
function submitVote(feeling, d0, si, detail) {
  fetch(
    `/result?feeling=${encodeURIComponent(feeling)}&d0=${encodeURIComponent(
      d0
    )}&si=${encodeURIComponent(si)}&detail=${encodeURIComponent(detail)}`
  )
    .then((response) => {
      if (!response.ok) {
        throw new Error("네트워크 응답이 올바르지 않습니다.");
      }
      return response.json();
    })
    .then((data) => {
      console.log("투표 데이터 저장 완료:", data);
      // 서버에서 받은 데이터 그대로 전달 (feeling, detailArray 포함)
      showTemperaturePopup(data, si, d0);
    })
    .catch((error) => {
      console.error("Error:", error);
      alert("데이터 전송 중 오류가 발생했습니다.");
    });
}
