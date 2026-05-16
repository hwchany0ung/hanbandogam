var API_BASE_URL = window.API_BASE_URL || "http://localhost:8000";
var COLLECTION_TOTAL = 102;

var RARITY_CONFIG = {
  L: { label: "LEGENDARY", short: "L", color: "var(--L)", className: "rarity-L" },
  E: { label: "EPIC", short: "E", color: "var(--E)", className: "rarity-E" },
  R: { label: "RARE", short: "R", color: "var(--R)", className: "rarity-R" },
  U: { label: "UNCOMMON", short: "U", color: "var(--U)", className: "rarity-U" },
  C: { label: "COMMON", short: "C", color: "var(--C)", className: "rarity-C" },
};

var NATIVE_CONFIG = {
  "토종": {
    label: "토종",
    className: "native-native",
    bg: "bg-emerald-100",
    text: "text-emerald-800",
  },
  "외래종": {
    label: "외래종",
    className: "native-invasive",
    bg: "bg-rose-100",
    text: "text-rose-800",
  },
  "불명확": {
    label: "불명확",
    className: "native-unknown",
    bg: "bg-stone-100",
    text: "text-stone-700",
  },
};

window.RARITY_CONFIG = RARITY_CONFIG;
window.NATIVE_CONFIG = NATIVE_CONFIG;
window.COLLECTION_TOTAL = COLLECTION_TOTAL;

function getApiUrl(path) {
  if (path.indexOf("http") === 0) {
    return path;
  }

  return API_BASE_URL.replace(/\/$/, "") + path;
}

async function parseJsonResponse(response) {
  var text = await response.text();
  var data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    var detail = data && data.detail ? data.detail : "요청 처리에 실패했습니다.";
    throw new Error(detail);
  }

  return data;
}

async function identifySpecies(imageFile, memo) {
  var formData = new FormData();
  formData.append("file", imageFile);
  formData.append("memo", memo || "");

  var response = await fetch(getApiUrl("/api/identify"), {
    method: "POST",
    body: formData,
  });

  return parseJsonResponse(response);
}

async function getCollection() {
  var response = await fetch(getApiUrl("/api/collection"));
  return parseJsonResponse(response);
}

async function addToCollection(result, imageUrl) {
  var body = {
    species_id: result.species_id || null,
    korean_name: result.korean_name,
    scientific_name: result.scientific_name,
    native_status: result.native_status,
    confidence: result.confidence,
    ecology_summary: result.ecology_summary || "",
    conservation_status: result.conservation_status || "",
    morphological_clues: result.morphological_clues || "",
    image_path: imageUrl || result.image_path || "",
    memo: result.memo || "",
  };

  var response = await fetch(getApiUrl("/api/collection"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  return parseJsonResponse(response);
}

async function getCollectionItem(itemId) {
  var response = await fetch(getApiUrl("/api/collection/" + itemId));
  return parseJsonResponse(response);
}

async function deleteCollectionItem(itemId) {
  var response = await fetch(getApiUrl("/api/collection/" + itemId), {
    method: "DELETE",
  });

  await parseJsonResponse(response);
}

async function getSpeciesDetail(speciesId) {
  return getCollectionItem(speciesId);
}

function getOrCreateUserId() {
  var storageKey = "hanbando_uid";
  var existingId = localStorage.getItem(storageKey);

  if (existingId) {
    return existingId;
  }

  var newId =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : "hb-" + Date.now() + "-" + Math.random().toString(16).slice(2);

  localStorage.setItem(storageKey, newId);
  return newId;
}
