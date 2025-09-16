// 전역 변수들
let koreaRegions = null;
let currentMapLevel = "provinces";
let weatherData = {};
let selectedProvince = null;
let detailArrays = {};

// 동적 매핑 생성 - 지도 로드 시 자동으로 영어-한글 매핑 생성
let regionNameMapping = {};

// SVG 설정
const svg = d3.select("#korea-map");
const container = d3.select(".map-container");

// 광역시/도 코드 매핑 함수 (2자리 코드 기준)
function getProvinceFromCode(code) {
  const codeNum = parseInt(code);

  switch (codeNum) {
    case 11:
      return "서울특별시";
    case 21:
      return "부산광역시";
    case 22:
      return "대구광역시";
    case 23:
      return "인천광역시";
    case 24:
      return "광주광역시";
    case 25:
      return "대전광역시";
    case 26:
      return "울산광역시";
    case 29:
      return "세종특별자치시";
    case 31:
      return "경기도";
    case 32:
      return "강원도";
    case 33:
      return "충청북도";
    case 34:
      return "충청남도";
    case 35:
      return "전라북도";
    case 36:
      return "전라남도";
    case 37:
      return "경상북도";
    case 38:
      return "경상남도";
    case 39:
      return "제주특별자치도";
    default:
      console.warn(`알 수 없는 코드: ${code}`);
      return "기타";
  }
}

// 지도 로드 후 매핑 테이블 생성
function buildRegionMapping() {
  if (!koreaRegions) return;

  koreaRegions.features.forEach((region) => {
    const koreanName = region.properties.name; // 한글 이름
    const englishName = region.properties.name_eng; // 영어 이름

    if (englishName && koreanName) {
      const cleanId = englishName
        .toLowerCase()
        .replace(/\s+/g, "_")
        .replace(/[^a-z0-9_]/g, "");

      regionNameMapping[cleanId] = koreanName;
    }
  });

  console.log("생성된 지역 매핑:", regionNameMapping);
}

// 반응형 크기 계산
function getMapDimensions() {
  // SVG 요소의 실제 크기 사용
  const svgNode = svg.node();
  const rect = svgNode.getBoundingClientRect();

  return {
    width: rect.width,
    height: rect.height,
  };
}

let { width, height } = getMapDimensions();

// 투영법 설정 (한국 중심)
const projection = d3
  .geoMercator()
  .center([127.7, 36.0])
  .scale(1) // 초기값을 1로 설정
  .translate([0, 0]); // 초기값을 0,0으로 설정

// 지도 크기에 맞춰 자동 조정하는 함수 추가
function fitMapToScreen() {
  const { width, height } = getMapDimensions();

  // viewBox로 SVG 크기 제한
  svg
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("preserveAspectRatio", "xMidYMid meet"); // 비율 유지하며 중앙 정렬

  if (koreaRegions) {
    // 지도 경계에 맞춰 자동 스케일/중심 계산
    projection.fitSize([width * 0.9, height * 0.9], koreaRegions);
    projection.translate([width / 2, height / 2]);
  }
}

const path = d3.geoPath().projection(projection);

// 툴팁
const tooltip = d3.select("#tooltip");

// GeoJSON 데이터 로드 함수
async function loadKoreaMap(level = "provinces") {
  try {
    currentMapLevel = level;
    let url;

    if (level === "municipalities") {
      // 시군구별 상세 지도 (약 230개 지역)
      url = "/static/data/skorea-municipalities-2018-geo.json";
    } else {
      // 시도별 지도 (17개 지역)
      url = "/static/data/skorea-provinces-2018-geo.json";
    }

    console.log(`${level} 지도 데이터 로드 중...`);
    const response = await fetch(url);
    koreaRegions = await response.json();

    console.log(`${koreaRegions.features.length}개 지역 로드 완료`);

    fitMapToScreen();

    // 지도 그리기
    drawMap();

    // 지도 그리기 완료 후 날씨 데이터 로드
    loadWeatherData();
  } catch (error) {
    console.error("지도 데이터 로드 실패:", error);
  }
}

function mergeDistrictsInGeoJSON() {
  if (!koreaRegions || currentMapLevel !== "municipalities") return;

  // 통합할 도시들만 정의
  const MERGE_CITIES = [
    "용인",
    "수원",
    "성남",
    "청주",
    "천안",
    "전주",
    "창원",
    "안양",
    "고양",
    "안산",
  ];

  // 통합할 구인지 확인하는 함수
  function getCityNameForDistrict(districtName) {
    for (const cityName of MERGE_CITIES) {
      if (districtName.includes(cityName)) {
        return cityName + "시";
      }
    }
    return null;
  }

  const mergedFeatures = [];
  const processedCities = new Set();

  koreaRegions.features.forEach((feature) => {
    const districtName = feature.properties.name;
    const cityName = getCityNameForDistrict(districtName);

    if (cityName && !processedCities.has(cityName)) {
      // 해당 도시의 모든 구 찾기
      const cityDistricts = koreaRegions.features.filter((f) =>
        f.properties.name.includes(cityName.replace("시", ""))
      );

      if (cityDistricts.length > 1) {
        // 여러 구가 있으면 통합
        const mergedCoordinates = [];

        cityDistricts.forEach((district) => {
          if (district.geometry.type === "MultiPolygon") {
            mergedCoordinates.push(...district.geometry.coordinates);
          } else if (district.geometry.type === "Polygon") {
            mergedCoordinates.push(district.geometry.coordinates);
          }
        });

        // 통합된 feature 생성
        const mergedFeature = {
          type: "Feature",
          geometry: {
            type: "MultiPolygon",
            coordinates: mergedCoordinates,
          },
          properties: {
            name: cityName,
            name_eng: cityName.replace("시", "") + "-si",
            code: cityDistricts[0].properties.code,
            base_year: "2018",
          },
        };

        mergedFeatures.push(mergedFeature);
        processedCities.add(cityName);
      }
    } else if (!cityName) {
      // 통합 대상이 아닌 일반 지역은 그대로 추가
      mergedFeatures.push(feature);
    }
  });

  koreaRegions.features = mergedFeatures;
  console.log(`구 통합 완료: ${koreaRegions.features.length}개 지역`);
}

// 지도 그리기 함수
function drawMap() {
  if (!koreaRegions) {
    console.error("지도 데이터가 없습니다.");
    return;
  }

  fitMapToScreen();

  if (currentMapLevel === "municipalities") {
    mergeDistrictsInGeoJSON();
  }

  // 기존 지도 요소 제거
  svg.selectAll("*").remove();

  // 매핑 테이블 생성
  buildRegionMapping();

  // 지역 그리기
  // drawMap() 함수에서 ID 생성 부분을 수정
  svg
    .selectAll(".region")
    .data(koreaRegions.features)
    .enter()
    .append("path")
    .attr("class", "region")
    .attr("d", path)
    .attr("id", (d) => {
      const name = d.properties.name || "unknown";
      return name.replace(/[^가-힣a-zA-Z0-9]/g, ""); // 특수문자만 제거
    })
    .on("click", function (event, d) {
      handleRegionClick(d, event);
    })
    .on("mouseover", function (event, d) {
      const regionName =
        d.properties.CTP_KOR_NM ||
        d.properties.SIG_KOR_NM ||
        d.properties.name ||
        d.properties.NAME;
      const regionId =
        d.properties.CTP_ENG_NM ||
        d.properties.SIG_ENG_NM ||
        d.properties.id ||
        "unknown";
      const weather = weatherData[regionId] || "데이터 없음";
      const weatherText =
        weather === "hot"
          ? "덥다"
          : weather === "cold"
          ? "춥다"
          : weather === "normal"
          ? "보통"
          : "데이터 없음";

      // 호버 효과
      d3.select(this)
        .style("stroke-width", "2px")
        .style("filter", "brightness(1.2)");

      // 툴팁 표시
      tooltip
        .style("left", event.pageX + 10 + "px")
        .style("top", event.pageY - 10 + "px")
        .html(`<strong>${regionName}</strong><br/>체감온도: ${weatherText}`)
        .classed("show", true);
    })
    .on("mousemove", function (event) {
      tooltip
        .style("left", event.pageX + 10 + "px")
        .style("top", event.pageY - 10 + "px");
    })
    .on("mouseout", function () {
      // 호버 효과 제거
      d3.select(this).style("stroke-width", "1px").style("filter", "none");
      tooltip.classed("show", false);
    });

  // 지역 이름 라벨 추가 (시도급만 표시하여 가독성 확보)
  svg
    .selectAll(".region-label")
    .data(koreaRegions.features)
    .enter()
    .append("text")
    .attr("class", () => {
      const baseClass =
        currentMapLevel === "provinces"
          ? "region-label province"
          : "region-label municipality";
      return baseClass + "zoom-medium";
    })
    .attr("x", (d) => adjustLabelPosition(d)[0])
    .attr("y", (d) => adjustLabelPosition(d)[1])
    .text((d) => {
      const name =
        d.properties.CTP_KOR_NM || d.properties.name || d.properties.NAME;
      return name ? name.replace(/특별시|광역시|특별자치시|시|군/g, "") : "";
    });

  if (currentMapLevel === "municipalities") {
    setTimeout(() => {
      drawProvinceBoundaries();
    }, 100);
  }
}

// 특정 지역의 라벨 위치 조정 함수
function adjustLabelPosition(d) {
  const centroid = path.centroid(d);
  const name =
    d.properties.CTP_KOR_NM || d.properties.name || d.properties.NAME;

  // 독도 라벨 위치 조정 (울릉도 우측에 표시)
  if (name && name.includes("독도")) {
    return [centroid[0] + 10, centroid[1]]; // 우측으로 약간 이동
  }

  // 경기도 라벨 위치 조정
  if (name && name.includes("경기")) {
    return [centroid[0] + 20, centroid[1] + 30]; // 우측 하단으로 이동
  }

  return centroid;
}

async function drawProvinceBoundaries() {
  try {
    const response = await fetch("/static/data/skorea-provinces-2018-geo.json");
    const provinceData = await response.json();

    // 시군구 지도와 동일한 투영법으로 새로 생성
    const { width, height } = getMapDimensions();
    const boundaryProjection = d3.geoMercator().center([127.7, 36.0]);

    // 현재 시군구 지도(koreaRegions)와 동일하게 투영법 맞추기
    boundaryProjection.fitSize([width * 0.9, height * 0.9], koreaRegions);
    boundaryProjection.translate([width / 2, height / 2]);

    const boundaryPath = d3.geoPath().projection(boundaryProjection);

    svg
      .selectAll(".province-boundary")
      .data(provinceData.features)
      .enter()
      .append("path")
      .attr("class", "province-boundary")
      .attr("d", boundaryPath)
      .attr("transform", d3.zoomTransform(svg.node()));

    svg.selectAll(".region-label").each(function () {
      this.parentNode.appendChild(this);
    });
  } catch (error) {
    console.error("광역시/도 경계선 로드 실패:", error);
  }
}

// 지역 클릭 핸들러
function handleRegionClick(regionData, event) {
  const regionName =
    regionData.properties.CTP_KOR_NM ||
    regionData.properties.SIG_KOR_NM ||
    regionData.properties.name;

  if (currentMapLevel === "provinces") {
    selectedProvince = regionName;

    // 좌표를 미리 계산해서 전달
    const centroid = path.centroid(regionData);
    const svgRect = svg.node().getBoundingClientRect();
    const popupPosition = {
      x: centroid[0] + svgRect.left,
      y: centroid[1] + svgRect.top,
    };

    showProvinceStats(regionName, event, popupPosition);

    // 잠깐 후 시군구 지도로 전환
    // setTimeout(() => {
    //   // selectedProvince = regionName;
    //   // loadKoreaMap("municipalities");

    //   // 해당 지역으로 줌 인
    //   zoomToRegion(regionData);
    // }, 2000);
  } else {
    handleMunicipalityClick(regionName);
  }
}

function handleMunicipalityClick(regionName) {
  // selectedProvince가 있어도 항상 서버에서 정확한 광역시/도를 찾도록 수정
  console.log(
    "시군구 클릭:",
    regionName,
    "기존 selectedProvince:",
    selectedProvince
  );

  fetch(`/find_province_by_region?region=${encodeURIComponent(regionName)}`)
    .then((response) => response.json())
    .then((data) => {
      if (data.province) {
        selectedProvince = data.province; // 정확한 광역시/도로 업데이트
        console.log("정확한 광역시/도:", selectedProvince);
        loadRegionInfo(selectedProvince, regionName);
      } else {
        console.error("광역시/도를 찾을 수 없음:", data.error);
        loadRegionInfoFallback(regionName);
      }
    })
    .catch((error) => {
      console.error("광역시/도 찾기 실패:", error);
      loadRegionInfoFallback(regionName);
    });
}

// 지역 정보 로드 함수
function loadRegionInfo(province, regionName) {
  fetch(
    `/get_region_info?province=${encodeURIComponent(
      province
    )}&region=${encodeURIComponent(regionName)}`
  )
    .then((response) => response.json())
    .then((data) => {
      if (data.error) {
        console.error("지역 정보 오류:", data.error);
        loadRegionInfoFallback(regionName);
      } else {
        // 서버에서 받은 완전한 데이터로 팝업 표시
        showTemperaturePopup(
          {
            C: data.temperature,
            feeling: data.feeling,
            detailArray: data.detailArray,
          },
          regionName,
          province
        );
      }
    })
    .catch((error) => {
      console.error("지역 데이터 로드 실패:", error);
      loadRegionInfoFallback(regionName);
    });
}

// 실패 시 대체 방법 (기존 클라이언트 데이터 사용)
function loadRegionInfoFallback(regionName) {
  console.log("대체 방법으로 팝업 표시");
  const feeling = weatherData[regionName] || "normal";
  const regionDetailArray = detailArrays[regionName] || [0, 0, 0, 0];

  showTemperaturePopup(
    {
      C: null,
      feeling: feeling,
      detailArray: regionDetailArray,
    },
    regionName,
    selectedProvince || "알수없음"
  );
}

// 실제 투표 데이터를 서버에서 가져와서 지도에 적용
async function loadWeatherData() {
  try {
    let url = `/get_weather_data?level=${currentMapLevel}`;

    // 시군구 지도일 때는 선택된 광역시/도 정보 추가
    if (currentMapLevel === "municipalities" && selectedProvince) {
      url += `&province=${encodeURIComponent(selectedProvince)}`;
    }

    console.log("=== 서버 요청 URL ===", url);

    const response = await fetch(url);
    const data = await response.json();

    console.log("=== 서버 응답 데이터 ===", data);
    console.log("weather_stats:", data.weather_stats);
    console.log("detail_arrays:", data.detail_arrays);

    detailArrays = data.detail_arrays;
    window.detailArrays = data.detail_arrays;

    // 지도에 날씨 데이터 적용
    applyWeatherToMap(data.weather_stats);
  } catch (error) {
    console.error("날씨 데이터 로드 실패:", error);
  }
}

// 특정 지역으로 줌 인하는 함수 추가
function zoomToRegion(regionData) {
  const bounds = path.bounds(regionData);
  const dx = bounds[1][0] - bounds[0][0];
  const dy = bounds[1][1] - bounds[0][1];
  const x = (bounds[0][0] + bounds[1][0]) / 2;
  const y = (bounds[0][1] + bounds[1][1]) / 2;

  const { width, height } = getMapDimensions();
  const scale = Math.min(width / dx, height / dy) * 0.7; // 0.7은 여백을 위한 비율
  const translate = [width / 2 - scale * x, height / 2 - scale * y];

  // 부드러운 줌 애니메이션
  svg
    .transition()
    .duration(1000)
    .call(
      zoom.transform,
      d3.zoomIdentity.translate(translate[0], translate[1]).scale(scale)
    );
}

// 날씨 데이터를 지도에 적용하는 함수
function applyWeatherToMap(weatherStats) {
  if (!koreaRegions) return;

  console.log("=== 매칭 과정 디버깅 ===");
  console.log("서버에서 받은 weatherStats:", weatherStats);
  console.log("currentMapLevel:", currentMapLevel);

  const MERGE_CITIES = [
    "용인",
    "수원",
    "성남",
    "청주",
    "천안",
    "전주",
    "창원",
    "안양",
    "고양",
    "안산",
  ];
  let matchCount = 0;

  koreaRegions.features.forEach((region, index) => {
    let regionKey;

    if (currentMapLevel === "provinces") {
      const regionCode = region.properties.code;
      regionKey = getProvinceFromCode(regionCode);
    } else {
      // municipalities 레벨에서는 구를 시로 변환
      const originalName = region.properties.name;
      regionKey = originalName;

      // 구 → 시 변환
      for (const city of MERGE_CITIES) {
        if (originalName.includes(city)) {
          regionKey = city + "시";
          break;
        }
      }
    }

    const weather = weatherStats[regionKey] || "normal";

    if (weatherStats[regionKey]) {
      matchCount++;
      console.log(
        `매칭됨: ${region.properties.name} -> ${regionKey} -> ${weather}`
      );
    } else {
      console.log(`매칭안됨: ${region.properties.name} -> ${regionKey}`);
    }

    // DOM 요소 찾기 (한글 이름으로)
    const originalName = region.properties.name;
    const cleanId = originalName.replace(/[^가-힣a-zA-Z0-9]/g, "");
    const element = d3.select(`#${cleanId}`);

    if (!element.empty()) {
      element.attr("class", `region ${weather}`);
    } else {
      console.log(`DOM 요소 없음: ${cleanId}`);
    }
  });

  console.log(`총 ${matchCount}개 지역이 매칭됨`);
}
// 지도 초기화
function resetMap() {
  weatherData = {};
  if (svg.selectAll(".region").size() > 0) {
    svg.selectAll(".region").attr("class", "region");
  }

  // 시도별 지도로 돌아가기
  if (currentMapLevel === "municipalities") {
    loadKoreaMap("provinces");
  }
}

const zoom = d3
  .zoom()
  .scaleExtent([0.5, 10]) // 최소 0.5배, 최대 10배
  .on("zoom", handleZoom);

// 줌 임계값 설정
const ZOOM_THRESHOLD = 2; // n배 줌 시 시군구 지도로 전환
let isAutoSwitching = false; // 자동 전환 중인지 체크

function handleZoom(event) {
  const { transform } = event;

  // 지도 요소들에 변환 적용
  svg.selectAll("path").attr("transform", transform);
  svg.selectAll("text").attr("transform", transform);
  svg.selectAll(".province-boundary").attr("transform", transform);

  // 자동 전환 중이 아닐 때만 체크
  if (!isAutoSwitching) {
    checkZoomLevel(transform.k);
  }

  updateLabelSizes(transform.k);
}

// SVG에 줌 기능 적용
svg.call(zoom);

// 줌 레벨에 따른 라벨 크기 조정 함수
function updateLabelSizes(zoomLevel) {
  let sizeClass;

  // if (currentMapLevel === "provinces") {
  //   // 시도별 지도의 줌 기준
  //   if (zoomLevel < 0.3) {
  //     sizeClass = "zoom-small";
  //   } else if (zoomLevel < 1) {
  //     sizeClass = "zoom-medium";
  //   } else {
  //     sizeClass = "zoom-large";
  //   }
  // } else
  if (currentMapLevel === "municipalities") {
    // 시군구별 지도의 줌 기준
    if (zoomLevel < 3) {
      sizeClass = "zoom-small";
    } else if (zoomLevel < 4) {
      sizeClass = "zoom-medium";
    } else {
      sizeClass = "zoom-large";
    }
  }

  // 모든 라벨에서 기존 줌 클래스 제거
  svg
    .selectAll(".region-label")
    .classed("zoom-small zoom-medium zoom-large", false)
    .classed(sizeClass, true);
}

// 줌 레벨에 따른 지도 전환 체크
function checkZoomLevel(scale) {
  // 줌인: 시도별 → 시군구별
  if (scale >= ZOOM_THRESHOLD && currentMapLevel === "provinces") {
    console.log(`줌 레벨 ${scale.toFixed(2)} - 시군구별 지도로 전환`);
    autoSwitchToMunicipalities();
  }
  // 줌아웃: 시군구별 → 시도별
  else if (scale < ZOOM_THRESHOLD && currentMapLevel === "municipalities") {
    console.log(`줌 레벨 ${scale.toFixed(2)} - 시도별 지도로 전환`);
    autoSwitchToProvinces();
  }
}

// 시군구별 지도로 자동 전환
async function autoSwitchToMunicipalities() {
  isAutoSwitching = true;
  selectedProvince = null;

  // 현재 줌 상태 저장
  const currentTransform = d3.zoomTransform(svg.node());
  console.log("전환 전 transform:", currentTransform);

  try {
    await loadKoreaMap("municipalities");
    // 현재 transform 상태를 유지하면서 적용
    svg.call(zoom.transform, currentTransform);
    // currentMapLevel = "municipalities";
  } catch (error) {
    console.error("시군구 지도 전환 실패:", error);
  }

  currentMapLevel = "municipalities";
  setTimeout(() => {
    isAutoSwitching = false;
  }, 600); // 전환 애니메이션 완료 후
}

// 시도별 지도로 자동 전환
async function autoSwitchToProvinces() {
  isAutoSwitching = true;
  selectedProvince = null; // 필터 초기화

  try {
    await loadKoreaMap("provinces");

    // 줌 리셋 후 중앙 정렬
    const { width, height } = getMapDimensions();
    const newTransform = d3.zoomIdentity
      .translate(width / 2, height / 2) // 중앙으로
      .scale(1.0); // 기본 스케일

    // 부드러운 전환
    svg.transition().duration(500);
  } catch (error) {
    console.error("시도 지도 전환 실패:", error);
  }

  currentMapLevel = "provinces";

  setTimeout(() => {
    isAutoSwitching = false;
  }, 600); // 전환 애니메이션 완료 후
}

// 온도 데이터 업데이트 함수
async function updateTemperatureData() {
  try {
    console.log("온도 데이터 업데이트 요청 중...");
    const response = await fetch("/update_temperature_data", {
      method: "POST",
    });
    const result = await response.json();

    if (result.status === "success") {
      console.log(result.message);
      if (result.updated_count > 0) {
        console.log(`${result.updated_count}개 지역 데이터 갱신됨`);
      }
    } else {
      console.error("온도 데이터 업데이트 실패:", result.message);
    }
  } catch (error) {
    console.error("온도 데이터 업데이트 중 오류:", error);
  }
}

// // 지도 레벨 변경 시 온도 데이터 업데이트
// function onMapLevelChange() {
//   updateTemperatureData();
// }

window.addEventListener("resize", function () {
  const newDimensions = getMapDimensions();
  width = newDimensions.width;
  height = newDimensions.height;
  fitMapToScreen();
  drawMap();
});

// 초기 지도 로드
window.addEventListener("load", function () {
  // 시도별 지도로 시작
  loadKoreaMap("provinces");
});

// // 전역으로 노출하여 map.js에서 호출 가능하게 함
// window.onMapLevelChange = onMapLevelChange;

// // 페이지 새로고침 감지
// window.addEventListener("beforeunload", function () {
//   // 새로고침 시 온도 데이터 업데이트 요청
//   navigator.sendBeacon("/update_temperature_data", "");
// });

// // 페이지 로드 시 온도 데이터 업데이트
// window.addEventListener("load", function () {
//   updateTemperatureData();
// });
