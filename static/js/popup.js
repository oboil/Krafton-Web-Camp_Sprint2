function showTemperaturePopup(data, cityName, d0) {
  const temp = data.C || null;
  const feeling = data.feeling || "normal"; // 서버에서 받은 feeling
  const detailArray = data.detailArray || [0, 0, 0, 0, 0, 0]; // 서버에서 받은 해당 feeling의 배열

  openTempPopup({
    d0: d0,
    city: cityName || "알 수 없음",
    temperature: temp,
    feeling: feeling,
    detailArray: detailArray,
  });
}

function openTempPopup({ d0, city, temperature, feeling, detailArray }) {
  const overlay = document.getElementById("tempPopup");
  const cityEl = document.getElementById("tp-title");
  const tempValueEl = document.getElementById("tp-temp-value");
  const descEl = document.getElementById("tp-desc");
  const centerTextEl = document.getElementById("tp-center-text");
  const canvas = document.getElementById("tp-canvas");

  cityEl.textContent = d0 + "\t" + city || "도시";
  if (temperature !== null && temperature !== undefined) {
    const t = round1(temperature);
    tempValueEl.textContent = t;
    descEl.textContent = "현재 기온";
    centerTextEl.textContent = `${feeling}`;
  } else {
    tempValueEl.textContent = "--";
    descEl.textContent = "현재 기온 정보를 불러오지 못했습니다.";
    centerTextEl.textContent = "--°C";
  }

  let maxTemp = 100; // 기본값
  if (detailArray && detailArray.length >= 4) {
    const validValues = detailArray
      .slice(1, 4)
      .filter((v) => typeof v === "number" && v > 0);
    maxTemp = validValues.length > 0 ? Math.max(...validValues) : 100;
  }

  drawDonut(canvas, detailArray, maxTemp, feeling);

  overlay.classList.add("show");
  overlay.setAttribute("aria-hidden", "false");
  document.addEventListener("keydown", escCloser);
  overlay.addEventListener("click", backdropCloser);
}

function closeTempPopup() {
  const overlay = document.getElementById("tempPopup");
  if (!overlay.classList.contains("show")) return;
  overlay.classList.remove("show");
  overlay.setAttribute("aria-hidden", "true");
  document.removeEventListener("keydown", escCloser);
  overlay.removeEventListener("click", backdropCloser);
}

function escCloser(e) {
  if (e.key === "Escape") closeTempPopup();
}
function backdropCloser(e) {
  if (e.target.id === "tempPopup") closeTempPopup();
}
function round1(n) {
  return Math.round(n * 10) / 10;
}

function drawDonut(canvas, detailArray, maxTemp, feeling) {
  // console.log("=== drawDonut 함수 내부 ===");

  const ctx = canvas.getContext("2d");

  if (!ctx) {
    console.error("Canvas context를 가져올 수 없습니다!");
    return;
  }

  const w = canvas.width;
  const h = canvas.height;
  console.log("캔버스 크기:", w, "x", h);

  ctx.clearRect(0, 0, w, h);

  const cx = w / 2;
  const cy = h / 2;
  const radius = Math.min(w, h) * 0.42; // 꽉 찬 원 반지름

  console.log("원 중심:", cx, cy, "반지름:", radius);

  // 1) 배경 원(연한 회색 디스크)
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fillStyle = "#eeeeee";
  ctx.fill();

  // 색상 설정
  let color = ["#70ff77ff", "#70ff77ff", "#70ff77ff", "#dcffd7ff", "#dcffd7ff"]; // 기본값
  if (feeling === "hot") {
    color = ["#ff0000ff", "#ff3030ff", "#ff6060ff", "#ff9090ff", "#ffd7d7ff"];
  } else if (feeling === "cold") {
    color = ["#001affff", "#3040ffff", "#6070ffff", "#90a0ffff", "#dad7ffff"];
  } else if (feeling === "normal") {
    color = ["#00ff08ff", "#40ff48ff", "#70ff77ff", "#a0ffa7ff", "#dcffd7ff"];
  }

  // detailArray가 유효한지 확인
  if (!detailArray || !Array.isArray(detailArray) || detailArray.length < 6) {
    console.error("detailArray가 유효하지 않습니다:", detailArray);
    return;
  }

  // 전체 투표수 계산 (1, 2, 3번 인덱스 합)
  const totalDetailVotes = detailArray[0];
  console.log("총 상세 투표수:", totalDetailVotes);
  console.log("각 값:", detailArray[1], detailArray[2], detailArray[3]);

  if (totalDetailVotes === 0) {
    console.log("상세 투표 데이터가 없어 섹터를 그리지 않습니다.");
    return;
  }

  // 2) 값이 있으면 비율만큼 '부채꼴'로 채우기
  let iop = 0;
  for (let i = 1; i < 6; i++) {
    const value = detailArray[i];

    if (typeof value === "number" && isFinite(value) && value > 0) {
      // 전체 합 기준으로 비율 계산
      const ratio = value / totalDetailVotes;
      const angle = ratio * Math.PI * 2; // 전체 원을 기준으로 각도 계산

      const start = -Math.PI / 2 + iop; // 12시 방향 시작
      const end = start + angle;

      // 섹터 그리기
      drawSector(ctx, cx, cy, radius, start, end, color[i - 1]);

      iop += angle;
    } else {
      console.log(`섹터 ${i} 스킵 - 값이 유효하지 않음: ${value}`);
    }
  }
  // 3) 눈금 그리기 (한 번만)
  // drawTicks(ctx, cx, cy, radius, 0, 0, maxTemp, 10);
}

// 꽉 찬 원형 섹터(부채꼴) 채우기
function drawSector(ctx, cx, cy, r, a1, a2, fillStyle) {
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.arc(cx, cy, r, a1, a2, false);
  ctx.closePath();
  ctx.fillStyle = fillStyle;
  ctx.fill();
}

// 광역시/도 통계 팝업 관련 함수들
function showProvinceStats(provinceName, event, popupPosition) {
  fetch(`/get_raw_stats?province=${encodeURIComponent(provinceName)}`)
    .then((response) => response.json())
    .then((rawStats) => {
      openProvincePopup(provinceName, rawStats, popupPosition);
    })
    .catch((error) => {
      console.error("지역 통계 로드 실패:", error);
      // const fallbackStats = { hot: 0, normal: 0, cold: 0 };
      // openProvincePopup(provinceName, fallbackStats, event, regionData);
    });
}

// 광역시/도 팝업
function openProvincePopup(provinceName, stats, popupPosition) {
  const popup = document.getElementById("provincePopup");
  const title = document.getElementById("province-title");
  const container = document.getElementById("combined-bar-container");

  title.textContent = provinceName;

  const total = stats.hot + stats.normal + stats.cold;

  // 바 생성
  container.innerHTML = "";

  if (total === 0) {
    // 데이터가 없는 경우
    const emptyBar = document.createElement("div");
    emptyBar.className = "combined-bar normal";
    emptyBar.style.width = "100%";
    emptyBar.textContent = "데이터 없음";
    container.appendChild(emptyBar);

    document.getElementById("hot-count").textContent = "0";
    document.getElementById("normal-count").textContent = "0";
    document.getElementById("cold-count").textContent = "0";
  } else {
    const hotPercent = (stats.hot / total) * 100;
    const normalPercent = (stats.normal / total) * 100;
    const coldPercent = (stats.cold / total) * 100;

    // 각 타입별 바 생성
    if (stats.hot > 0) {
      const hotBar = document.createElement("div");
      hotBar.className = "combined-bar hot";
      hotBar.style.width = hotPercent + "%";
      if (hotPercent >= 15) hotBar.textContent = Math.round(hotPercent) + "%";
      container.appendChild(hotBar);
    }

    if (stats.normal > 0) {
      const normalBar = document.createElement("div");
      normalBar.className = "combined-bar normal";
      normalBar.style.width = normalPercent + "%";
      if (normalPercent >= 15)
        normalBar.textContent = Math.round(normalPercent) + "%";
      container.appendChild(normalBar);
    }

    if (stats.cold > 0) {
      const coldBar = document.createElement("div");
      coldBar.className = "combined-bar cold";
      coldBar.style.width = coldPercent + "%";
      if (coldPercent >= 15)
        coldBar.textContent = Math.round(coldPercent) + "%";
      container.appendChild(coldBar);
    }

    // 범례 업데이트
    document.getElementById("hot-count").textContent = stats.hot;
    document.getElementById("normal-count").textContent = stats.normal;
    document.getElementById("cold-count").textContent = stats.cold;
  }

  // 미리 계산된 좌표 사용
  if (popupPosition) {
    const popupWidth = 200;
    const popupHeight = 80;

    let popupX = popupPosition.x + 20;
    let popupY = popupPosition.y - popupHeight / 2;

    // 화면 경계 체크
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    if (popupX + popupWidth > windowWidth) {
      popupX = popupPosition.x - popupWidth - 20;
    }

    if (popupY < 0) {
      popupY = 10;
    }

    if (popupY + popupHeight > windowHeight) {
      popupY = windowHeight - popupHeight - 10;
    }

    popup.style.left = popupX + "px";
    popup.style.top = popupY + "px";
    popup.style.transform = "none"; // transform 초기화
  }

  popup.classList.add("show");

  // 바깥 누르면 팝업 닫힘
  setTimeout(() => {
    document.addEventListener("click", provincePopupOutsideClick);
  }, 100);

  // 3초 후 자동으로 팝업 닫기
  setTimeout(() => {
    closeProvincePopup();
  }, 3000);
}

function updateStatBar(type, percentage, count, total) {
  const bar = document.getElementById(`${type}-bar`);
  const countEl = document.getElementById(`${type}-count`);

  bar.style.width = percentage + "%";
  countEl.textContent = count;

  // 퍼센티지가 15% 이상일 때만 바 안에 텍스트 표시
  if (percentage >= 15) {
    bar.textContent = Math.round(percentage) + "%";
  } else {
    bar.textContent = "";
  }
}

function closeProvincePopup() {
  const popup = document.getElementById("provincePopup");
  popup.classList.remove("show");

  document.removeEventListener("click", provincePopupOutsideClick);
}

function provincePopupOutsideClick(event) {
  const popup = document.getElementById("provincePopup");
  if (!popup.contains(event.target)) {
    closeProvincePopup();
  }
}
