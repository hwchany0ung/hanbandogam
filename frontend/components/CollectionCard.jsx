var ILLUSTRATION_MAP = {
  "구상나무":"/assets/illustrations/구상나무.svg","황소개구리":"/assets/illustrations/황소개구리.svg",
  "왜가리":"/assets/illustrations/왜가리.svg","소나무":"/assets/illustrations/소나무.svg",
  "참나무":"/assets/illustrations/참나무.svg","은행나무":"/assets/illustrations/은행나무.svg",
  "진달래":"/assets/illustrations/진달래.svg","개나리":"/assets/illustrations/개나리.svg",
  "철쭉":"/assets/illustrations/철쭉.svg","무궁화":"/assets/illustrations/무궁화.svg",
  "반달가슴곰":"/assets/illustrations/반달가슴곰.svg","수달":"/assets/illustrations/수달.svg",
  "삵":"/assets/illustrations/삵.svg","두루미":"/assets/illustrations/두루미.svg",
  "황새":"/assets/illustrations/황새.svg","따오기":"/assets/illustrations/따오기.svg",
  "수리부엉이":"/assets/illustrations/수리부엉이.svg","참수리":"/assets/illustrations/참수리.svg",
  "꽃사슴":"/assets/illustrations/꽃사슴.svg","고라니":"/assets/illustrations/고라니.svg",
  "너구리":"/assets/illustrations/너구리.svg","맹꽁이":"/assets/illustrations/맹꽁이.svg",
  "금개구리":"/assets/illustrations/금개구리.svg","꼬치동자개":"/assets/illustrations/꼬치동자개.svg",
  "미호종개":"/assets/illustrations/미호종개.svg","분홍바늘꽃":"/assets/illustrations/분홍바늘꽃.svg",
  "한라솜다리":"/assets/illustrations/한라솜다리.svg",
};
var FALLBACK = "/assets/illustrations/fallback.svg";

// 4열 그리드 셀 — 앞면(썸네일) / 뒷면(종 정보)
function CollectionCard({ item, onDelete }) {
  var [flipped, setFlipped] = React.useState(false);
  var [imgErr,  setImgErr]  = React.useState(false);

  var rarity = getRarity(item.korean_name);
  var rc = RARITY_CONFIG[rarity];
  var nc = NATIVE_CONFIG[item.native_status] || NATIVE_CONFIG["불명확"];
  var src = imgErr ? FALLBACK : (ILLUSTRATION_MAP[item.korean_name] || item.image_path || FALLBACK);

  var rarityBorderStyle = {
    L: "0 0 0 1.5px var(--L-bd),0 4px 14px rgba(201,146,39,0.28)",
    E: "0 0 0 1.5px var(--E-bd),0 4px 12px rgba(139,92,246,0.18)",
    R: "0 0 0 1.5px var(--R-bd),0 4px 10px rgba(37,99,235,0.15)",
    U: "0 0 0 1.5px var(--U-bd),0 2px 8px rgba(22,163,74,0.10)",
    C: "0 0 0 1px var(--C-bd)",
  }[rarity];

  return (
    <div
      className="card-flip-container cursor-pointer"
      style={{aspectRatio:"1",boxShadow:rarityBorderStyle,borderRadius:"12px"}}
      onClick={()=>setFlipped(!flipped)}
    >
      <div className={"card-flip-inner "+(flipped?"is-flipped":"")}>

        {/* ── 앞면: 썸네일 ── */}
        <div className="card-face rounded-xl overflow-hidden" style={{background:"var(--surface)"}}>
          <img src={src} alt={item.korean_name} className="w-full h-full object-cover" onError={()=>setImgErr(true)}/>
          {/* 희귀도 배지 */}
          <div style={{position:"absolute",top:"5px",left:"5px",width:"18px",height:"18px",borderRadius:"5px",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Space Mono',monospace",fontSize:"8px",fontWeight:"700",background:rc.bg,border:`1px solid ${rc.bd}`,color:rc.color,backdropFilter:"blur(4px)",zIndex:2}}>
            {rarity}
          </div>
          {/* 종명 오버레이 */}
          <div style={{position:"absolute",bottom:0,left:0,right:0,padding:"4px 3px",background:"linear-gradient(0deg,rgba(0,0,0,0.65),transparent)",fontSize:"9px",color:"#fff",textAlign:"center",fontWeight:"600",zIndex:3}}>
            {item.korean_name}
          </div>
        </div>

        {/* ── 뒷면: 종 정보 ── */}
        <div className="card-face card-face-back rounded-xl flex flex-col p-2 gap-1" style={{background:"var(--ink-1)",color:"#fff"}}>
          <div className="flex items-center justify-between">
            <span style={{fontSize:"9px",fontWeight:"700",color:rc.color}}>{rarity}</span>
            <button onClick={e=>{e.stopPropagation();onDelete&&onDelete(item.id);}} style={{fontSize:"9px",color:"#888",background:"none",border:"none",cursor:"pointer",padding:"0 2px"}}>✕</button>
          </div>
          <div style={{fontSize:"10px",fontWeight:"700",color:"#fff",lineHeight:1.2}}>{item.korean_name}</div>
          <div style={{fontSize:"8px",fontStyle:"italic",color:"#aaa",lineHeight:1.2}}>{item.scientific_name}</div>
          <div style={{fontSize:"8px",padding:"2px 5px",borderRadius:"10px",alignSelf:"flex-start",background:nc.bg,color:nc.color}}>{item.native_status}</div>
          <div style={{fontSize:"8px",color:"#ccc",lineHeight:1.4,flex:1,overflow:"hidden",display:"-webkit-box",WebkitLineClamp:3,WebkitBoxOrient:"vertical"}}>{item.ecology_summary}</div>
          <div style={{fontSize:"7px",color:"#888"}}>{Math.round(item.confidence*100)}% 신뢰도</div>
        </div>

      </div>
    </div>
  );
}
