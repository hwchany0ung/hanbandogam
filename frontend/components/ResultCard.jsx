function ResultCard({ result, imageFile, onSave, onRetry, onCollection, alreadyCollected, existingItem, onCloseExisting }) {
  var [saving, setSaving] = React.useState(false);
  var [saved,  setSaved]  = React.useState(false);
  var [previewErr, setPreviewErr] = React.useState(false);
  var [blobPreviewUrl, setBlobPreviewUrl] = React.useState(null);
  var [pointPhase, setPointPhase] = React.useState("hidden"); // "hidden" | "in" | "out"
  var [reported, setReported] = React.useState(false);
  var [showReportToast, setShowReportToast] = React.useState(false);

  // 포인트 토스트: 결과 진입 후 0.7s 슬라이드업 → 2.5s 유지 → 페이드아웃
  React.useEffect(function() {
    if (notIdentified) return;
    var t1 = setTimeout(function() { setPointPhase("in"); }, 700);
    var t2 = setTimeout(function() { setPointPhase("out"); }, 3200);
    var t3 = setTimeout(function() { setPointPhase("hidden"); }, 3800);
    return function() { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  React.useEffect(function() {
    if (!imageFile || result.image_url || result.image_path) {
      setBlobPreviewUrl(null);
      return;
    }

    var objectUrl = URL.createObjectURL(imageFile);
    setBlobPreviewUrl(objectUrl);

    return function() {
      URL.revokeObjectURL(objectUrl);
    };
  }, [imageFile, result.image_url, result.image_path]);

  // Design Ref: §5.5 — S3 image_url 우선, blob/image_path 폴백
  // 우선순위:
  //  1) result.image_url — 백엔드가 영구 저장한 S3 URL 또는 /assets/uploads/{uuid}.jpg (다른 세션에서도 유효)
  //  2) imageFile — 사용자가 방금 업로드한 File (blob URL, 현재 세션만)
  //  3) result.image_path — 데모 캡처의 사전 정의 경로
  var previewUrl = result.image_url || blobPreviewUrl || (result.image_path || null);
  var fallbackPng = result.korean_name ? "/assets/illustrations/" + encodeURIComponent(result.korean_name) + ".png" : null;
  // previewErr 발생 시: fallbackPng 있으면 그것, 없으면 null → <img> 자체 숨김 처리
  var imgSrc = previewErr ? (fallbackPng || null) : previewUrl;

  var RARITY_POINTS = { L:50, E:30, R:20, U:10, C:5 };

  var rarity = getRarity(result.korean_name);
  var rc = RARITY_CONFIG[rarity];
  var nc = NATIVE_CONFIG[result.native_status] || NATIVE_CONFIG["불명확"];
  var pct = Math.round(result.confidence * 100);
  var minConfidence = window.COLLECTION_MIN_CONFIDENCE || 0.6;
  var morphTags = result.morphological_clues ? result.morphological_clues.split(/[,，、]+/).map(s=>s.trim()).filter(Boolean) : [];
  var isAlreadyCollected = alreadyCollected && !saved;

  // 식별 불가 판정 (해당 없음 / N/A / 빈 결과 → 저장 차단)
  var notIdentified =
    !result.korean_name ||
    result.korean_name === "해당 없음" ||
    result.korean_name === "N/A" ||
    result.scientific_name === "N/A" ||
    result.confidence <= minConfidence;
  var lowConfidenceSummary = result.ecology_summary || "사진만으로 종을 안정적으로 판별하기 어려워요.";
  var decisiveReason = result.morphological_clues || ("신뢰도 " + pct + "%로 도감 추가 기준인 " + Math.round(minConfidence * 100) + "%를 넘지 못했어요.");
  var lowConfidenceCodeStyle = {
    display:"inline",
    padding:"2px 6px",
    borderRadius:"5px",
    background:"rgba(31,26,18,0.08)",
    border:"1px solid rgba(31,26,18,0.12)",
    color:"var(--ink-1)",
    fontFamily:"'Space Mono','Noto Sans KR',monospace",
    fontSize:"13.5px",
    lineHeight:"1.8",
    fontWeight:"800",
    boxDecorationBreak:"clone",
    WebkitBoxDecorationBreak:"clone"
  };

  function splitLowConfidenceSummary(text) {
    var source = text || "";
    var match = null;
    var displayText = "";

    var quotedContext = source.match(/([가-힣A-Za-z0-9\s]+의\s*)['"‘“]([^'"’”]+)['"’”](?=[^가-힣A-Za-z0-9]*(?:로 보이는|처럼 보이는|로 추정|캐릭터))/);
    if (quotedContext) {
      match = { index:quotedContext.index, text:quotedContext[0] };
      displayText = (quotedContext[1] + quotedContext[2]).replace(/\s+/g, " ").trim();
    }

    if (!match) {
      var subjectPattern = /(?:해당\s*사진은|사진은|이미지는|사진이|이는|이것은)\s*([^.!?。]+?)(?=\s*(?:같아요|로 보여요|처럼 보여요|로 보입니다|처럼 보입니다|로 보이는|로 추정|로 판단|입니다|이에요|예요))/;
      var subject = source.match(subjectPattern);
      if (subject) {
        match = { index:subject.index + subject[0].indexOf(subject[1]), text:subject[1] };
        displayText = subject[1].trim();
      }
    }

    if (!match || !displayText) return [{ text:source, highlight:false }];

    return [
      { text:source.slice(0, match.index), highlight:false },
      { text:displayText, highlight:true },
      { text:source.slice(match.index + match.text.length), highlight:false },
    ].filter(function(part) { return part.text; });
  }

  async function handleSave() {
    if (saved || notIdentified || alreadyCollected) return;
    setSaving(true);
    try {
      // blob URL 은 다른 세션에서 무효이므로 저장 X
      // 영구 URL (result.image_url 또는 사전 정의 image_path) 우선
      var pathToSave = result.image_url || (result.image_path && !result.image_path.startsWith("blob:") ? result.image_path : "");
      var savedItem = await addToCollection(result, pathToSave);
      // 캐시 무효화 (api.js 가 처리하지만 방어적으로 한번 더)
      if (typeof window !== "undefined" && typeof window.invalidateCollectionCache === "function") {
        window.invalidateCollectionCache();
      }
      setSaved(true);
      if (onSave) onSave(savedItem);
    }
    catch(e) { alert("저장 실패: "+e.message); }
    finally { setSaving(false); }
  }

  function handleCloseExisting() {
    if (onCloseExisting) onCloseExisting();
    else if (onRetry) onRetry();
  }

  function handleReport() {
    if (reported) return;
    setReported(true);
    setShowReportToast(true);
    setTimeout(function() { setShowReportToast(false); }, 4000);
  }

  var earnedPts = RARITY_POINTS[rarity] || 5;
  var toastBg = rarity === "L"
    ? "linear-gradient(135deg,#F5C842,#D4920A)"
    : "linear-gradient(135deg,"+rc.color+",var(--ink-1))";

  return (
    <div className="flex flex-col flex-1 overflow-hidden" style={{background:"var(--paper)",height:"100%",minHeight:0}}>

      {/* 포인트 적립 토스트 */}
      {pointPhase !== "hidden" && (
        <div style={{
          position:"fixed",
          top:"60px",
          left:"50%",
          zIndex:200,
          display:"flex",
          alignItems:"center",
          gap:"8px",
          padding:"11px 20px",
          borderRadius:"28px",
          background:toastBg,
          color:"#fff",
          fontFamily:"'Black Han Sans',sans-serif",
          fontSize:"14px",
          letterSpacing:"2px",
          whiteSpace:"nowrap",
          boxShadow:"0 8px 28px rgba(45,30,10,0.35)",
          animation: pointPhase === "in"
            ? "toastUp 0.45s cubic-bezier(0.34,1.56,0.64,1) forwards"
            : "toastFade 0.5s ease forwards",
          pointerEvents:"none",
        }}>
          <Icon name="Zap" size={15} strokeWidth={2.5} />
          <span>+{earnedPts} 포인트 적립!</span>
          <span style={{fontFamily:"'Space Mono',monospace",fontSize:"9px",opacity:0.75,letterSpacing:"1px"}}>{rc.label}</span>
        </div>
      )}

      {/* 탑바 */}
      <div
        className="flex items-center gap-3 px-4 pt-4 pb-3"
        style={{
          flexShrink:0,
          position:"sticky",
          top:0,
          zIndex:30,
          background:"rgba(244,237,220,0.98)",
          borderBottom:"1px solid rgba(184,144,47,0.12)",
          backdropFilter:"blur(14px)"
        }}
      >
        <button onClick={onRetry} style={{width:"36px",height:"36px",borderRadius:"50%",background:"var(--surface)",border:"1px solid var(--gold-bd)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"16px",color:"var(--ink-1)",boxShadow:"0 2px 6px rgba(45,30,10,0.06)",flexShrink:0,cursor:"pointer"}}><Icon name="ArrowLeft" size={17} /></button>
        <div style={{fontSize:"13px",color:"var(--ink-2)",fontWeight:"500"}}>AI 판별 결과</div>
        <div style={{marginLeft:"auto",display:"inline-flex",alignItems:"center",gap:"5px",padding:"4px 10px",background:"var(--E-bg)",border:"1px solid var(--E-bd)",borderRadius:"20px",fontFamily:"'Space Mono',monospace",fontSize:"9px",color:"var(--E)",fontWeight:"700"}}><Icon name="Sparkles" size={12} /> CLAUDE</div>
      </div>

      {/* 스크롤 영역 */}
      <div style={{flex:"1 1 auto",minHeight:0,overflowY:"auto",WebkitOverflowScrolling:"touch",overscrollBehavior:"contain",paddingBottom:"14px"}}>
        {/* 카드 */}
        <div className="mx-4 mb-2 rounded-2xl overflow-hidden" style={{background:"var(--surface)",border:"1px solid rgba(45,30,10,0.06)",boxShadow:rc?`0 0 0 1.5px ${rc.bd},0 16px 48px rgba(45,30,10,0.12)`:""}}>

          {/* 사진 */}
          <div style={{height:"300px",position:"relative",overflow:"hidden",background:"linear-gradient(145deg,#F4EDDC,#FAF5E6)"}}>
            {imgSrc
              ? <img
                  className="result-photo-fade-image"
                  src={imgSrc}
                  alt="업로드"
                  style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}}
                  onError={(e) => {
                    // 1차 실패 → fallbackPng 시도 (previewErr 토글로 imgSrc 재계산)
                    if (!previewErr) { setPreviewErr(true); return; }
                    // 2차 실패 (fallbackPng 도 깨짐) → 깨진 placeholder 숨기기
                    e.target.onerror = null;
                    e.target.style.display = "none";
                  }}
                />
              : <div className="flex items-center justify-center h-full" style={{color:"var(--U)"}}><Icon name="Sprout" size={48} strokeWidth={1.6} /></div>
            }
            <div className="holo"/>
            {/* 희귀도 배지 */}
            <div style={{position:"absolute",top:"12px",left:"12px",padding:"5px 12px",borderRadius:"20px",fontFamily:"'Space Mono',monospace",fontSize:"10px",fontWeight:"700",letterSpacing:"1.5px",background:rc.bg,border:`1px solid ${rc.bd}`,color:rc.color,backdropFilter:"blur(8px)",display:"flex",alignItems:"center",gap:"5px",lineHeight:"1"}}>
              <Icon name="Star" size={11} strokeWidth={2.4} /><span style={{lineHeight:"1",display:"block"}}>{rc.label}</span>
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

            {/* 생태 요약 / 저신뢰도 이유 */}
            <div style={{fontFamily:"'Space Mono',monospace",fontSize:"9px",color:notIdentified?"var(--invasive)":"var(--gold)",letterSpacing:"2px",marginBottom:"6px",fontWeight:"700"}}>
              {notIdentified ? "판별 안내" : "생태 요약"}
            </div>
            {notIdentified ? (
              <div style={{fontSize:"13px",lineHeight:"1.85",color:"var(--ink-2)",marginBottom:"14px",wordBreak:"keep-all"}}>
                {splitLowConfidenceSummary(lowConfidenceSummary).map(function(part, index) {
                  return part.highlight
                    ? <span key={index} style={lowConfidenceCodeStyle}>{part.text}</span>
                    : <React.Fragment key={index}>{part.text}</React.Fragment>;
                })}{" "}
                <span style={lowConfidenceCodeStyle}>{decisiveReason}</span>
              </div>
            ) : (
              <div style={{fontSize:"13px",lineHeight:"1.75",color:"var(--ink-2)",marginBottom:"14px"}}>{result.ecology_summary}</div>
            )}

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

            {/* 오류 신고 */}
            <button
              onClick={handleReport}
              disabled={reported}
              style={{display:"flex",alignItems:"center",justifyContent:"center",gap:"4px",width:"100%",marginTop:"10px",fontSize:"9px",color:reported?"var(--ink-4)":"rgba(220,38,38,0.35)",background:"none",border:"none",cursor:reported?"default":"pointer",letterSpacing:"0.3px"}}
            >
              <Icon name="Flag" size={9} /> {reported ? "신고 접수됨" : "AI 판별 오류 신고"}
            </button>
          </div>
        </div>
      </div>

      {/* 고정 액션 영역 */}
      <div style={{flex:"0 0 auto",padding:"8px 16px calc(8px + var(--app-safe-bottom, 0px))",background:"rgba(244,237,220,0.96)",borderTop:"1px solid var(--gold-bd)",boxShadow:"0 -10px 26px rgba(45,30,10,0.08)",backdropFilter:"blur(18px)"}}>
        {showReportToast && (
          <div style={{position:"fixed",bottom:"calc(90px + var(--app-safe-bottom, 0px))",left:"50%",transform:"translateX(-50%)",padding:"10px 18px",borderRadius:"10px",background:"rgba(31,26,18,0.94)",color:"#FFF7E8",fontSize:"12px",lineHeight:"1.5",textAlign:"center",zIndex:9999,maxWidth:"calc(100vw - 48px)",backdropFilter:"blur(12px)",boxShadow:"0 6px 20px rgba(0,0,0,0.28)",whiteSpace:"nowrap"}}>
            신고가 접수되었습니다. 전문가 검토 후 데이터 개선에 반영됩니다.
          </div>
        )}
        {isAlreadyCollected ? (
          <>
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:"5px",padding:"10px 12px",borderRadius:"12px",background:"var(--gold-dim)",border:"1px solid var(--gold-bd)",color:"var(--ink-2)",fontSize:"12px",lineHeight:"1.45",marginBottom:"10px",textAlign:"center"}}>
              <Icon name="CircleCheck" size={16} strokeWidth={2.2} style={{color:"var(--gold)",flexShrink:0}} />
              <div>
                <div style={{fontWeight:"700",color:"var(--ink-1)"}}>이미 내 도감에 등록된 종이에요.</div>
                {existingItem && existingItem.observation_count > 1 && (
                  <div style={{fontSize:"11px",color:"var(--ink-3)",marginTop:"2px"}}>현재 도감 기록 {existingItem.observation_count}회</div>
                )}
              </div>
            </div>
            <div style={{display:"flex",gap:"8px"}}>
              <button
                onClick={onRetry}
                style={{flex:"0 0 50px",height:"50px",borderRadius:"12px",background:"var(--surface)",border:"1px solid var(--gold-bd)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:"2px",cursor:"pointer",color:"var(--ink-2)",flexShrink:0}}
              >
                <Icon name="Camera" size={16} />
                <span style={{fontSize:"8px",fontWeight:"600",letterSpacing:"0.3px"}}>다시찍기</span>
              </button>
              <button
                onClick={handleCloseExisting}
                className="rounded-xl"
                style={{flex:"1 1 auto",height:"50px",background:"var(--ink-1)",border:"none",color:"#fff",fontFamily:"'Black Han Sans',sans-serif",fontSize:"15px",letterSpacing:"2px",cursor:"pointer",boxShadow:"0 6px 20px rgba(31,26,18,0.18)"}}
              >
                <span style={{display:"inline-flex",alignItems:"center",justifyContent:"center",gap:"8px"}}><Icon name="Check" size={17} strokeWidth={2.5} /> 도감에 있는 식물입니다</span>
              </button>
            </div>
          </>
        ) : (
          <>
            {notIdentified && (
              <div style={{marginBottom:"8px",padding:"8px 12px",borderRadius:"8px",background:"rgba(220,38,38,0.06)",border:"1px solid rgba(220,38,38,0.18)",fontSize:"11px",color:"var(--invasive)",textAlign:"center"}}>
                <span style={{display:"inline-flex",alignItems:"center",justifyContent:"center",gap:"6px"}}><Icon name="TriangleAlert" size={13} /> 식별 신뢰도 60% 이하는 도감에 저장할 수 없어요</span>
              </div>
            )}
            <div style={{display:"flex",gap:"8px"}}>
              <button
                onClick={onRetry}
                style={{flex:"0 0 50px",height:"50px",borderRadius:"12px",background:"var(--surface)",border:"1px solid var(--gold-bd)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:"2px",cursor:"pointer",color:"var(--ink-2)",flexShrink:0}}
              >
                <Icon name="Camera" size={16} />
                <span style={{fontSize:"8px",fontWeight:"600",letterSpacing:"0.3px"}}>다시찍기</span>
              </button>
              <button
                onClick={handleSave}
                disabled={saving||saved||notIdentified}
                className={notIdentified?"":"btn-shine"}
                style={{flex:"1 1 auto",height:"50px",borderRadius:"12px",border:"none",background:notIdentified?"rgba(45,30,10,0.08)":saved?"var(--ink-3)":"linear-gradient(135deg,#1D4ED8,var(--R))",color:notIdentified?"var(--ink-3)":"#fff",fontFamily:"'Black Han Sans',sans-serif",fontSize:"18px",letterSpacing:"3px",cursor:(saved||notIdentified)?"not-allowed":"pointer",boxShadow:(saved||notIdentified)?"none":"0 6px 20px rgba(37,99,235,0.3)",opacity:notIdentified?0.7:1,display:"flex",alignItems:"center",justifyContent:"center",gap:"8px",lineHeight:"1"}}
              >
                {notIdentified
                  ? <><Icon name="XCircle" size={17} /><span style={{lineHeight:"1"}}>도감 추가 불가</span></>
                  : saved
                    ? <><Icon name="Check" size={17} strokeWidth={2.5} /><span style={{lineHeight:"1"}}>도감에 저장됨</span></>
                    : saving
                      ? "저장 중…"
                      : <><Icon name="BookOpen" size={20} strokeWidth={2.4} /><span style={{lineHeight:"1"}}>도감에 추가!</span></>
                }
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
