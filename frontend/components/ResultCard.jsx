function ResultCard({ result, imageFile, onRetry, onCollection }) {
  var [reported, setReported] = React.useState(false);
  var previewUrl = imageFile ? URL.createObjectURL(imageFile) : (result.image_path || null);

  var rarity = getRarity(result.korean_name);
  var rc = RARITY_CONFIG[rarity];
  var nc = NATIVE_CONFIG[result.native_status] || NATIVE_CONFIG["불명확"];
  var pct = Math.round(result.confidence * 100);
  var morphTags = result.morphological_clues ? result.morphological_clues.split(/[,，、]+/).map(s=>s.trim()).filter(Boolean) : [];

  return (
    <div className="flex flex-col flex-1" style={{background:"var(--paper)",minHeight:0}}>
      {/* 스크롤 영역 */}
      <div className="flex-1 overflow-y-auto" style={{minHeight:0}}>
        {/* 탑바 */}
        <div className="flex items-center gap-3 px-4 pt-4 pb-3">
          <button onClick={onRetry} style={{width:"36px",height:"36px",borderRadius:"50%",background:"var(--surface)",border:"1px solid var(--gold-bd)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"16px",color:"var(--ink-1)",boxShadow:"0 2px 6px rgba(45,30,10,0.06)",flexShrink:0,cursor:"pointer"}}>←</button>
          <div style={{fontSize:"13px",color:"var(--ink-2)",fontWeight:"500"}}>AI 판별 결과</div>
          <div style={{marginLeft:"auto",display:"inline-flex",alignItems:"center",gap:"5px",padding:"4px 10px",background:"var(--E-bg)",border:"1px solid var(--E-bd)",borderRadius:"20px",fontFamily:"'Space Mono',monospace",fontSize:"9px",color:"var(--E)",fontWeight:"700"}}>✦ CLAUDE</div>
        </div>

        {/* 카드 */}
        <div className="mx-4 mb-4 rounded-2xl overflow-hidden" style={{background:"var(--surface)",border:"1px solid rgba(45,30,10,0.06)",boxShadow:rc?`0 0 0 1.5px ${rc.bd},0 16px 48px rgba(45,30,10,0.12)`:""}}>

          {/* 사진 */}
          <div style={{height:"300px",position:"relative",overflow:"hidden",background:"linear-gradient(145deg,#F4EDDC,#FAF5E6)"}}>
            {previewUrl
              ? <img src={previewUrl} alt="업로드" style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}}/>
              : <div className="flex items-center justify-center h-full" style={{fontSize:"48px"}}>🌿</div>
            }
            <div className="holo"/>
            {/* 희귀도 배지 */}
            <div style={{position:"absolute",top:"12px",left:"12px",padding:"5px 12px",borderRadius:"20px",fontFamily:"'Space Mono',monospace",fontSize:"10px",fontWeight:"700",letterSpacing:"1.5px",background:rc.bg,border:`1px solid ${rc.bd}`,color:rc.color,backdropFilter:"blur(8px)"}}>
              ★ {rc.label}
            </div>
            {/* 토종 배지 */}
            <div style={{position:"absolute",top:"12px",right:"12px",padding:"5px 11px",borderRadius:"20px",fontSize:"11px",fontWeight:"600",background:nc.bg,border:`1px solid ${nc.bd}`,color:nc.color,backdropFilter:"blur(8px)"}}>
              {nc.label}
            </div>
          </div>

          {/* 본문 */}
          <div className="p-5">
            {/* 종명 */}
            <div className="mb-4">
              <div style={{fontFamily:"'Noto Serif KR',serif",fontSize:"26px",fontWeight:"900",letterSpacing:"-0.5px",color:"var(--ink-1)"}}>{result.korean_name}</div>
              <div style={{fontFamily:"'Space Mono',monospace",fontSize:"10px",fontStyle:"italic",color:"var(--ink-3)",marginTop:"4px"}}>{result.scientific_name}</div>
            </div>

            {/* 신뢰도 */}
            <div className="flex items-center gap-3 mb-4 p-3 rounded-lg" style={{background:"var(--surface-2)",border:"1px solid rgba(45,30,10,0.04)"}}>
              <div style={{fontFamily:"'Space Mono',monospace",fontSize:"9px",color:"var(--ink-3)",flexShrink:0,fontWeight:"700"}}>신뢰도</div>
              <div style={{flex:1,height:"6px",background:"rgba(45,30,10,0.08)",borderRadius:"3px",overflow:"hidden"}}>
                <div style={{width:pct+"%",height:"100%",borderRadius:"3px",background:`linear-gradient(90deg,${rc.color},${rc.dot})`}}/>
              </div>
              <div style={{fontFamily:"'Space Mono',monospace",fontSize:"14px",fontWeight:"700",color:rc.color,flexShrink:0}}>{pct}%</div>
            </div>

            {/* 생태 요약 */}
            <div style={{fontFamily:"'Space Mono',monospace",fontSize:"9px",color:"var(--gold)",letterSpacing:"2px",marginBottom:"6px",fontWeight:"700"}}>생태 요약</div>
            <div style={{fontSize:"13px",lineHeight:"1.75",color:"var(--ink-2)",marginBottom:"14px"}}>{result.ecology_summary}</div>

            {/* 식별 포인트 태그 */}
            {morphTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-5">
                {morphTags.map((t,i)=>(
                  <div key={i} style={{padding:"4px 9px",background:"var(--gold-dim)",border:"1px solid var(--gold-bd)",borderRadius:"4px",fontSize:"11px",color:"var(--gold)",fontWeight:"500"}}>{t}</div>
                ))}
              </div>
            )}

            {/* 보전 현황 */}
            <div style={{fontSize:"11px",color:"var(--ink-3)",textAlign:"center"}}>{result.conservation_status}</div>
          </div>
        </div>
      </div>

      {/* 하단 고정 바 */}
      <div style={{flexShrink:0,padding:"10px 16px 14px",background:"var(--paper)",borderTop:"1px solid rgba(45,30,10,0.06)",boxShadow:"0 -4px 14px rgba(45,30,10,0.04)",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div style={{display:"inline-flex",alignItems:"center",gap:"6px",padding:"6px 14px",borderRadius:"20px",background:"rgba(22,163,74,0.08)",border:"1px solid rgba(22,163,74,0.25)"}}>
          <span style={{color:"var(--native)",fontSize:"12px"}}>✓</span>
          <span style={{fontFamily:"'Space Mono',monospace",fontSize:"10px",fontWeight:"700",color:"var(--native)"}}>자동 저장됨</span>
        </div>
        <div style={{display:"flex",gap:"12px",alignItems:"center"}}>
          <button onClick={onCollection} style={{fontSize:"12px",color:"var(--gold)",textDecoration:"underline",background:"none",border:"none",cursor:"pointer"}}>내 도감 →</button>
          {reported
            ? <span style={{fontSize:"11px",color:"var(--ink-3)"}}>신고 접수됨</span>
            : <button onClick={function(){setReported(true);}} style={{fontSize:"11px",color:"var(--ink-3)",textDecoration:"underline",background:"none",border:"none",cursor:"pointer"}}>틀렸나요?</button>
          }
        </div>
      </div>
    </div>
  );
}
