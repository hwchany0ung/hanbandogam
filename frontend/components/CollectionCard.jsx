var ILLUSTRATION_MAP = {
  // PNG 수묵화 (manifest 식물)
  "가시딸기":       "/assets/illustrations/plant_001_가시딸기.png",
  "가시복분자딸기": "/assets/illustrations/plant_002_가시복분자딸기.png",
  "각시서덜취":     "/assets/illustrations/plant_003_각시서덜취.png",
  "갈퀴아재비":     "/assets/illustrations/plant_004_갈퀴아재비.png",
  "개느삼":         "/assets/illustrations/plant_005_개느삼.png",
  "개족도리풀":     "/assets/illustrations/plant_006_개족도리풀.png",
  "곰취":           "/assets/illustrations/plant_007_곰취.png",
  "고려엉겅퀴":     "/assets/illustrations/plant_008_고려엉겅퀴.png",
  "구상나무":       "/assets/illustrations/plant_009_구상나무.png",
  "금강초롱꽃":     "/assets/illustrations/plant_010_금강초롱꽃.png",
  "금꿩의다리":     "/assets/illustrations/plant_011_금꿩의다리.png",
  "나도승마":       "/assets/illustrations/plant_012_나도승마.png",
  "나래완두":       "/assets/illustrations/plant_013_나래완두.png",
  "넓은잎쥐오줌풀": "/assets/illustrations/plant_014_넓은잎쥐오줌풀.png",
  "노랑갈퀴":       "/assets/illustrations/plant_015_노랑갈퀴.png",
  "노랑무늬붓꽃":   "/assets/illustrations/plant_016_노랑무늬붓꽃.png",
  "노랑붓꽃":       "/assets/illustrations/plant_017_노랑붓꽃.png",
  "노랑팽나무":     "/assets/illustrations/plant_018_노랑팽나무.png",
  "동강할미꽃":     "/assets/illustrations/plant_024_동강할미꽃.png",
  "할미꽃":         "/assets/illustrations/plant_024_동강할미꽃.png",
  "미선나무":       "/assets/illustrations/plant_030_미선나무.png",
  "좀민들레":       "/assets/illustrations/plant_074_좀민들레.png",
  "가시박":         "/assets/illustrations/plant_102_가시박.png",
  "단풍잎돼지풀":   "/assets/illustrations/plant_103_단풍잎돼지풀.png",
  "돼지풀":         "/assets/illustrations/plant_104_돼지풀.png",
  "미국쑥부쟁이":   "/assets/illustrations/plant_105_미국쑥부쟁이.png",
  "양미역취":       "/assets/illustrations/plant_106_양미역취.png",
  // Replicate flux-schnell 시연용 종
  "한라솜다리":     "/assets/illustrations/한라솜다리.png",
  "분홍바늘꽃":     "/assets/illustrations/분홍바늘꽃.png",
  "진달래":         "/assets/illustrations/진달래.png",
  // SVG (legacy 동물 — PNG 캐싱 미대상)
  "황소개구리":"/assets/illustrations/황소개구리.svg",
  "왜가리":"/assets/illustrations/왜가리.svg",
  "반달가슴곰":"/assets/illustrations/반달가슴곰.svg","수달":"/assets/illustrations/수달.svg",
  "삵":"/assets/illustrations/삵.svg","두루미":"/assets/illustrations/두루미.svg",
  "황새":"/assets/illustrations/황새.svg","따오기":"/assets/illustrations/따오기.svg",
  "수리부엉이":"/assets/illustrations/수리부엉이.svg","참수리":"/assets/illustrations/참수리.svg",
  "꽃사슴":"/assets/illustrations/꽃사슴.svg","고라니":"/assets/illustrations/고라니.svg",
  "너구리":"/assets/illustrations/너구리.svg","맹꽁이":"/assets/illustrations/맹꽁이.svg",
  "금개구리":"/assets/illustrations/금개구리.svg","꼬치동자개":"/assets/illustrations/꼬치동자개.svg",
  "미호종개":"/assets/illustrations/미호종개.svg",
};

var RARITY_OWNERSHIP_PCT = { L:"0.3", E:"1.2", R:"4.5", U:"15", C:"40" };

// 이야기 데이터는 frontend/data/stories.json 에서 사전 로드 (window.STORIES_DATA).
// 신규 종은 backend story_trigger → GH workflow → Claude API 로 자동 생성됨.

var FALLBACK = "/assets/illustrations/fallback.svg";

// 도감에 없는 새 종은 자동으로 식물도감풍 일러스트 생성
var RARITY_HEX    = { L:"#C99227", E:"#8B5CF6", R:"#2563EB", U:"#16A34A", C:"#6B7280" };
var RARITY_BG_HEX = { L:"#FBF3DC", E:"#F3EDFE", R:"#E8F0FE", U:"#E7F5EC", C:"#EFF1F4" };

function generateIllustration(name, rarity) {
  var flower    = RARITY_HEX[rarity] || RARITY_HEX.C;
  var paperBg   = "#FBF7EC";   // 한지 크림
  var leafLight = "#9DB87A";   // 연한 잎
  var leafDark  = "#6B8E4E";   // 진한 잎
  var stem      = "#7A6549";   // 줄기 갈색
  var ink       = "#5C5345";   // 잉크

  // 종명 해시로 변이 (같은 종은 항상 같은 모양, 다른 종은 다른 모양)
  var seed = 0;
  for (var i = 0; i < (name||"").length; i++) seed = (seed * 31 + name.charCodeAt(i)) % 10000;
  var flip       = (seed % 2) === 0 ? 1 : -1;
  var stemBend   = ((seed >> 1) % 5) - 2;
  var flowerYOff = ((seed >> 3) % 4);
  var leafScale  = (1 + ((seed >> 5) % 3) * 0.08).toFixed(2);
  var bendL      = 8 + ((seed >> 7) % 6);
  var bendR      = 8 + ((seed >> 11) % 6);

  var svg =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">' +
      // 한지 배경
      '<rect width="100" height="100" fill="' + paperBg + '"/>' +
      // 한지 텍스처 점
      '<circle cx="14" cy="22" r="0.7" fill="#C8BDA8" opacity="0.45"/>' +
      '<circle cx="85" cy="18" r="0.6" fill="#C8BDA8" opacity="0.4"/>' +
      '<circle cx="20" cy="78" r="0.7" fill="#C8BDA8" opacity="0.4"/>' +
      '<circle cx="82" cy="75" r="0.5" fill="#C8BDA8" opacity="0.45"/>' +
      '<circle cx="48" cy="10" r="0.4" fill="#C8BDA8" opacity="0.4"/>' +
      '<circle cx="10" cy="50" r="0.5" fill="#C8BDA8" opacity="0.35"/>' +
      '<circle cx="92" cy="48" r="0.6" fill="#C8BDA8" opacity="0.4"/>' +
      // 메인 줄기 (자연스러운 S 곡선)
      '<path d="M50 92 Q ' + (48 + stemBend) + ' 72 ' + (52 + stemBend*flip) + ' 52 Q ' + (48 + stemBend) + ' 28 50 16" stroke="' + stem + '" stroke-width="1.5" fill="none" opacity="0.7" stroke-linecap="round"/>' +
      // 좌측 분기 줄기
      '<path d="M' + (49 + stemBend) + ' 62 Q 40 56 ' + (30 - bendL*0.3) + ' 47" stroke="' + stem + '" stroke-width="1" fill="none" opacity="0.55" stroke-linecap="round"/>' +
      // 우측 분기 줄기
      '<path d="M' + (51 + stemBend) + ' 47 Q 62 42 ' + (72 + bendR*0.3) + ' 32" stroke="' + stem + '" stroke-width="1" fill="none" opacity="0.55" stroke-linecap="round"/>' +
      // 좌측 큰 잎 (분기 끝, 길쭉)
      '<g transform="translate(' + (30 - bendL*0.3) + ' 47) rotate(-' + bendL + ')">' +
        '<ellipse rx="' + (8.5*leafScale) + '" ry="' + (3.8*leafScale) + '" fill="' + leafLight + '" opacity="0.78"/>' +
        '<line x1="-' + (7.5*leafScale) + '" y1="0" x2="' + (7.5*leafScale) + '" y2="0" stroke="' + leafDark + '" stroke-width="0.4" opacity="0.7"/>' +
      '</g>' +
      // 우측 큰 잎 (분기 끝)
      '<g transform="translate(' + (72 + bendR*0.3) + ' 32) rotate(' + bendR + ')">' +
        '<ellipse rx="' + (8.5*leafScale) + '" ry="' + (3.8*leafScale) + '" fill="' + leafLight + '" opacity="0.78"/>' +
        '<line x1="-' + (7.5*leafScale) + '" y1="0" x2="' + (7.5*leafScale) + '" y2="0" stroke="' + leafDark + '" stroke-width="0.4" opacity="0.7"/>' +
      '</g>' +
      // 좌측 중간 잎
      '<g transform="translate(38 56) rotate(-30)">' +
        '<ellipse rx="6" ry="3" fill="' + leafLight + '" opacity="0.62"/>' +
        '<line x1="-5" y1="0" x2="5" y2="0" stroke="' + leafDark + '" stroke-width="0.3" opacity="0.6"/>' +
      '</g>' +
      // 우측 중간 잎
      '<g transform="translate(62 38) rotate(22)">' +
        '<ellipse rx="6" ry="3" fill="' + leafLight + '" opacity="0.62"/>' +
        '<line x1="-5" y1="0" x2="5" y2="0" stroke="' + leafDark + '" stroke-width="0.3" opacity="0.6"/>' +
      '</g>' +
      // 좌측 하단 작은 잎
      '<g transform="translate(36 76) rotate(-42)">' +
        '<ellipse rx="5" ry="2.5" fill="' + leafLight + '" opacity="0.55"/>' +
      '</g>' +
      // 우측 하단 작은 잎
      '<g transform="translate(64 78) rotate(38)">' +
        '<ellipse rx="5" ry="2.5" fill="' + leafLight + '" opacity="0.55"/>' +
      '</g>' +
      // 메인 꽃 (5장 꽃잎 + 노란 꽃술)
      '<g transform="translate(50 ' + (16 + flowerYOff) + ')">' +
        '<circle cx="-4" cy="-2" r="3.3" fill="' + flower + '" opacity="0.8"/>' +
        '<circle cx="4" cy="-2" r="3.3" fill="' + flower + '" opacity="0.8"/>' +
        '<circle cx="-3" cy="4" r="3.3" fill="' + flower + '" opacity="0.8"/>' +
        '<circle cx="3" cy="4" r="3.3" fill="' + flower + '" opacity="0.8"/>' +
        '<circle cx="0" cy="-5.5" r="3.3" fill="' + flower + '" opacity="0.8"/>' +
        '<circle cx="0" cy="0" r="2.3" fill="#FCEEA8"/>' +
      '</g>' +
      // 좌측 분기 끝 작은 꽃
      '<circle cx="' + (30 - bendL*0.3) + '" cy="47" r="2.6" fill="' + flower + '" opacity="0.68"/>' +
      '<circle cx="' + (30 - bendL*0.3) + '" cy="47" r="1.2" fill="#FCEEA8"/>' +
      // 우측 분기 끝 작은 꽃
      '<circle cx="' + (72 + bendR*0.3) + '" cy="32" r="2.6" fill="' + flower + '" opacity="0.68"/>' +
      '<circle cx="' + (72 + bendR*0.3) + '" cy="32" r="1.2" fill="#FCEEA8"/>' +
      // 종명 라벨
      '<text x="50" y="97" text-anchor="middle" font-family="Noto Serif KR, serif" font-size="5" font-weight="600" fill="' + ink + '" opacity="0.85">' + (name||"") + '</text>' +
    '</svg>';
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}

function CollectionCard({ item, onDelete }) {
  var [zoomed,       setZoomed]       = React.useState(false);
  var [showPhoto,    setShowPhoto]    = React.useState(false);
  var [showDetail,   setShowDetail]   = React.useState(false);
  var [illustErr,    setIllustErr]    = React.useState(false);
  var [conventionErr,setConventionErr]= React.useState(false);
  var [photoIndex,   setPhotoIndex]   = React.useState(0);
  var [sharing,      setSharing]      = React.useState(false);
  var modalRef = React.useRef(null);

  var rarity = getRarity(item.korean_name);
  var rc = RARITY_CONFIG[rarity];
  var nc = NATIVE_CONFIG[item.native_status] || NATIVE_CONFIG["불명확"];

  // 3단계 폴백 체인:
  //  1) ILLUSTRATION_MAP 에 명시적 매핑이 있으면 → 그 PNG
  //  2) 없으면 convention 경로 `/assets/illustrations/{name}.png` 시도 (GH Actions가 자동 생성)
  //  3) 둘 다 실패하면 → 자동생성 SVG (수묵화풍)
  var autoIllust = generateIllustration(item.korean_name, rarity);
  var conventionPath = "/assets/illustrations/" + encodeURIComponent(item.korean_name) + ".png";
  var hasExplicitMapping = !!ILLUSTRATION_MAP[item.korean_name];

  var illustSrc;
  if (hasExplicitMapping && !illustErr) {
    // 명시적 매핑 우선
    illustSrc = ILLUSTRATION_MAP[item.korean_name];
  } else if (hasExplicitMapping && illustErr) {
    // 명시적 매핑 실패 → convention 도 같은 plant_NNN 경로일 수 있으니 컨벤션 스킵하고 바로 autoIllust
    illustSrc = autoIllust;
  } else if (!conventionErr) {
    // 명시적 매핑 없음 → convention 시도
    illustSrc = conventionPath;
  } else {
    // 모두 실패 → SVG 자동생성
    illustSrc = autoIllust;
  }
  function uniquePaths(paths) {
    var seen = {};
    return paths.filter(function(path) {
      if (!path || seen[path]) return false;
      seen[path] = true;
      return true;
    });
  }

  function photoCandidatesFor(item) {
    var paths = [];
    var path = item.image_path || "";
    var encodedName = encodeURIComponent(item.korean_name || "");
    if (path && !path.startsWith("/assets/illustrations/")) paths.push(path);
    if (encodedName) {
      paths.push(
        "/assets/photos/" + encodedName + ".jpg",
        "/assets/photos/" + encodedName + ".png",
        "/assets/photos/" + encodedName + ".jpeg",
        "/assets/photos/" + encodedName + ".webp"
      );
    }
    return uniquePaths(paths);
  }

  var photoCandidates = photoCandidatesFor(item);
  var hasUserPhoto = photoIndex < photoCandidates.length;
  var userSrc = hasUserPhoto ? photoCandidates[photoIndex] : FALLBACK;
  var photoCandidatesKey = photoCandidates.join("|");

  var displaySrc = (showPhoto && hasUserPhoto) ? userSrc : illustSrc;

  React.useEffect(function() {
    if (typeof preloadImagePath !== "function") return;
    preloadImagePath(illustSrc);
    photoCandidates.forEach(preloadImagePath);
  }, [illustSrc, photoCandidatesKey]);

  var STORY_DATA = (typeof window !== "undefined" && window.STORIES_DATA) || {};
  var story = STORY_DATA[item.korean_name] || item.ecology_summary;

  var rarityBorderStyle = {
    L: "0 0 0 1.5px var(--L-bd),0 4px 14px rgba(201,146,39,0.28)",
    E: "0 0 0 1.5px var(--E-bd),0 4px 12px rgba(139,92,246,0.18)",
    R: "0 0 0 1.5px var(--R-bd),0 4px 10px rgba(37,99,235,0.15)",
    U: "0 0 0 1.5px var(--U-bd),0 2px 8px rgba(22,163,74,0.10)",
    C: "0 0 0 1px var(--C-bd)",
  }[rarity];

  function handleShare(e) {
    e.stopPropagation();
    if (sharing) return;
    var ownerPct = RARITY_OWNERSHIP_PCT[rarity];
    var shareUrl = window.location.origin + "/share/" + encodeURIComponent(item.korean_name);
    var promo = item.korean_name + " (" + rc.label + ") 발견!\n전국민 중 상위 " + ownerPct + "%만 보유한 카드\n#한반도감 #한국토종생물";
    var fullText = promo + "\n\n" + shareUrl;

    if (navigator.share) {
      setSharing(true);
      navigator.share({
        title: "한반도감 - " + item.korean_name,
        text: promo,
        url: shareUrl,
      }).then(function(){ setSharing(false); }).catch(function(){ setSharing(false); });
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(fullText).then(function(){
        alert("링크가 복사됐어요!\n카톡·문자에 붙여넣으면 미리보기가 나타나요");
      }).catch(function(){ alert(fullText); });
    } else {
      alert(fullText);
    }
  }

  function openModal() {
    setShowPhoto(false);
    setShowDetail(false);
    setPhotoIndex(0);
    setZoomed(true);
  }

  return (
    <>
    {/* ── 줌 모달 ── */}
    {zoomed && (
      <div
        onClick={() => setZoomed(false)}
        style={{position:"fixed",inset:0,zIndex:1000,background:"rgba(15,10,5,0.82)",display:"flex",alignItems:"center",justifyContent:"center",padding:"clamp(6px,1.5vh,14px)"}}
      >
        <div ref={modalRef} className="collection-modal-panel" onClick={e => e.stopPropagation()} style={{width:"min(380px,94vw)",minHeight:"min(760px,calc(100dvh - clamp(54px,9vh,96px)))",borderRadius:"20px",overflowX:"hidden",overflowY:"auto",WebkitOverflowScrolling:"touch",overscrollBehavior:"contain",boxShadow:"0 24px 80px rgba(0,0,0,0.5)",background:"var(--paper)",maxHeight:"calc(100dvh - clamp(12px,3vh,28px))",position:"relative",isolation:"isolate",display:"flex",flexDirection:"column"}}>

          {/* 사진 영역 — 클릭 시 일러스트↔사용자사진 */}
          <div
            className="collection-modal-hero"
            onClick={() => hasUserPhoto && setShowPhoto(p => !p)}
            style={{height:"262px",position:"relative",background:"linear-gradient(180deg,var(--surface) 0%,var(--paper) 100%)",overflow:"visible",cursor:hasUserPhoto?"pointer":"default",flexShrink:0}}
          >
            <img
              src={displaySrc}
              alt={item.korean_name}
              loading="eager"
              decoding="async"
              style={{
                position:"absolute",
                left:"50%",
                top:showPhoto?"-8px":"-24px",
                width:showPhoto?"100%":"148%",
                height:showPhoto?"calc(100% + 72px)":"calc(100% + 132px)",
                objectFit:"cover",
                objectPosition:"center top",
                padding:"0",
                transition:"opacity 0.25s",
                transform:"translateX(-50%)",
                transformOrigin:"50% 20%",
                zIndex:1,
                WebkitMaskImage:showPhoto
                  ? "radial-gradient(ellipse 112% 124% at 50% 34%,#000 0%,#000 62%,rgba(0,0,0,0.78) 76%,rgba(0,0,0,0.30) 91%,transparent 100%)"
                  : "linear-gradient(180deg,#000 0%,#000 58%,rgba(0,0,0,0.72) 72%,rgba(0,0,0,0.18) 88%,transparent 100%)",
                maskImage:showPhoto
                  ? "radial-gradient(ellipse 112% 124% at 50% 34%,#000 0%,#000 62%,rgba(0,0,0,0.78) 76%,rgba(0,0,0,0.30) 91%,transparent 100%)"
                  : "linear-gradient(180deg,#000 0%,#000 58%,rgba(0,0,0,0.72) 72%,rgba(0,0,0,0.18) 88%,transparent 100%)"
              }}
              onError={() => {
                if (showPhoto) {
                  setPhotoIndex(function(index) {
                    return Math.min(index + 1, photoCandidates.length);
                  });
                  return;
                }
                if (!illustErr) setIllustErr(true);
                else if (!conventionErr) setConventionErr(true);
              }}
            />

            {/* 희귀도 배지 */}
            <div style={{position:"absolute",top:"12px",left:"12px",zIndex:3,padding:"4px 10px",borderRadius:"20px",fontFamily:"'Space Mono',monospace",fontSize:"9px",fontWeight:"700",letterSpacing:"1px",background:rc.bg,border:`1px solid ${rc.bd}`,color:rc.color}}>
              <span style={{display:"inline-flex",alignItems:"center",gap:"5px"}}><Icon name="Star" size={10} strokeWidth={2.4} /> {rc.label}</span>
            </div>

            {/* 닫기 */}
            <button
              onClick={() => setZoomed(false)}
              style={{position:"absolute",top:"10px",right:"10px",zIndex:3,width:"28px",height:"28px",borderRadius:"50%",background:"rgba(0,0,0,0.35)",border:"none",color:"#fff",fontSize:"14px",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}
            ><Icon name="X" size={15} /></button>

          </div>

          {/* 정보 영역 — 클릭 시 이야기↔상세정보 */}
          <div
            className="collection-modal-info"
            onClick={() => setShowDetail(p => !p)}
            style={{padding:"74px 20px 16px",cursor:"pointer",background:"linear-gradient(180deg,rgba(244,237,220,0) 0px,rgba(244,237,220,0) 96px,rgba(244,237,220,0.82) 132px,var(--paper) 176px,var(--paper-2) 100%)",position:"relative",zIndex:2,flex:"1 1 auto"}}
          >
            {/* 종명 + 사진 전환 토글 */}
            <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:"10px",marginBottom:"8px"}}>
              <div style={{minWidth:0}}>
                <div className="collection-modal-title" style={{fontFamily:"'Noto Serif KR',serif",fontSize:"21px",fontWeight:"900",color:"var(--ink-1)",lineHeight:1.2}}>{item.korean_name}</div>
                <div style={{fontFamily:"'Space Mono',monospace",fontSize:"9px",fontStyle:"italic",color:"var(--ink-3)",marginTop:"3px"}}>{item.scientific_name}</div>
              </div>
              {hasUserPhoto && (
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowPhoto(p => !p);
                  }}
                  style={{display:"flex",alignItems:"center",gap:"6px",background:"rgba(45,30,10,0.10)",borderRadius:"20px",padding:"5px 12px",border:"1px solid rgba(45,30,10,0.05)",flexShrink:0,marginTop:"3px"}}
                >
                  <span style={{fontSize:"9px",fontWeight:showPhoto?"400":"700",color:showPhoto?"var(--ink-3)":"var(--ink-1)",transition:"all 0.2s",whiteSpace:"nowrap"}}>일러스트</span>
                  <span style={{fontSize:"9px",color:"rgba(45,30,10,0.24)"}}>|</span>
                  <span style={{fontSize:"9px",fontWeight:showPhoto?"700":"400",color:showPhoto?"var(--ink-1)":"var(--ink-3)",transition:"all 0.2s",whiteSpace:"nowrap"}}>내 사진</span>
                </div>
              )}
            </div>

            {/* 토종/외래 배지 + 토글 탭 */}
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:"10px",marginBottom:"12px"}}>
              <div style={{display:"inline-block",padding:"3px 10px",borderRadius:"10px",fontSize:"10px",background:nc.bg,color:nc.color,flexShrink:0}}>{item.native_status}</div>
              <div style={{display:"flex",alignItems:"center",gap:"5px",background:"rgba(45,30,10,0.07)",borderRadius:"20px",padding:"5px 12px",flexShrink:0,marginLeft:"8px",marginTop:"2px"}}>
                <span style={{fontSize:"9px",fontWeight:showDetail?"400":"700",color:showDetail?"var(--ink-3)":"var(--ink-1)",transition:"all 0.2s"}}>이야기</span>
                <span style={{fontSize:"9px",color:"var(--ink-3)"}}>|</span>
                <span style={{fontSize:"9px",fontWeight:showDetail?"700":"400",color:showDetail?"var(--ink-1)":"var(--ink-3)",transition:"all 0.2s"}}>상세</span>
              </div>
            </div>

            {!showDetail ? (
              /* 이야기 */
              <div>
                <div className="collection-modal-story" style={{fontSize:"13.5px",lineHeight:"1.72",color:"var(--ink-1)",fontFamily:"'Noto Serif KR',serif",letterSpacing:"-0.01em"}}>{story}</div>
                <div className="collection-modal-tip" style={{marginTop:"10px",fontSize:"10px",color:"var(--ink-3)",display:"flex",alignItems:"center",justifyContent:"flex-end",gap:"4px"}}>탭하면 상세정보 <Icon name="ArrowRight" size={12} /></div>
              </div>
            ) : (
              /* 상세정보 */
              <div style={{fontSize:"12px",color:"var(--ink-2)",lineHeight:"1.7"}}>
                <div style={{marginBottom:"8px"}}>{item.ecology_summary}</div>
                <div style={{borderTop:"1px solid rgba(45,30,10,0.08)",paddingTop:"10px",display:"flex",flexDirection:"column",gap:"5px"}}>
                  <div><span style={{fontWeight:"700",color:"var(--ink-1)"}}>형태 특징</span><br/><span style={{color:"var(--ink-3)"}}>{item.morphological_clues}</span></div>
                  <div style={{display:"flex",gap:"16px",flexWrap:"wrap",marginTop:"4px"}}>
                    <div><span style={{fontWeight:"700",color:"var(--ink-1)"}}>보전등급</span><br/><span style={{color:rc.color,fontFamily:"'Space Mono',monospace",fontSize:"11px"}}>{item.conservation_status}</span></div>
                    <div><span style={{fontWeight:"700",color:"var(--ink-1)"}}>신뢰도</span><br/><span style={{color:"var(--ink-2)",fontFamily:"'Space Mono',monospace",fontSize:"11px"}}>{Math.round(item.confidence*100)}%</span></div>
                    {item.district && <div><span style={{fontWeight:"700",color:"var(--ink-1)"}}>발견지</span><br/><span style={{color:"var(--ink-3)"}}>{item.district}</span></div>}
                  </div>
                </div>
                <div style={{marginTop:"8px",fontSize:"10px",color:"var(--ink-3)",display:"flex",alignItems:"center",justifyContent:"flex-end",gap:"4px"}}><Icon name="ArrowLeft" size={12} /> 탭하면 이야기</div>
              </div>
            )}
          </div>

          {/* 공유 버튼 */}
          <div className="collection-modal-footer" style={{borderTop:"1px solid rgba(45,30,10,0.06)",padding:"10px 20px 12px",background:"linear-gradient(180deg,var(--paper-2),var(--paper))",flexShrink:0}}>
            {/* 보유 희귀도 표시 */}
            <div className="collection-modal-ownership" style={{display:"flex",alignItems:"center",justifyContent:"center",flexWrap:"wrap",gap:"5px 8px",marginBottom:"8px",padding:"7px 10px",borderRadius:"12px",background:rc.bg,border:`1px solid ${rc.bd}`,textAlign:"center"}}>
              <span style={{fontFamily:"'Space Mono',monospace",fontSize:"10px",fontWeight:"700",color:rc.color,display:"inline-flex",alignItems:"center",gap:"5px"}}><Icon name="Star" size={11} strokeWidth={2.4} /> {rc.label}</span>
              <span style={{fontSize:"11px",color:"rgba(45,30,10,0.2)"}}>|</span>
              <span style={{fontFamily:"'Space Mono',monospace",fontSize:"12px",fontWeight:"700",color:rc.color}}>상위 {RARITY_OWNERSHIP_PCT[rarity]}%</span>
              <span style={{fontSize:"10px",color:"var(--ink-3)"}}>만 보유</span>
            </div>
            <button
              onClick={handleShare}
              disabled={sharing}
              className="collection-modal-share"
              style={{width:"100%",height:"42px",borderRadius:"12px",border:`1.5px solid ${rc.bd}`,background:sharing?"rgba(45,30,10,0.06)":rc.bg,color:sharing?"var(--ink-3)":rc.color,fontFamily:"'Black Han Sans',sans-serif",fontSize:"15px",letterSpacing:"2px",cursor:sharing?"default":"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:"8px",transition:"all 0.2s"}}
            >
              {sharing ? <Icon name="LoaderCircle" size={16} /> : <Icon name="Share2" size={16} />}
              <span>{sharing?"캡처 중…":"자랑하기"}</span>
            </button>
          </div>
        </div>
      </div>
    )}

    {/* ── 그리드 썸네일 — 클릭 한 번으로 줌 ── */}
    <div
      onClick={openModal}
      style={{aspectRatio:"1",boxShadow:rarityBorderStyle,borderRadius:"12px",overflow:"hidden",position:"relative",cursor:"pointer",background:"var(--surface)"}}
    >
      <img
        src={illustSrc}
        alt={item.korean_name}
        loading="eager"
        decoding="async"
        style={{width:"100%",height:"100%",objectFit:"cover"}}
        onError={() => {
          // ILLUSTRATION_MAP → convention → SVG 자동생성
          if (!illustErr) setIllustErr(true);
          else if (!conventionErr) setConventionErr(true);
        }}
      />
      {/* 희귀도 배지 */}
      <div style={{position:"absolute",top:"5px",left:"5px",width:"18px",height:"18px",borderRadius:"5px",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Space Mono',monospace",fontSize:"8px",fontWeight:"700",background:rc.bg,border:`1px solid ${rc.bd}`,color:rc.color,backdropFilter:"blur(4px)",zIndex:2}}>
        {rarity}
      </div>
      {item.observation_count > 1 && (
        <div style={{position:"absolute",top:"5px",right:"5px",padding:"2px 6px",borderRadius:"999px",background:"rgba(31,26,18,0.72)",color:"#fff",fontFamily:"'Space Mono',monospace",fontSize:"8px",fontWeight:"700",zIndex:2}}>
          x{item.observation_count}
        </div>
      )}
      {/* 종명 오버레이 */}
      <div style={{position:"absolute",bottom:0,left:0,right:0,padding:"4px 3px",background:"linear-gradient(0deg,rgba(0,0,0,0.65),transparent)",fontSize:"9px",color:"#fff",textAlign:"center",fontWeight:"600",zIndex:3}}>
        {item.korean_name}
      </div>
    </div>
    </>
  );
}
