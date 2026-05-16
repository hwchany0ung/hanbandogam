var _PARTICLE_CONFIGS = (function() {
  var configs = [];
  var colors = ["#C99227","#B8902F","#D4A93D","#F0C040","#E8B428"];
  for (var i = 0; i < 14; i++) {
    var angle = i * (360 / 14);
    var rad = angle * Math.PI / 180;
    var dist = 55 + (i % 4) * 14;
    configs.push({
      tx: Math.round(Math.cos(rad) * dist),
      ty: Math.round(Math.sin(rad) * dist),
      delay: (i * 0.045).toFixed(3),
      size: i % 3 === 0 ? 9 : 6,
      color: colors[i % colors.length],
      shape: i % 4 === 0 ? "★" : "•",
    });
  }
  return configs;
})();

function SuccessPopup({ result, earnedPts, isNew, totalPts, onClose, onViewCollection }) {
  var rarity = getRarity(result.korean_name);
  var rc = RARITY_CONFIG[rarity];
  var nc = NATIVE_CONFIG[result.native_status] || NATIVE_CONFIG["불명확"];
  var pct = Math.round(result.confidence * 100);

  var [displayPts, setDisplayPts] = React.useState(0);
  var [showParticles, setShowParticles] = React.useState(false);

  React.useEffect(function() {
    setShowParticles(true);
    var start = null;
    var duration = 900;
    var target = earnedPts || 0;
    function step(ts) {
      if (!start) start = ts;
      var progress = Math.min((ts - start) / duration, 1);
      var eased = 1 - Math.pow(1 - progress, 3);
      setDisplayPts(Math.round(eased * target));
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }, [earnedPts]);

  function handleShare() {
    if (navigator.share) {
      navigator.share({
        title: result.korean_name + " 발견!",
        text: "[한반도감] " + result.korean_name + "(" + result.scientific_name + ")을 발견했어요! 신뢰도 " + pct + "% · " + result.native_status,
        url: window.location.href,
      }).catch(function(){});
    } else {
      var text = "[한반도감] " + result.korean_name + " 발견! 신뢰도 " + pct + "%";
      navigator.clipboard && navigator.clipboard.writeText(text).then(function(){ alert("클립보드에 복사됐어요!"); });
    }
  }

  return (
    <div
      onClick={onClose}
      style={{position:"fixed",inset:0,zIndex:500,background:"rgba(10,7,3,0.90)",display:"flex",alignItems:"center",justifyContent:"center",padding:"24px",backdropFilter:"blur(6px)"}}
    >
      <div
        onClick={function(e){e.stopPropagation();}}
        style={{width:"min(340px,90vw)",borderRadius:"24px",overflow:"hidden",background:"var(--paper)",boxShadow:"0 32px 80px rgba(0,0,0,0.55)",animation:"scale-in 0.45s cubic-bezier(0.34,1.56,0.64,1)"}}
      >
        {/* 상단 컬러 밴드 */}
        <div style={{height:"5px",background:"linear-gradient(90deg,"+rc.color+","+rc.dot+")"}}/>

        <div style={{padding:"22px 24px 20px",textAlign:"center"}}>

          {/* 포인트 폭발 영역 */}
          <div style={{position:"relative",height:"90px",display:"flex",alignItems:"center",justifyContent:"center",marginBottom:"4px"}}>

            {/* 파티클 */}
            {showParticles && _PARTICLE_CONFIGS.map(function(p, i) {
              return (
                <div
                  key={i}
                  style={{
                    position:"absolute",
                    top:"50%", left:"50%",
                    width: p.size+"px", height: p.size+"px",
                    borderRadius: p.shape==="★" ? "0" : "50%",
                    background: p.shape==="★" ? "none" : p.color,
                    color: p.color,
                    fontSize: p.shape==="★" ? (p.size+2)+"px" : "0",
                    lineHeight: "1",
                    display:"flex", alignItems:"center", justifyContent:"center",
                    transform:"translate(-50%,-50%)",
                    animation:"star-burst 0.9s ease-out "+p.delay+"s both",
                    "--tx": p.tx+"px",
                    "--ty": p.ty+"px",
                    pointerEvents:"none",
                  }}
                >{p.shape==="★" ? "★" : ""}</div>
              );
            })}

            {/* 포인트 숫자 */}
            <div style={{position:"relative",zIndex:2,animation:"pts-pop 0.55s cubic-bezier(0.34,1.56,0.64,1) both"}}>
              <div style={{fontFamily:"'Space Mono',monospace",fontSize:"48px",fontWeight:"700",color:rc.color,lineHeight:1,letterSpacing:"-2px",textShadow:"0 0 30px "+rc.color+"55"}}>
                +{displayPts}
              </div>
              <div style={{fontFamily:"'Space Mono',monospace",fontSize:"11px",color:rc.color,letterSpacing:"3px",fontWeight:"700",opacity:0.8}}>
                pts
              </div>
            </div>
          </div>

          {/* 신종 보너스 뱃지 */}
          {isNew && (
            <div style={{marginBottom:"10px",display:"inline-flex",alignItems:"center",gap:"5px",padding:"4px 14px",borderRadius:"20px",background:"linear-gradient(90deg,"+rc.bg+","+rc.bg+")",border:"1.5px solid "+rc.bd,fontFamily:"'Space Mono',monospace",fontSize:"9px",fontWeight:"700",color:rc.color,letterSpacing:"1.5px",animation:"badge-glow 2s ease infinite"}}>
              ✦ 신종 발견 ×2 보너스
            </div>
          )}

          {/* 희귀도 */}
          <div style={{marginBottom:"10px",display:"inline-flex",alignItems:"center",gap:"5px",padding:"5px 14px",borderRadius:"20px",background:rc.bg,border:"1px solid "+rc.bd,fontFamily:"'Space Mono',monospace",fontSize:"10px",fontWeight:"700",color:rc.color,letterSpacing:"1.5px"}}>
            ★ {rc.label}
          </div>

          {/* 종명 */}
          <div style={{fontFamily:"'Noto Serif KR',serif",fontSize:"26px",fontWeight:"900",color:"var(--ink-1)",lineHeight:1.1,marginBottom:"3px"}}>{result.korean_name}</div>
          <div style={{fontFamily:"'Space Mono',monospace",fontSize:"9px",fontStyle:"italic",color:"var(--ink-3)",marginBottom:"12px"}}>{result.scientific_name}</div>

          {/* 뱃지 행 */}
          <div style={{display:"flex",justifyContent:"center",gap:"7px",marginBottom:"14px"}}>
            <div style={{padding:"4px 11px",borderRadius:"16px",fontSize:"10px",fontWeight:"600",background:nc.bg,border:"1px solid "+nc.bd,color:nc.color}}>{nc.label}</div>
            <div style={{padding:"4px 11px",borderRadius:"16px",fontFamily:"'Space Mono',monospace",fontSize:"10px",fontWeight:"700",background:"var(--surface-2)",color:"var(--ink-2)"}}>신뢰도 {pct}%</div>
          </div>

          {/* 누적 포인트 */}
          <div style={{padding:"10px 16px",borderRadius:"12px",background:"var(--surface-2)",border:"1px solid var(--gold-bd)",marginBottom:"16px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <div style={{fontFamily:"'Space Mono',monospace",fontSize:"9px",color:"var(--ink-3)",letterSpacing:"1px",fontWeight:"700"}}>누적 포인트</div>
            <div style={{fontFamily:"'Space Mono',monospace",fontSize:"15px",fontWeight:"700",color:"var(--gold)"}}>
              {(totalPts||0).toLocaleString()} pts
            </div>
          </div>

          {/* 공유 버튼 */}
          <button
            onClick={handleShare}
            className="btn-shine w-full py-3 rounded-xl"
            style={{background:"linear-gradient(135deg,var(--ink-1),#2C261B)",color:"#FBF7EC",fontFamily:"'Black Han Sans',sans-serif",fontSize:"13px",letterSpacing:"2px",border:"none",cursor:"pointer",marginBottom:"8px",display:"block",width:"100%"}}
          >
            📤 &nbsp;발견 카드 공유하기
          </button>
          <button
            onClick={onViewCollection}
            style={{display:"block",width:"100%",textAlign:"center",fontSize:"12px",color:"var(--gold)",textDecoration:"underline",background:"none",border:"none",cursor:"pointer"}}
          >
            내 도감 보기 →
          </button>
        </div>
      </div>
    </div>
  );
}
