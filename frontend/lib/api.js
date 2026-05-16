window.DEMO_MODE = false;
var BASE_URL = "";

// Design Ref: §5.1 — 사용자 식별자 부트스트랩 (URL ?u= > localStorage > 신규 UUID 16자)
var USER_ID = (function () {
  var params = new URLSearchParams(window.location.search);
  var uid = params.get("u") || localStorage.getItem("hanbando_uid") || "";
  if (!uid) {
    uid = (window.crypto && window.crypto.randomUUID)
      ? window.crypto.randomUUID().replace(/-/g, "").slice(0, 16)
      : "u" + Math.random().toString(36).slice(2, 12) + Math.random().toString(36).slice(2, 8);
  }
  localStorage.setItem("hanbando_uid", uid);
  if (params.get("u") !== uid) {
    params.set("u", uid);
    var newUrl = window.location.pathname + "?" + params.toString() + window.location.hash;
    history.replaceState(null, "", newUrl);
  }
  return uid;
})();

// Design Ref: §5.2 — collection API URL에 ?u= 자동 부착
function withUid(path) {
  return path + (path.indexOf("?") >= 0 ? "&" : "?") + "u=" + encodeURIComponent(USER_ID);
}

// 도감 데이터 캐시 (탭 전환 가속용)
var _collectionCache = null;
var _collectionCacheAt = 0;
var _inflightCollection = null;  // 동시 호출 dedup (race condition 방지)
var COLLECTION_CACHE_TTL_MS = 30000;  // 30초

function invalidateCollectionCache() {
  _collectionCache = null;
  _collectionCacheAt = 0;
  _inflightCollection = null;
}

// 이미지 프리로드 (브라우저 캐시 워밍업)
function preloadCollectionImages(items) {
  if (!Array.isArray(items)) return;
  items.forEach(function(it) {
    if (it && it.image_path && /^\/assets\//.test(it.image_path)) {
      var img = new Image();
      img.src = it.image_path;
    }
  });
}

// 전역 노출 (다른 컴포넌트에서 invalidate 호출용)
if (typeof window !== "undefined") {
  window.invalidateCollectionCache = invalidateCollectionCache;
}

// ── 희귀도 맵 (korean_name → L/E/R/U/C) ─────────────────────
var RARITY_MAP = {
  // L (전설/멸종위기 1급)
  "미선나무":"L","한라솜다리":"L","미호종개":"L","꼬치동자개":"L","따오기":"L","개느삼":"L",
  // E (특산/지역한정)
  "구상나무":"E","반달가슴곰":"E","수달":"E","황새":"E","두루미":"E","금개구리":"E",
  "가시딸기":"E",
  // R (희귀/멸종위기 2급/한국 특산)
  "금강초롱꽃":"R","맹꽁이":"R","삵":"R","참수리":"R","수리부엉이":"R","분홍바늘꽃":"R",
  "꽃사슴":"R","동강할미꽃":"R","노랑무늬붓꽃":"R","곰취":"R",
  "노랑갈퀴":"R","가시복분자딸기":"R","각시서덜취":"R",
  "노랑붓꽃":"R","나도승마":"R","금꿩의다리":"R",
  // U (비범/지역흔함)
  "갈퀴아재비":"U","고려엉겅퀴":"U","왜가리":"U","너구리":"U","고라니":"U",
  "좀민들레":"U","은행나무":"U","진달래":"U","개족도리풀":"U",
  // C (평범/외래종/흔함)
  "개나리":"C","철쭉":"C","무궁화":"C","소나무":"C","참나무":"C","황소개구리":"C",
  "돼지풀":"C","단풍잎돼지풀":"C","미국쑥부쟁이":"C","양미역취":"C","가시박":"C",
};

var RARITY_CONFIG = {
  L:{ label:"LEGENDARY", bg:"var(--L-bg)", bd:"var(--L-bd)", color:"var(--L)", dot:"#C99227" },
  E:{ label:"ENDEMIC",   bg:"var(--E-bg)", bd:"var(--E-bd)", color:"var(--E)", dot:"#8B5CF6" },
  R:{ label:"RARE",      bg:"var(--R-bg)", bd:"var(--R-bd)", color:"var(--R)", dot:"#2563EB" },
  U:{ label:"UNCOMMON",  bg:"var(--U-bg)", bd:"var(--U-bd)", color:"var(--U)", dot:"#16A34A" },
  C:{ label:"COMMON",    bg:"var(--C-bg)", bd:"var(--C-bd)", color:"var(--C)", dot:"#6B7280" },
};

var NATIVE_CONFIG = {
  "토종":   { bg:"rgba(231,245,236,0.95)", bd:"var(--U-bd)", color:"var(--native)", label:"토종" },
  "외래종": { bg:"rgba(254,231,231,0.95)", bd:"rgba(220,38,38,0.35)", color:"var(--invasive)", label:"외래종" },
  "불명확": { bg:"rgba(239,241,244,0.95)", bd:"var(--C-bd)", color:"var(--ink-3)", label:"불명확" },
};

function getRarity(koreanName) {
  return RARITY_MAP[koreanName] || "C";
}

function cleanSpeciesText(value) {
  return (value || "").toString().trim();
}

function normalizeSpeciesText(value) {
  return cleanSpeciesText(value).toLowerCase();
}

function isSameSpecies(a, b) {
  var aKorean = cleanSpeciesText(a && a.korean_name);
  var bKorean = cleanSpeciesText(b && b.korean_name);
  if (aKorean && bKorean && aKorean === bKorean) return true;

  var aScientific = normalizeSpeciesText(a && a.scientific_name);
  var bScientific = normalizeSpeciesText(b && b.scientific_name);
  return !!(aScientific && bScientific && aScientific === bScientific);
}

function getCreatedTime(item) {
  var time = Date.parse(item && item.created_at ? item.created_at : "");
  return Number.isNaN(time) ? 0 : time;
}

function getUniqueCollectionItems(items) {
  var groups = [];
  (items || []).forEach(function(item) {
    var index = groups.findIndex(function(group) {
      return isSameSpecies(group.item, item);
    });

    if (index === -1) {
      groups.push({ item:Object.assign({}, item), count:1 });
      return;
    }

    groups[index].count += 1;
    if (getCreatedTime(item) >= getCreatedTime(groups[index].item)) {
      groups[index].item = Object.assign({}, item);
    }
  });

  return groups.map(function(group) {
    return Object.assign({}, group.item, { observation_count:group.count });
  }).sort(function(a, b) {
    return (getCreatedTime(b) - getCreatedTime(a)) || ((b.id || 0) - (a.id || 0));
  });
}

function findCollectedItem(items, candidate) {
  return getUniqueCollectionItems(items).find(function(item) {
    return isSameSpecies(item, candidate);
  }) || null;
}

// ── 데모 데이터 ───────────────────────────────────────────────
var DEMO_RESULTS = [
  { korean_name:"구상나무",   scientific_name:"Abies koreana",              native_status:"토종",   confidence:0.95, ecology_summary:"한국 특산종으로 한라산·지리산·덕유산 고산지대에 서식합니다. 기후변화로 개체수가 급감하고 있으며 크리스마스트리의 원조 수종입니다.", conservation_status:"취약(VU) — IUCN 적색목록", morphological_clues:"잎 끝이 두 갈래로 오목하고, 솔방울이 자주색~보라색으로 위를 향해 달립니다." },
  { korean_name:"황소개구리", scientific_name:"Lithobates catesbeianus",     native_status:"외래종", confidence:0.92, ecology_summary:"북미 원산의 대형 침입 외래종으로 토종 양서류를 위협합니다. 고막이 눈보다 크게 발달한 것이 특징입니다.", conservation_status:"생태계교란 야생생물", morphological_clues:"고막이 눈 지름보다 크고, 등이 올리브색~갈색, 울음소리가 매우 큽니다." },
  { korean_name:"왜가리",     scientific_name:"Ardea cinerea",               native_status:"토종",   confidence:0.88, ecology_summary:"하천·호수·논에서 물고기를 잡아먹는 대형 조류입니다. 집단으로 번식하며 나무 위에 둥지를 틉니다.", conservation_status:"관심필요(LC)", morphological_clues:"흰색 머리에 검은 눈선, 회색 날개, 목이 S자로 굽어 비행합니다." },
  { korean_name:"반달가슴곰", scientific_name:"Ursus thibetanus ussuricus",  native_status:"토종",   confidence:0.97, ecology_summary:"지리산에서 복원 중인 한국 대표 멸종위기종입니다. 가슴의 흰 반달무늬가 특징이며 잡식성입니다.", conservation_status:"멸종위기 I급 / EN", morphological_clues:"가슴 중앙의 V자형 흰 반달무늬, 검은 털, 짧은 주둥이." },
  { korean_name:"따오기",     scientific_name:"Nipponia nippon",             native_status:"토종",   confidence:0.99, ecology_summary:"1979년 국내 절종 후 중국 개체로 복원 중인 국보급 조류입니다. 논과 습지에서 미꾸라지를 잡아먹습니다.", conservation_status:"멸종위기 I급 / EN", morphological_clues:"흰 깃털에 붉은 얼굴, 긴 아래로 굽은 부리, 날 때 분홍빛 날개 안쪽이 보입니다." },
  { korean_name:"수달",       scientific_name:"Lutra lutra",                 native_status:"토종",   confidence:0.91, ecology_summary:"맑은 하천에 서식하는 수중 포유류입니다. 어류를 주식으로 하며 천연기념물로 지정돼 있습니다.", conservation_status:"멸종위기 I급 / NT", morphological_clues:"납작한 머리, 짧은 다리, 굵은 꼬리, 물에 젖지 않는 짙은 갈색 털." },
  { korean_name:"삵",         scientific_name:"Prionailurus bengalensis",    native_status:"토종",   confidence:0.89, ecology_summary:"산림과 계곡에 서식하는 한국 유일의 야생 고양이과 동물입니다. 야행성으로 소형 포유류를 포식합니다.", conservation_status:"멸종위기 II급 / LC", morphological_clues:"황갈색 바탕에 검은 반점, 얼굴 양쪽에 흰 줄무늬 두 개." },
  { korean_name:"무궁화",     scientific_name:"Hibiscus syriacus",           native_status:"토종",   confidence:0.85, ecology_summary:"대한민국 국화로 여름부터 가을까지 꽃을 피웁니다. 한 그루에서 약 100일간 꽃이 지속적으로 핍니다.", conservation_status:"관심필요(LC)", morphological_clues:"홑꽃 또는 겹꽃, 꽃잎 5장, 중심부 적색 단심, 수술대가 합쳐진 단체수술." },
  { korean_name:"두루미",     scientific_name:"Grus japonensis",             native_status:"토종",   confidence:0.96, ecology_summary:"DMZ 일대에서 월동하는 세계 최대의 두루미 도래지를 보유하고 있습니다. 평생 짝을 바꾸지 않습니다.", conservation_status:"멸종위기 I급 / VU", morphological_clues:"전체 흰색, 붉은 정수리, 검은 목·얼굴, 비행 시 검은 날개 끝." },
  { korean_name:"소나무",     scientific_name:"Pinus densiflora",            native_status:"토종",   confidence:0.82, ecology_summary:"한국의 산림을 대표하는 수종으로 척박한 땅에서도 잘 자랍니다. 줄기가 붉은빛을 띠는 것이 특징입니다.", conservation_status:"관심필요(LC)", morphological_clues:"붉은 줄기 껍질, 두 개씩 묶인 바늘잎, 달걀형 솔방울." },
  { korean_name:"금개구리",   scientific_name:"Pelophylax chosenicus",       native_status:"토종",   confidence:0.94, ecology_summary:"한국 고유의 논개구리로 등에 금색 줄무늬가 두 줄 있습니다. 논 습지 감소로 급격히 줄어들고 있습니다.", conservation_status:"멸종위기 II급 / VU", morphological_clues:"등 양옆에 선명한 금색(황금색) 융기선 두 줄, 초록~갈색 바탕." },
  { korean_name:"수리부엉이", scientific_name:"Bubo bubo",                   native_status:"토종",   confidence:0.90, ecology_summary:"한국에서 가장 큰 올빼미류로 암벽에 둥지를 틉니다. 주로 야행성이며 토끼·꿩 등을 포식합니다.", conservation_status:"멸종위기 II급 / LC", morphological_clues:"귀깃이 뚜렷하게 솟아오름, 황색 눈, 갈색 줄무늬 몸통, 날개폭 최대 188cm." },
];

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
  if (window.DEMO_MODE) {
    await new Promise(r=>setTimeout(r,1800));
    return DEMO_RESULTS[Math.floor(Math.random()*DEMO_RESULTS.length)];
  }
  var form = new FormData(); form.append("file", imageFile);
  var res = await fetch(BASE_URL+"/api/identify",{method:"POST",body:form});
  if (!res.ok) throw new Error("식별 실패: "+res.status);
  return res.json();
}

async function getCollection() {
  if (window.DEMO_MODE) return DEMO_COLLECTION;
  // 캐시 hit
  if (_collectionCache && (Date.now() - _collectionCacheAt) < COLLECTION_CACHE_TTL_MS) {
    return _collectionCache;
  }
  // 동시 호출 dedup: 이미 fetch 중이면 같은 promise 반환
  if (_inflightCollection) return _inflightCollection;
  _inflightCollection = (async () => {
    try {
      var res = await fetch(BASE_URL+withUid("/api/collection"));
      if (!res.ok) throw new Error("목록 조회 실패");
      var data = await res.json();
      _collectionCache = data;
      _collectionCacheAt = Date.now();
      try { preloadCollectionImages(data); } catch(_) {}
      return data;
    } finally {
      _inflightCollection = null;
    }
  })();
  return _inflightCollection;
}

async function addToCollection(result, imageUrl) {
  if (window.DEMO_MODE) {
    var item = Object.assign({},result,{id:Date.now(),image_path:imageUrl||"",memo:"",created_at:new Date().toISOString()});
    DEMO_COLLECTION.unshift(item);
    invalidateCollectionCache();
    return item;
  }
  var res = await fetch(BASE_URL+withUid("/api/collection"),{
    method:"POST", headers:{"Content-Type":"application/json"},
    body:JSON.stringify(Object.assign({},result,{image_path:imageUrl||""})),
  });
  if (!res.ok) throw new Error("저장 실패");
  var saved = await res.json();
  invalidateCollectionCache();  // 신규 종 추가됨 → 캐시 무효화
  return saved;
}

async function deleteCollectionItem(itemId) {
  if (window.DEMO_MODE) {
    var i=DEMO_COLLECTION.findIndex(x=>x.id===itemId);
    if(i!==-1)DEMO_COLLECTION.splice(i,1);
    invalidateCollectionCache();
    return;
  }
  await fetch(BASE_URL+withUid("/api/collection/"+itemId),{method:"DELETE"});
  invalidateCollectionCache();
}
