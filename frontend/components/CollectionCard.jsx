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
  "서양민들레":     "/assets/illustrations/plant_101_서양민들레.png",
  "가시박":         "/assets/illustrations/plant_102_가시박.png",
  "단풍잎돼지풀":   "/assets/illustrations/plant_103_단풍잎돼지풀.png",
  "돼지풀":         "/assets/illustrations/plant_104_돼지풀.png",
  "미국쑥부쟁이":   "/assets/illustrations/plant_105_미국쑥부쟁이.png",
  "양미역취":       "/assets/illustrations/plant_106_양미역취.png",
  // Replicate flux-schnell 실시간 생성 (신규 발견 종)
  "마삭줄":         "/assets/illustrations/마삭줄.png",
  "산딸기":         "/assets/illustrations/산딸기.png",
  "한라솜다리":     "/assets/illustrations/한라솜다리.png",
  "분홍바늘꽃":     "/assets/illustrations/분홍바늘꽃.png",
  "매미꽃":         "/assets/illustrations/매미꽃.png",
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

var STORY_MAP = {
  "구상나무":     "전 세계 크리스마스 트리의 원조가 바로 한국 토종이다. 지금도 유럽 농장에서 기르는 '코리안 퍼'가 우리 구상나무 후손이지만, 정작 한라산 구상나무 군락은 기후변화로 매년 3%씩 사라지고 있다.",
  "미선나무":     "지구상에서 오직 한반도에만 존재하는 나무. 1속 1종. 우리나라가 사라지면 이 나무도 영원히 사라진다. 2월, 잎도 나기 전에 먼저 흰 꽃을 터뜨리는 고집쟁이.",
  "금강초롱꽃":   "꽃 이름에 금강산이 들어가지만 정작 학명(Hanabusaya)은 일제강점기 외교관 이름이다. 한국 식물인데 한국 이름을 못 가진 꽃. 설악산 바위틈에서 여전히 보라색 종을 울린다.",
  "동강할미꽃":   "동강에 댐이 건설되었다면 이 꽃은 세상에 없었다. 석회암 절벽 틈에만 피는 한국 특산종으로, 2000년 댐 반대 여론의 상징이 된 꽃이다.",
  "노랑붓꽃":     "전라도 몇몇 골짜기에서만 피어나는 노란 붓꽃. 자생지가 손에 꼽힐 만큼 적어 전문가도 보기 어렵다. 꽃이 필 때 주변 공기가 다르다고 한다.",
  "개느삼":       "환경부 멸종위기 1급. 한국 석회암 지대에서만 자라는 콩과 식물로, 가시처럼 생긴 탁엽 하나로 모든 다른 식물과 구별된다. 개체 수가 너무 적어 번식지를 공개하지 않는다.",
  "고려엉겅퀴":   "강원도 곤드레나물밥의 그 주인공. 쓴맛 나는 나물로만 알았지만, 사실 한국에서만 자라는 특산종이다. 지금 이 순간에도 누군가 밥상에 올리고 있다.",
  "곰취":         "이름은 곰, 생김새는 코끼리 귀. 지름 30cm를 넘는 넓은 잎이 산 사면을 뒤덮는다. 쌉싸름한 향의 정체는 수백만 년 산지 생태계와 함께 진화한 화학물질이다.",
  "노랑무늬붓꽃": "흰 꽃잎의 노란 줄무늬는 단순한 무늬가 아니다. 꿀벌에게 '꿀이 여기 있다'고 알려주는 착륙 안내 신호. 오대산 월정사 주변에서만 볼 수 있다.",
  "금꿩의다리":   "황금빛 수술이 수십 개 폭포처럼 흘러내리는 꽃. 이름처럼 꿩의 황금 다리를 닮았다. 산지 계곡 습지에서 7~8월 한 달만 볼 수 있다.",
  "개족도리풀":   "꽃이 땅바닥에 붙어 핀다. 너무 낮아서 벌도 나비도 못 찾는다. 대신 개미가 꽃가루를 옮긴다. 수천만 년 된 곤충과의 계약.",
  "좀민들레":     "서양민들레와 토종 민들레를 구별하는 법: 총포 외편이 뒤로 젖혀지면 외래종. 제주 한라산 고지대에서 아직 토종 군락이 버티고 있다.",
  "가시딸기":     "제주에만 사는 가시 가득한 딸기. 줄기를 만지면 손이 남아나지 않지만, 열매가 익으면 달콤하고 붉다. 이 땅에만 있는 과일.",
  "나도승마":     "이름에 '나도'가 붙으면 진짜가 아니라는 의미. 하지만 나도승마는 한국 특산종으로 오히려 더 희귀하다. 지리산 세석평전에서 노란 종형 꽃을 피운다.",
  "서양민들레":   "민들레 홀씨가 날리면 희망? 그 홀씨가 토종 민들레를 밀어내는 침입자의 씨앗이다. 총포가 뒤로 젖혀지면 외래종. 도시 어디서나 만나는 그 민들레가 맞다.",
  "돼지풀":       "꽃가루 한 그루가 한 시즌에 10억 개 이상을 만든다. 알레르기 비염 환자의 8월을 망치는 주범. 북미에서 건너왔지만 한국 하천변에서 완벽하게 적응했다.",
  "단풍잎돼지풀": "돼지풀의 거대 버전. 키 3m까지 자라며 주변 나무를 덮어 고사시킨다. 잎이 단풍잎처럼 갈라져 구별할 수 있다. 낙동강 하천부지를 잠식 중이다.",
  "미국쑥부쟁이": "가을 하천변 하얀 꽃의 정체. 토종 쑥부쟁이로 착각하기 쉽지만 줄기에 털이 가득하면 외래종이다. 환경부 생태계교란 식물 1호.",
  "양미역취":     "뿌리에서 독소를 분비해 주변 식물을 고의로 고사시킨다. 생태 테러리스트. 노란 꽃이 아름답지만 그 아래 땅에서는 아무것도 자라지 못한다.",
  "가시박":       "단 한 그루가 한 시즌에 2만 개 씨앗을 만든다. 가시 달린 덩굴이 나무를 완전히 덮어 빛을 차단해 죽인다. 남한강 하천림 피해는 현재 진행형이다.",
};

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
  var [photoErr,     setPhotoErr]     = React.useState(false);
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

  var illustSrc;
  if (illustErr && conventionErr) {
    illustSrc = autoIllust;
  } else if (ILLUSTRATION_MAP[item.korean_name] && !illustErr) {
    illustSrc = ILLUSTRATION_MAP[item.korean_name];
  } else if (!conventionErr) {
    illustSrc = conventionPath;
  } else {
    illustSrc = autoIllust;
  }
  var isIllustPath = item.image_path && item.image_path.startsWith("/assets/illustrations/");
  var hasUserPhoto  = item.image_path && !isIllustPath;
  var userSrc = hasUserPhoto ? (photoErr ? FALLBACK : item.image_path) : FALLBACK;

  var displaySrc = (showPhoto && hasUserPhoto) ? userSrc : illustSrc;

  var story = STORY_MAP[item.korean_name] || item.ecology_summary;

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
    setZoomed(true);
  }

  return (
    <>
    {/* ── 줌 모달 ── */}
    {zoomed && (
      <div
        onClick={() => setZoomed(false)}
        style={{position:"fixed",inset:0,zIndex:1000,background:"rgba(15,10,5,0.82)",display:"flex",alignItems:"center",justifyContent:"center",padding:"24px"}}
      >
        <div ref={modalRef} onClick={e => e.stopPropagation()} style={{width:"min(340px,90vw)",borderRadius:"20px",overflow:"hidden",boxShadow:"0 24px 80px rgba(0,0,0,0.5)",background:"var(--paper)",maxHeight:"90vh",display:"flex",flexDirection:"column"}}>

          {/* 사진 영역 — 클릭 시 일러스트↔사용자사진 */}
          <div
            onClick={() => hasUserPhoto && setShowPhoto(p => !p)}
            style={{height:"240px",position:"relative",background:"var(--surface)",overflow:"hidden",flexShrink:0,cursor:hasUserPhoto?"pointer":"default"}}
          >
            <img
              src={displaySrc}
              alt={item.korean_name}
              style={{width:"100%",height:"100%",objectFit:"contain",padding:"16px",transition:"opacity 0.25s"}}
              onError={() => {
                if (showPhoto) { setPhotoErr(true); return; }
                if (!illustErr) setIllustErr(true);
                else if (!conventionErr) setConventionErr(true);
              }}
            />

            {/* 희귀도 배지 */}
            <div style={{position:"absolute",top:"12px",left:"12px",padding:"4px 10px",borderRadius:"20px",fontFamily:"'Space Mono',monospace",fontSize:"9px",fontWeight:"700",letterSpacing:"1px",background:rc.bg,border:`1px solid ${rc.bd}`,color:rc.color}}>
              <span style={{display:"inline-flex",alignItems:"center",gap:"5px"}}><Icon name="Star" size={10} strokeWidth={2.4} /> {rc.label}</span>
            </div>

            {/* 닫기 */}
            <button
              onClick={() => setZoomed(false)}
              style={{position:"absolute",top:"10px",right:"10px",width:"28px",height:"28px",borderRadius:"50%",background:"rgba(0,0,0,0.35)",border:"none",color:"#fff",fontSize:"14px",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}
            ><Icon name="X" size={15} /></button>

            {/* 사진 전환 토글 (사용자 사진 있을 때만) */}
            {hasUserPhoto && (
              <div style={{position:"absolute",bottom:"10px",right:"10px",display:"flex",alignItems:"center",gap:"6px",background:"rgba(0,0,0,0.5)",borderRadius:"20px",padding:"4px 12px",backdropFilter:"blur(4px)"}}>
                <span style={{fontSize:"9px",fontWeight:showPhoto?"400":"700",color:showPhoto?"rgba(255,255,255,0.4)":"#fff",transition:"all 0.2s"}}>일러스트</span>
                <span style={{fontSize:"9px",color:"rgba(255,255,255,0.3)"}}>|</span>
                <span style={{fontSize:"9px",fontWeight:showPhoto?"700":"400",color:showPhoto?"#fff":"rgba(255,255,255,0.4)",transition:"all 0.2s"}}>내 사진</span>
              </div>
            )}
          </div>

          {/* 정보 영역 — 클릭 시 이야기↔상세정보 */}
          <div
            onClick={() => setShowDetail(p => !p)}
            style={{padding:"18px 20px 20px",cursor:"pointer",flex:1,overflowY:"auto"}}
          >
            {/* 종명 + 토글 탭 */}
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"8px"}}>
              <div>
                <div style={{fontFamily:"'Noto Serif KR',serif",fontSize:"21px",fontWeight:"900",color:"var(--ink-1)",lineHeight:1.2}}>{item.korean_name}</div>
                <div style={{fontFamily:"'Space Mono',monospace",fontSize:"9px",fontStyle:"italic",color:"var(--ink-3)",marginTop:"3px"}}>{item.scientific_name}</div>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:"5px",background:"rgba(45,30,10,0.07)",borderRadius:"20px",padding:"5px 12px",flexShrink:0,marginLeft:"8px",marginTop:"2px"}}>
                <span style={{fontSize:"9px",fontWeight:showDetail?"400":"700",color:showDetail?"var(--ink-3)":"var(--ink-1)",transition:"all 0.2s"}}>이야기</span>
                <span style={{fontSize:"9px",color:"var(--ink-3)"}}>|</span>
                <span style={{fontSize:"9px",fontWeight:showDetail?"700":"400",color:showDetail?"var(--ink-1)":"var(--ink-3)",transition:"all 0.2s"}}>상세</span>
              </div>
            </div>

            {/* 토종/외래 배지 */}
            <div style={{display:"inline-block",padding:"3px 10px",borderRadius:"10px",fontSize:"10px",background:nc.bg,color:nc.color,marginBottom:"12px"}}>{item.native_status}</div>

            {!showDetail ? (
              /* 이야기 */
              <div>
                <div style={{fontSize:"14px",lineHeight:"1.85",color:"var(--ink-1)",fontFamily:"'Noto Serif KR',serif",letterSpacing:"-0.01em"}}>{story}</div>
                <div style={{marginTop:"14px",fontSize:"10px",color:"var(--ink-3)",display:"flex",alignItems:"center",justifyContent:"flex-end",gap:"4px"}}>탭하면 상세정보 <Icon name="ArrowRight" size={12} /></div>
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
          <div style={{borderTop:"1px solid rgba(45,30,10,0.06)",padding:"12px 20px 14px"}}>
            {/* 보유 희귀도 표시 */}
            <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:"8px",marginBottom:"10px",padding:"8px 14px",borderRadius:"12px",background:rc.bg,border:`1px solid ${rc.bd}`}}>
              <span style={{fontFamily:"'Space Mono',monospace",fontSize:"11px",fontWeight:"700",color:rc.color,display:"inline-flex",alignItems:"center",gap:"5px"}}><Icon name="Star" size={11} strokeWidth={2.4} /> {rc.label}</span>
              <span style={{fontSize:"11px",color:"rgba(45,30,10,0.2)"}}>|</span>
              <span style={{fontFamily:"'Space Mono',monospace",fontSize:"13px",fontWeight:"700",color:rc.color}}>상위 {RARITY_OWNERSHIP_PCT[rarity]}%</span>
              <span style={{fontSize:"10px",color:"var(--ink-3)"}}>만 보유</span>
            </div>
            <button
              onClick={handleShare}
              disabled={sharing}
              style={{width:"100%",padding:"11px",borderRadius:"12px",border:`1.5px solid ${rc.bd}`,background:sharing?"rgba(45,30,10,0.06)":rc.bg,color:sharing?"var(--ink-3)":rc.color,fontFamily:"'Black Han Sans',sans-serif",fontSize:"15px",letterSpacing:"2px",cursor:sharing?"default":"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:"8px",transition:"all 0.2s"}}
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
        style={{width:"100%",height:"100%",objectFit:"cover"}}
        onError={() => {
          // ILLUSTRATION_MAP 의 PNG 가 실패 → convention 시도하도록 illustErr=true
          // convention 도 실패하면 → conventionErr=true → SVG 폴백
          if (!illustErr) setIllustErr(true);
          else if (!conventionErr) setConventionErr(true);
        }}
      />
      {/* 희귀도 배지 */}
      <div style={{position:"absolute",top:"5px",left:"5px",width:"18px",height:"18px",borderRadius:"5px",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Space Mono',monospace",fontSize:"8px",fontWeight:"700",background:rc.bg,border:`1px solid ${rc.bd}`,color:rc.color,backdropFilter:"blur(4px)",zIndex:2}}>
        {rarity}
      </div>
      {/* 종명 오버레이 */}
      <div style={{position:"absolute",bottom:0,left:0,right:0,padding:"4px 3px",background:"linear-gradient(0deg,rgba(0,0,0,0.65),transparent)",fontSize:"9px",color:"#fff",textAlign:"center",fontWeight:"600",zIndex:3}}>
        {item.korean_name}
      </div>
    </div>
    </>
  );
}
