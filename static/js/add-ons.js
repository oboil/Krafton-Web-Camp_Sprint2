// 퀴즈 관련 변수
let quizAnswer = null;
let quizLocation = null;

// 추천 관련 변수
var currentClothes = null;
var currentFood = null;
var likedItems = new Set();
var isHandlingClick = false;
const seenClothes = new Set();
const seenFood = new Set();

// 랭킹 팝업
function openRankingPopup() {
  console.log("랭킹 아이콘 클릭");
  loadRankingData();
}

function closeRankingPopup() {
  const popup = document.getElementById("rankingPopup");
  const overlay = document.getElementById("rankingOverlay");

  popup.classList.remove("show");
  overlay.classList.remove("show");
  popup.setAttribute("aria-hidden", "true");
  overlay.setAttribute("aria-hidden", "true");

  document.removeEventListener("click", rankingBackdropCloser);
  document.removeEventListener("keydown", rankingEscCloser);
}

function rankingBackdropCloser(e) {
  if (e.target.id === "rankingOverlay") {
    closeRankingPopup();
  }
}

function rankingEscCloser(e) {
  if (e.key === "Escape") {
    closeRankingPopup();
  }
}

async function loadRankingData() {
  try {
    // DB에 저장된 데이터로 랭킹 계산
    const response = await fetch("/get_ranking_data");
    const data = await response.json();

    displayRanking(data);

    const popup = document.getElementById("rankingPopup");
    const overlay = document.getElementById("rankingOverlay");

    popup.classList.add("show");
    overlay.classList.add("show");
    popup.setAttribute("aria-hidden", "false");
    overlay.setAttribute("aria-hidden", "false");

    // 이벤트 리스너 추가
    setTimeout(() => {
      document.addEventListener("click", rankingBackdropCloser);
      document.addEventListener("keydown", rankingEscCloser);
    }, 100);
  } catch (error) {
    console.error("랭킹 데이터 로드 실패:", error);
    alert("랭킹 데이터를 불러오는 중 오류가 발생했습니다.");
  }
}

function displayRanking(data) {
  const { mostVotedFeeling, voteTopRegions, tempTopRegions } = data;

  const mainTitle = document.getElementById("ranking-main-title");

  let displayFeeling;
  if (mostVotedFeeling === "hot") {
    displayFeeling = `🔥 덥다 🔥`;
  } else if (mostVotedFeeling === "cold") {
    displayFeeling = `❄️ 춥다 ❄️`;
  } else {
    displayFeeling = `😊 보통 😊`;
  }

  const feelingColor =
    mostVotedFeeling === "hot"
      ? "red"
      : mostVotedFeeling === "cold"
      ? "blue"
      : "green";
  mainTitle.innerHTML = `전국적으로 가장 많이 느낀 건 "<span style="color:${feelingColor}; font-weight:bold;">${displayFeeling}</span>" 입니다!`;
  mainTitle.style.textShadow = "1px 1px 2px rgba(0,0,0,0.3)";

  // 각각 상위 5개만 표시
  renderRankingList(
    voteTopRegions.slice(0, 5),
    mostVotedFeeling,
    "voteRanking",
    "vote"
  );
  renderRankingList(
    tempTopRegions.slice(0, 5),
    mostVotedFeeling,
    "tempRanking",
    "temp"
  );

  // 박스 배경색 설정
  const voteBox = document.querySelector("#voteRanking").parentElement;
  const tempBox = document.querySelector("#tempRanking").parentElement;
  let bgColor;
  if (mostVotedFeeling === "hot") {
    bgColor = "rgba(255, 150, 150, 0.8)";
  } else if (mostVotedFeeling === "cold") {
    bgColor = "rgba(150, 150, 255, 0.8)";
  } else {
    bgColor = "rgba(150, 255, 150, 0.8)";
  }

  voteBox.style.backgroundColor = bgColor;
  tempBox.style.backgroundColor = bgColor;
}

function renderRankingList(data, feeling, elementId, type) {
  const ul = document.getElementById(elementId);
  ul.innerHTML = "";
  data.forEach((item, i) => {
    const li = document.createElement("li");
    if (type === "vote") {
      const feelingText =
        feeling === "hot" ? "덥다" : feeling === "cold" ? "춥다" : "보통";
      li.innerText = `${i + 1}. ${item.province} ${item.region} - ${
        item.votes
      }표`;
    } else {
      if (item.temp !== null && item.temp !== undefined) {
        li.innerText = `${i + 1}. ${item.province} ${item.region} : ${
          item.temp
        }°C`;
      } else {
        li.innerText = `${i + 1}. ${item.province} ${
          item.region
        } : 온도정보없음`;
      }
    }
    ul.appendChild(li);
  });
}

// 랭킹 팝업
function openRankingPopup() {
  console.log("랭킹 아이콘 클릭");
  loadRankingData();
}

function closeRankingPopup() {
  const popup = document.getElementById("rankingPopup");
  const overlay = document.getElementById("rankingOverlay");

  popup.classList.remove("show");
  overlay.classList.remove("show");
  popup.setAttribute("aria-hidden", "true");
  overlay.setAttribute("aria-hidden", "true");

  document.removeEventListener("click", rankingBackdropCloser);
  document.removeEventListener("keydown", rankingEscCloser);
}

function rankingBackdropCloser(e) {
  if (e.target.id === "rankingOverlay") {
    closeRankingPopup();
  }
}

function rankingEscCloser(e) {
  if (e.key === "Escape") {
    closeRankingPopup();
  }
}

async function loadRankingData() {
  try {
    // DB에 저장된 데이터로 랭킹 계산
    const response = await fetch("/get_ranking_data");
    const data = await response.json();

    displayRanking(data);

    const popup = document.getElementById("rankingPopup");
    const overlay = document.getElementById("rankingOverlay");

    popup.classList.add("show");
    overlay.classList.add("show");
    popup.setAttribute("aria-hidden", "false");
    overlay.setAttribute("aria-hidden", "false");

    // 이벤트 리스너 추가
    setTimeout(() => {
      document.addEventListener("click", rankingBackdropCloser);
      document.addEventListener("keydown", rankingEscCloser);
    }, 100);
  } catch (error) {
    console.error("랭킹 데이터 로드 실패:", error);
    alert("랭킹 데이터를 불러오는 중 오류가 발생했습니다.");
  }
}

function displayRanking(data) {
  const { mostVotedFeeling, voteTopRegions, tempTopRegions } = data;

  const mainTitle = document.getElementById("ranking-main-title");

  let displayFeeling;
  if (mostVotedFeeling === "hot") {
    displayFeeling = `🔥 덥다 🔥`;
  } else if (mostVotedFeeling === "cold") {
    displayFeeling = `❄️ 춥다 ❄️`;
  } else {
    displayFeeling = `😊 보통 😊`;
  }

  const feelingColor =
    mostVotedFeeling === "hot"
      ? "red"
      : mostVotedFeeling === "cold"
      ? "blue"
      : "green";
  mainTitle.innerHTML = `오늘은 <span style="color:${feelingColor}; font-weight:bold;">${displayFeeling}</span>`;
  mainTitle.style.textShadow = "1px 1px 2px rgba(0,0,0,0.3)";

  // 각각 상위 5개만 표시
  renderRankingList(
    voteTopRegions.slice(0, 5),
    mostVotedFeeling,
    "voteRanking",
    "vote"
  );
  renderRankingList(
    tempTopRegions.slice(0, 5),
    mostVotedFeeling,
    "tempRanking",
    "temp"
  );

  // 박스 배경색 설정
  const voteBox = document.querySelector("#voteRanking").parentElement;
  const tempBox = document.querySelector("#tempRanking").parentElement;
  let bgColor;
  if (mostVotedFeeling === "hot") {
    bgColor = "rgba(255, 150, 150, 0.8)";
  } else if (mostVotedFeeling === "cold") {
    bgColor = "rgba(150, 150, 255, 0.8)";
  } else {
    bgColor = "rgba(150, 255, 150, 0.8)";
  }

  voteBox.style.backgroundColor = bgColor;
  tempBox.style.backgroundColor = bgColor;
}

function renderRankingList(data, feeling, elementId, type) {
  const ul = document.getElementById(elementId);
  ul.innerHTML = "";
  data.forEach((item, i) => {
    const li = document.createElement("li");
    if (type === "vote") {
      const feelingText =
        feeling === "hot" ? "덥다" : feeling === "cold" ? "춥다" : "보통";
      li.innerText = `${i + 1}. ${item.province} ${item.region} - ${
        item.votes
      }표`;
    } else {
      if (item.temp !== null && item.temp !== undefined) {
        li.innerText = `${i + 1}. ${item.province} ${item.region} : ${
          item.temp
        }°C`;
      } else {
        li.innerText = `${i + 1}. ${item.province} ${
          item.region
        } : 온도정보없음`;
      }
    }
    ul.appendChild(li);
  });
}

// // 전역으로 노출하여 map.js에서 호출 가능하게 함
// window.onMapLevelChange = onMapLevelChange;

// 퀴즈 팝업 열기
function openQuizPopup() {
  let d0, si;
  // let quizLocation, quizAnswer;

  // 1순위: localStorage에서 가져오기 (투표 완료 후)
  d0 = localStorage.getItem("do");
  si = localStorage.getItem("si");

  // 2순위: 전역 변수에서 가져오기 (방금 선택한 경우)
  if ((!d0 || !si) && window.currentRegion) {
    d0 = window.currentRegion.province;
    si = window.currentRegion.city;
  }

  // 3순위: 현재 선택된 값에서 가져오기
  if (!d0 || !si) {
    const provinceSelect = document.getElementById("province");
    const citySelect = document.getElementById("city");

    if (provinceSelect && citySelect) {
      d0 = provinceSelect.value;
      si = citySelect.value;
    }
  }

  console.log("퀴즈 지역 정보:", { d0, si });

  if (!d0 || !si) {
    alert("지역 정보가 없습니다. 먼저 지역을 선택해주세요!");
    return;
  }

  console.log("퀴즈 지역 정보:", { d0, si });

  quizLocation = { d0: d0, si: si };
  document.getElementById(
    "quiz-question"
  ).innerText = `${d0} ${si}의 현재 체감 온도는?`;

  // 서버에서 온도 데이터 가져오기
  fetch(
    `/quiz_result?d0=${encodeURIComponent(d0)}&si=${encodeURIComponent(si)}`
  )
    .then((response) => response.json())
    .then((data) => {
      console.log("서버 응답:", data);
      if (data !== undefined && data !== null) {
        quizAnswer = data;
        showQuizPopup();
      } else {
        alert("해당 지역의 온도 정보를 가져올 수 없습니다.");
      }
    })
    .catch((error) => {
      console.error("퀴즈 데이터 로드 실패:", error);
      alert("온도 정보를 불러오는 중 오류가 발생했습니다.");
    });
}

// 퀴즈 팝업 표시
function showQuizPopup() {
  const popup = document.getElementById("quizPopup");
  const overlay = document.getElementById("quizOverlay");

  popup.classList.add("show");
  overlay.classList.add("show");
  popup.setAttribute("aria-hidden", "false");
  overlay.setAttribute("aria-hidden", "false");

  // 입력 필드 초기화
  document.getElementById("userAnswer").value = "";
  document.getElementById("quiz-result").innerText = "";

  setTimeout(() => {
    document.addEventListener("click", quizBackdropCloser);
    document.addEventListener("keydown", quizEscCloser);
  }, 100);
}

// 퀴즈 팝업 닫기
function closeQuizPopup() {
  const popup = document.getElementById("quizPopup");
  const overlay = document.getElementById("quizOverlay");

  popup.classList.remove("show");
  overlay.classList.remove("show");
  popup.setAttribute("aria-hidden", "true");
  overlay.setAttribute("aria-hidden", "true");

  document.removeEventListener("click", quizBackdropCloser);
  document.removeEventListener("keydown", quizEscCloser);
}

// 퀴즈 정답 확인
function checkQuizAnswer() {
  const userInput = parseInt(document.getElementById("userAnswer").value);
  const resultDiv = document.getElementById("quiz-result");

  if (isNaN(userInput)) {
    resultDiv.innerText = "숫자를 입력해주세요!";
    resultDiv.style.color = "#ff6b6b";
    return;
  }

  const difference = Math.abs(quizAnswer - userInput);

  if (quizAnswer - userInput <= 1 && quizAnswer - userInput >= 0) {
    resultDiv.innerText = `정답! ${quizLocation.d0} ${quizLocation.si}의 실제 온도는 ${quizAnswer}°C 입니다.`;
    resultDiv.style.color = "#4caf50";
  } else {
    resultDiv.innerText = `아쉽네요! ${quizLocation.d0} ${quizLocation.si}의 실제 온도는 ${quizAnswer}°C 입니다.`;
    resultDiv.style.color = "#ff6b6b";
  }
}

// 퀴즈 팝업 이벤트 리스너
function quizBackdropCloser(e) {
  if (e.target.id === "quizOverlay") {
    closeQuizPopup();
  }
}

function quizEscCloser(e) {
  if (e.key === "Escape") {
    closeQuizPopup();
  }
}

// 추천 팝업 열기
function openRecommendPopup() {
  var feeling = localStorage.getItem("userVote") || "normal";

  // feeling 값을 한글로 변환
  var feelingKorean =
    feeling === "hot" ? "덥다" : feeling === "cold" ? "춥다" : "보통";

  fetchRecommendation(feelingKorean);
  showRecommendPopup();
}

// 추천 팝업 표시
function showRecommendPopup() {
  var popup = document.getElementById("recommendPopup");
  var overlay = document.getElementById("recommendOverlay");

  popup.classList.add("show");
  overlay.classList.add("show");
  popup.setAttribute("aria-hidden", "false");
  overlay.setAttribute("aria-hidden", "false");

  setTimeout(function () {
    document.addEventListener("click", recommendBackdropCloser);
    document.addEventListener("keydown", recommendEscCloser);
  }, 100);
}

// 추천 팝업 닫기
function closeRecommendPopup() {
  var popup = document.getElementById("recommendPopup");
  var overlay = document.getElementById("recommendOverlay");

  popup.classList.remove("show");
  overlay.classList.remove("show");
  popup.setAttribute("aria-hidden", "true");
  overlay.setAttribute("aria-hidden", "true");

  document.removeEventListener("click", recommendBackdropCloser);
  document.removeEventListener("keydown", recommendEscCloser);
}

// 추천 데이터 가져오기
function fetchRecommendation(feelingKorean) {
  fetch("/api/recommendations/" + encodeURIComponent(feelingKorean))
    .then(function (response) {
      return response.json();
    })
    .then(function (data) {
      // 클라이언트에서 본 적 없는 항목 중 랜덤 선택
      const unseenClothes = data.clothes.filter(
        (c) => !seenClothes.has(c.name)
      );
      const unseenFood = data.food.filter((f) => !seenFood.has(f.name));

      currentClothes = unseenClothes.length
        ? unseenClothes[Math.floor(Math.random() * unseenClothes.length)]
        : { name: "더 이상 추천 없음", likes: 0 };

      currentFood = unseenFood.length
        ? unseenFood[Math.floor(Math.random() * unseenFood.length)]
        : { name: "더 이상 추천 없음", likes: 0 };

      if (currentClothes.name !== "더 이상 추천 없음") {
        seenClothes.add(currentClothes.name);
      }
      if (currentFood.name !== "더 이상 추천 없음") {
        seenFood.add(currentFood.name);
      }

      renderRecommendation();
    })
    .catch(function (error) {
      console.error("추천 데이터 로드 실패:", error);
      document.getElementById("clothesResult").innerHTML =
        "추천 정보를 불러오는 데 실패했습니다.";
      document.getElementById("foodResult").innerHTML =
        "추천 정보를 불러오는 데 실패했습니다.";
    });
}

// 추천 화면 렌더링
function renderRecommendation() {
  var clothesKey = "clothes_" + currentClothes.name;
  var foodKey = "food_" + currentFood.name;

  // 모든 추천이 끝났는지 확인
  if (
    currentClothes.name === "더 이상 추천 없음" &&
    currentFood.name === "더 이상 추천 없음"
  ) {
    document.getElementById("clothesResult").innerHTML =
      '<div style="text-align:center; font-size:1.5rem; margin:2rem 0;">더 이상 추천이 없습니다.</div>';
    document.getElementById("foodResult").innerHTML = "";
    document.getElementById("newRecommendationBtn").style.display = "none";
    return;
  }

  // 옷 추천
  if (currentClothes.name === "더 이상 추천 없음") {
    document.getElementById("clothesResult").innerHTML = "";
  } else {
    document.getElementById("clothesResult").innerHTML =
      '<div class="recommend-item">' +
      "<span>👔 " +
      currentClothes.name +
      " (" +
      currentClothes.likes +
      " 좋아요)</span>" +
      '<button class="like-btn" id="like-clothes">👍</button>' +
      "</div>";

    var clothesBtn = document.getElementById("like-clothes");
    clothesBtn.disabled = likedItems.has(clothesKey);
    clothesBtn.onclick = function () {
      handleLike("clothes", clothesKey);
    };
  }

  // 음식 추천
  if (currentFood.name === "더 이상 추천 없음") {
    document.getElementById("foodResult").innerHTML = "";
  } else {
    document.getElementById("foodResult").innerHTML =
      '<div class="recommend-item">' +
      "<span>🍽️ " +
      currentFood.name +
      " (" +
      currentFood.likes +
      " 좋아요)</span>" +
      '<button class="like-btn" id="like-food">👍</button>' +
      "</div>";

    var foodBtn = document.getElementById("like-food");
    foodBtn.disabled = likedItems.has(foodKey);
    foodBtn.onclick = function () {
      handleLike("food", foodKey);
    };
  }

  // 새 추천 버튼
  document.getElementById("newRecommendationBtn").onclick = function () {
    var feeling = localStorage.getItem("userVote") || "normal";
    var feelingKorean =
      feeling === "hot" ? "덥다" : feeling === "cold" ? "춥다" : "보통";
    fetchRecommendation(feelingKorean);
  };
}

// 좋아요 처리
function handleLike(type, key) {
  if (likedItems.has(key) || isHandlingClick) return;
  isHandlingClick = true;

  var feeling = localStorage.getItem("userVote") || "normal";
  var feelingKorean =
    feeling === "hot" ? "덥다" : feeling === "cold" ? "춥다" : "보통";

  var payload = {
    feeling: feelingKorean,
    type: type,
    clothes_name: currentClothes.name,
    food_name: currentFood.name,
  };

  fetch("/api/like", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
    .then(function (response) {
      return response.json();
    })
    .then(function (result) {
      if (result.success) {
        likedItems.add(key);
        if (type === "clothes") currentClothes.likes += 1;
        else if (type === "food") currentFood.likes += 1;
        renderRecommendation();
      }
    })
    .catch(function (error) {
      console.error("좋아요 처리 실패:", error);
    })
    .finally(function () {
      isHandlingClick = false;
    });
}

// 추천 팝업 이벤트 리스너
function recommendBackdropCloser(e) {
  if (e.target.id === "recommendOverlay") {
    closeRecommendPopup();
  }
}

function recommendEscCloser(e) {
  if (e.key === "Escape") {
    closeRecommendPopup();
  }
}
