var DAILY_MISSIONS = [
  { icon:"Leaf", title:"흰초록 조화를 발견하라!", sub:"흰색과 초록색이 공존하는 식물을 찾아보세요" },
  { icon:"Flower2", title:"길가의 들꽃을 찾아라!",   sub:"길가에서 발견한 들꽃을 촬영해보세요" },
  { icon:"TreeDeciduous", title:"공원의 나무를 탐색하라!", sub:"가장 가까운 공원에서 나무를 찾아보세요" },
  { icon:"Flower", title:"노란 꽃을 발견하라!",     sub:"노란색 꽃이 피어있는 식물을 찍어보세요" },
  { icon:"Leaf", title:"독특한 잎을 찾아라!",     sub:"잎 모양이 독특한 식물을 발견해보세요" },
  { icon:"Droplets", title:"물가 생물을 탐색하라!",   sub:"물가 주변의 생물을 촬영해보세요" },
  { icon:"Trees", title:"산속의 식물을 찾아라!",   sub:"산이나 숲에서 특이한 식물을 탐색해보세요" },
  { icon:"Flower2", title:"보라 꽃을 발견하라!",     sub:"자주색 또는 보라색 꽃을 찾아보세요" },
  { icon:"Sprout", title:"가시 식물을 찾아라!",     sub:"줄기나 가시가 특이한 식물을 촬영해보세요" },
  { icon:"Leaf", title:"잎의 아름다움을 담아라!", sub:"꽃보다 잎이 인상적인 식물을 탐색해보세요" },
  { icon:"Flower", title:"빨간 열매를 발견하라!",   sub:"빨간 열매를 맺은 식물을 찾아보세요" },
  { icon:"Search", title:"미지의 식물을 만나라!",   sub:"이름을 모르는 식물을 사진으로 찍어보세요" },
  { icon:"Leaf", title:"넓은 잎을 찾아라!",       sub:"넓은 잎사귀를 가진 식물을 발견해보세요" },
  { icon:"Mountain", title:"바위틈 생명을 찾아라!",   sub:"돌이나 바위 틈에서 자라는 식물을 발견해보세요" },
];

function UploadView({ onUpload, onDemoCapture, collectionCount, missionCompleted }) {
  var [dragging, setDragging] = React.useState(false);
  var inputRef = React.useRef(null);
  var bokehRef = React.useRef(null);

  // 보케 생성
  React.useEffect(() => {
    if (!bokehRef.current) return;
    var cols = ["rgba(184,144,47,","rgba(22,163,74,","rgba(37,99,235,","rgba(139,92,246,"];
    for (var i = 0; i < 14; i++) {
      var d = document.createElement("div");
      d.className = "bokeh-dot";
      var s = Math.random()*50+12;
      var col = cols[Math.floor(Math.random()*cols.length)];
      var op = (Math.random()*0.10+0.04).toFixed(2);
      d.style.cssText = "width:"+s+"px;height:"+s+"px;left:"+(Math.random()*100)+"%;"+
        "background:"+col+op+");"+
        "animation-duration:"+(Math.random()*14+8).toFixed(1)+"s;"+
        "animation-delay:"+(Math.random()*-18).toFixed(1)+"s;"+
        "filter:blur("+(s/3).toFixed(0)+"px);";
      bokehRef.current.appendChild(d);
    }
  }, []);

  function handleFile(file) {
    if (!file) return;
    if (!file.type.startsWith("image/")) { alert("이미지 파일만 업로드 가능해요"); return; }
    if (file.size > 5*1024*1024) { alert("5MB 이하 이미지만 가능해요"); return; }
    onUpload(file);
  }

  var mission = DAILY_MISSIONS[new Date().getDate() % DAILY_MISSIONS.length];

  return (
    <div className="home-screen flex flex-col flex-1 relative overflow-hidden" style={{background:"var(--paper)"}}>
      <div ref={bokehRef} className="absolute inset-0 pointer-events-none overflow-hidden" style={{zIndex:0}}/>

      {/* 헤더 */}
      <div className="home-header text-center relative" style={{zIndex:2}}>
        <div className="home-logo">한반도감</div>
        <div className="home-subtitle">KOREAN SPECIES FIELD GUIDE</div>
      </div>

      {/* 조리개 — 실제 카메라 (기능 테스트용, 시연 X) */}
      <div className="home-scan-zone flex flex-col items-center relative" style={{zIndex:2}}>
        <div
          onClick={() => inputRef.current.click()}
          onDragOver={e=>{e.preventDefault();setDragging(true);}}
          onDragLeave={()=>setDragging(false)}
          onDrop={e=>{e.preventDefault();setDragging(false);handleFile(e.dataTransfer.files[0]);}}
          className="home-scanner cursor-pointer"
        >
          <div className="ring ring-1"/><div className="ring ring-2"/><div className="ring ring-3"/>
          <div className="aperture-core" style={{opacity:dragging?0.7:1}}>
            <div className="scan-bar"/>
            <Icon name="ScanSearch" size={36} strokeWidth={1.8} style={{color:"var(--ink-2)"}} />
            <div style={{fontFamily:"'Space Mono',monospace",fontSize:"8px",color:"var(--ink-3)",letterSpacing:"2px"}}>TAP TO SCAN</div>
          </div>
        </div>

        <div className="home-copy text-center">
          <div className="home-copy-title">생물을 발견하세요</div>
          <div className="home-copy-sub">사진 한 장으로 토종 생물 즉시 판별</div>
        </div>
      </div>

      <div className="home-bottom-stack relative" style={{zIndex:2}}>
        {/* 일일 미션 카드 (카메라 바로 위) */}
        <div className="home-mission-wrap">
          <div
            onClick={() => onDemoCapture ? onDemoCapture() : inputRef.current.click()}
            className="home-mission-card rounded-xl cursor-pointer"
            style={{
              background: missionCompleted ? "rgba(22,163,74,0.07)" : "var(--surface)",
              border: "1px solid " + (missionCompleted ? "rgba(22,163,74,0.35)" : "rgba(45,30,10,0.06)"),
              boxShadow: "0 2px 14px rgba(45,30,10,0.08)",
              transition: "all 0.4s",
            }}
          >
            <div
              className="home-mission-icon"
              style={{
                background: missionCompleted ? "rgba(22,163,74,0.10)" : "var(--gold-dim)",
                color: missionCompleted ? "var(--native)" : "var(--gold)",
              }}
            >
              <Icon name={mission.icon} size={20} strokeWidth={1.9} />
            </div>

            <div className="home-mission-body">
              <div className="home-mission-label" style={{color:missionCompleted?"var(--native)":"var(--gold)"}}>
                {missionCompleted ? "오늘의 미션 완료" : "오늘의 탐사 미션"}
              </div>
              <div className="home-mission-title">
                {missionCompleted ? "미션 달성!" : mission.title}
              </div>
              <div className="home-mission-sub">
                {mission.sub}
              </div>
            </div>

            <div style={{color:missionCompleted?"var(--native)":"var(--ink-3)",flexShrink:0,lineHeight:0}}>
              <Icon name={missionCompleted ? "BadgeCheck" : "ArrowRight"} size={18} strokeWidth={2} />
            </div>
          </div>
        </div>

        {/* 카메라 버튼 */}
        <div className="home-primary-wrap flex flex-col gap-3">
          <button
            onClick={() => onDemoCapture ? onDemoCapture() : inputRef.current.click()}
            className="btn-shine home-primary-button w-full rounded-xl flex items-center justify-center gap-3"
            style={{background:"linear-gradient(135deg,var(--ink-1),#2C261B)"}}
          >
            <Icon name="Camera" size={18} strokeWidth={2.3} /> <span>카메라로 촬영</span>
          </button>
        </div>
      </div>

      <input ref={inputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={e=>handleFile(e.target.files[0])}/>
    </div>
  );
}
