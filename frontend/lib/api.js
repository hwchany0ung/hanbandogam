window.DEMO_MODE = true;
var BASE_URL = "http://localhost:8000";

// ── 희귀도 맵 (korean_name → L/E/R/U/C) ─────────────────────
var RARITY_MAP = {
  "미선나무":"L","한라솜다리":"L","미호종개":"L","꼬치동자개":"L","따오기":"L",
  "구상나무":"E","반달가슴곰":"E","수달":"E","황새":"E","두루미":"E","금개구리":"E",
  "금강초롱꽃":"R","맹꽁이":"R","삵":"R","참수리":"R","수리부엉이":"R","분홍바늘꽃":"R",
  "꽃사슴":"R","동강할미꽃":"R","노랑무늬붓꽃":"R","곰취":"R","고려엉겅퀴":"U",
  "왜가리":"U","너구리":"U","고라니":"U","좀민들레":"U","은행나무":"U","진달래":"U",
  "개나리":"C","철쭉":"C","무궁화":"C","소나무":"C","참나무":"C","황소개구리":"C",
};

var RARITY_CONFIG = {
  L:{ label:"LEGENDARY", bg:"var(--L-bg)", bd:"var(--L-bd)", color:"var(--L)", dot:"#C99227" },
  E:{ label:"ENDEMIC",   bg:"var(--E-bg)", bd:"var(--E-bd)", color:"var(--E)", dot:"#8B5CF6" },
  R:{ label:"RARE",      bg:"var(--R-bg)", bd:"var(--R-bd)", color:"var(--R)", dot:"#2563EB" },
  U:{ label:"UNCOMMON",  bg:"var(--U-bg)", bd:"var(--U-bd)", color:"var(--U)", dot:"#16A34A" },
  C:{ label:"COMMON",    bg:"var(--C-bg)", bd:"var(--C-bd)", color:"var(--C)", dot:"#6B7280" },
};

var NATIVE_CONFIG = {
  "토종":   { bg:"rgba(231,245,236,0.95)", bd:"var(--U-bd)", color:"var(--native)", label:"🇰🇷 토종" },
  "외래종": { bg:"rgba(254,231,231,0.95)", bd:"rgba(220,38,38,0.35)", color:"var(--invasive)", label:"🚨 외래종" },
  "불명확": { bg:"rgba(239,241,244,0.95)", bd:"var(--C-bd)", color:"var(--ink-3)", label:"❓ 불명확" },
};

function getRarity(koreanName) {
  return RARITY_MAP[koreanName] || "C";
}

// ── 데모 데이터 ───────────────────────────────────────────────
var DEMO_IDENTIFY_RESULT = {
  korean_name:"구상나무", scientific_name:"Abies koreana",
  native_status:"토종", confidence:0.95,
  ecology_summary:"한국 특산종으로 한라산·지리산·덕유산 고산지대에 서식합니다. 기후변화로 개체수가 급감하고 있으며 크리스마스트리의 원조 수종입니다.",
  conservation_status:"취약(VU) — IUCN 적색목록",
  morphological_clues:"잎 끝이 두 갈래로 오목하고, 솔방울이 자주색~보라색으로 위를 향해 달립니다.",
};

var DEMO_COLLECTION = [
  { id:1, korean_name:"구상나무",   scientific_name:"Abies koreana",           native_status:"토종",   confidence:0.95, ecology_summary:"한국 특산 고산수종", conservation_status:"취약(VU)", morphological_clues:"잎 끝 오목, 자주색 솔방울", image_path:"/assets/illustrations/구상나무.svg",   memo:"", created_at:"2026-05-16T10:00:00" },
  { id:2, korean_name:"황소개구리", scientific_name:"Lithobates catesbeianus",  native_status:"외래종", confidence:0.92, ecology_summary:"북미 원산 침입 외래종",  conservation_status:"생태계교란종",  morphological_clues:"고막이 눈보다 큼",       image_path:"/assets/illustrations/황소개구리.svg", memo:"", created_at:"2026-05-16T11:00:00" },
  { id:3, korean_name:"왜가리",     scientific_name:"Ardea cinerea",           native_status:"토종",   confidence:0.88, ecology_summary:"하천·논에 사는 대형 왜가리", conservation_status:"관심필요",      morphological_clues:"흰목·긴다리·회색날개", image_path:"/assets/illustrations/왜가리.svg",     memo:"", created_at:"2026-05-16T12:00:00" },
];

function getOrCreateUserId() {
  var uid = localStorage.getItem("hanbando_uid");
  if (!uid) { uid = "u-" + Math.random().toString(36).slice(2,10); localStorage.setItem("hanbando_uid", uid); }
  return uid;
}

async function identifySpecies(imageFile) {
  if (window.DEMO_MODE) { await new Promise(r=>setTimeout(r,1800)); return DEMO_IDENTIFY_RESULT; }
  var form = new FormData(); form.append("file", imageFile);
  var res = await fetch(BASE_URL+"/api/identify",{method:"POST",body:form});
  if (!res.ok) throw new Error("식별 실패: "+res.status);
  return res.json();
}

async function getCollection() {
  if (window.DEMO_MODE) return DEMO_COLLECTION;
  var res = await fetch(BASE_URL+"/api/collection");
  if (!res.ok) throw new Error("목록 조회 실패");
  return res.json();
}

async function addToCollection(result, imageUrl) {
  if (window.DEMO_MODE) {
    var item = Object.assign({},result,{id:Date.now(),image_path:imageUrl||"",memo:"",created_at:new Date().toISOString()});
    DEMO_COLLECTION.unshift(item); return item;
  }
  var res = await fetch(BASE_URL+"/api/collection",{
    method:"POST", headers:{"Content-Type":"application/json"},
    body:JSON.stringify(Object.assign({},result,{image_path:imageUrl||""})),
  });
  if (!res.ok) throw new Error("저장 실패");
  return res.json();
}

async function deleteCollectionItem(itemId) {
  if (window.DEMO_MODE) { var i=DEMO_COLLECTION.findIndex(x=>x.id===itemId); if(i!==-1)DEMO_COLLECTION.splice(i,1); return; }
  await fetch(BASE_URL+"/api/collection/"+itemId,{method:"DELETE"});
}
