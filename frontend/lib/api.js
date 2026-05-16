// ─── 데모 모드 토글 ────────────────────────────────────────────
window.DEMO_MODE = true;   // false → 실 API 호출

var BASE_URL = "http://localhost:8000";

// ─── 전역 상수 ─────────────────────────────────────────────────
var NATIVE_CONFIG = {
  "토종":   { bg: "bg-green-100",  text: "text-green-800",  label: "토종" },
  "외래종": { bg: "bg-red-100",    text: "text-red-800",    label: "외래종" },
  "불명확": { bg: "bg-gray-100",   text: "text-gray-700",   label: "불명확" },
};

var RARITY_CONFIG = {
  C: { label: "Common",      bg: "bg-slate-100",   text: "text-slate-700",  dot: "bg-slate-400" },
  U: { label: "Uncommon",    bg: "bg-blue-100",    text: "text-blue-700",   dot: "bg-blue-400" },
  R: { label: "Rare",        bg: "bg-purple-100",  text: "text-purple-700", dot: "bg-purple-400" },
  E: { label: "Endangered",  bg: "bg-orange-100",  text: "text-orange-700", dot: "bg-orange-400" },
  L: { label: "Endemic",     bg: "bg-emerald-100", text: "text-emerald-700",dot: "bg-emerald-400" },
};

// ─── 데모 데이터 ────────────────────────────────────────────────
var DEMO_IDENTIFY_RESULT = {
  korean_name: "구상나무",
  scientific_name: "Abies koreana",
  native_status: "토종",
  confidence: 0.95,
  ecology_summary: "한국 특산종으로 한라산·지리산·덕유산 고산지대에 서식합니다. 기후변화로 개체수가 급감하고 있으며 크리스마스트리의 원조 수종입니다.",
  conservation_status: "취약(VU) — IUCN 적색목록",
  morphological_clues: "잎 끝이 두 갈래로 오목하고, 솔방울이 자주색~보라색으로 위를 향해 달립니다.",
};

var DEMO_COLLECTION = [
  { id: 1, korean_name: "구상나무",   scientific_name: "Abies koreana",          native_status: "토종",   confidence: 0.95, ecology_summary: "한국 특산 고산수종", conservation_status: "취약(VU)", morphological_clues: "잎 끝 오목, 자주색 솔방울", image_path: "/assets/illustrations/구상나무.png",   memo: "", created_at: "2026-05-16T10:00:00" },
  { id: 2, korean_name: "황소개구리", scientific_name: "Lithobates catesbeianus", native_status: "외래종", confidence: 0.92, ecology_summary: "북미 원산 침입 외래종",   conservation_status: "생태계교란종",   morphological_clues: "고막이 눈보다 큼",       image_path: "/assets/illustrations/황소개구리.png", memo: "", created_at: "2026-05-16T11:00:00" },
  { id: 3, korean_name: "왜가리",     scientific_name: "Ardea cinerea",          native_status: "토종",   confidence: 0.88, ecology_summary: "하천·논에 사는 대형 왜가리",  conservation_status: "관심필요",       morphological_clues: "흰목·긴다리·회색날개",   image_path: "/assets/illustrations/왜가리.png",     memo: "", created_at: "2026-05-16T12:00:00" },
];

// ─── 유저 ID ────────────────────────────────────────────────────
function getOrCreateUserId() {
  var uid = localStorage.getItem("hanbando_uid");
  if (!uid) {
    uid = "u-" + Math.random().toString(36).slice(2, 10);
    localStorage.setItem("hanbando_uid", uid);
  }
  return uid;
}

// ─── API 함수 ───────────────────────────────────────────────────
async function identifySpecies(imageFile) {
  if (window.DEMO_MODE) {
    await new Promise(r => setTimeout(r, 1500));
    return DEMO_IDENTIFY_RESULT;
  }
  var form = new FormData();
  form.append("file", imageFile);
  var res = await fetch(BASE_URL + "/api/identify", { method: "POST", body: form });
  if (!res.ok) throw new Error("식별 실패: " + res.status);
  return res.json();
}

async function getCollection() {
  if (window.DEMO_MODE) return DEMO_COLLECTION;
  var res = await fetch(BASE_URL + "/api/collection");
  if (!res.ok) throw new Error("목록 조회 실패");
  return res.json();
}

async function addToCollection(result, imageUrl) {
  if (window.DEMO_MODE) {
    var item = Object.assign({}, result, { id: Date.now(), image_path: imageUrl || "", memo: "", created_at: new Date().toISOString() });
    DEMO_COLLECTION.unshift(item);
    return item;
  }
  var res = await fetch(BASE_URL + "/api/collection", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(Object.assign({}, result, { image_path: imageUrl || "" })),
  });
  if (!res.ok) throw new Error("저장 실패");
  return res.json();
}

async function getCollectionItem(itemId) {
  if (window.DEMO_MODE) return DEMO_COLLECTION.find(i => i.id === itemId) || null;
  var res = await fetch(BASE_URL + "/api/collection/" + itemId);
  if (!res.ok) throw new Error("조회 실패");
  return res.json();
}

async function deleteCollectionItem(itemId) {
  if (window.DEMO_MODE) {
    var idx = DEMO_COLLECTION.findIndex(i => i.id === itemId);
    if (idx !== -1) DEMO_COLLECTION.splice(idx, 1);
    return;
  }
  var res = await fetch(BASE_URL + "/api/collection/" + itemId, { method: "DELETE" });
  if (!res.ok) throw new Error("삭제 실패");
}
