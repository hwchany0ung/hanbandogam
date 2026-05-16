var EVENTS = [
  {
    tag:"NEW", color:"var(--R)", bg:"var(--R-bg)", bd:"var(--R-bd)", icon:"Flame",
    title:"5월 생태 챌린지", sub:"희귀종 5종 수집하면 특별 배지 지급", period:"~5.31",
  },
  {
    tag:"이벤트", color:"var(--L)", bg:"var(--L-bg)", bd:"var(--L-bd)", icon:"MapPin",
    title:"서식지 제보 이벤트", sub:"미발견 자생지 제보로 생태 지도를 채워요", period:"상시",
  },
  {
    tag:"공지", color:"var(--C)", bg:"var(--C-bg)", bd:"var(--C-bd)", icon:"Bell",
    title:"앱 업데이트 안내", sub:"도감 정렬·저신뢰도 UI가 새로워졌어요", period:"2026.05",
    action:"notice",
  },
];

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

var NOTICE_CONTENT = {
  tag:"공지", color:"var(--C)", bg:"var(--C-bg)", bd:"var(--C-bd)",
  title:"포인트 후원 기부 제도",
  period:"2026.05",
  sections: [
    {
      icon:"Heart",
      heading:"포인트로 자연을 지킬 수 있어요",
      body:"한반도감에서 생물을 발견하고 모은 포인트를 국내 생태 보전 단체에 기부할 수 있습니다. 내 탐사가 실제 자연 보호로 이어집니다.",
    },
    {
      icon:"Building2",
      heading:"참여 단체",
      list:["국립생태원 — 멸종위기종 복원 연구","한국자연환경보전협회 — 생태 서식지 보전","습지와 새들의 친구 — 철새 도래지 보호","녹색연합 — 백두대간 생태 감시"],
    },
    {
      icon:"Zap",
      heading:"기부 방법",
      body:"도감 > 포인트 탭에서 원하는 단체를 선택하고 기부할 포인트를 입력하세요. 최소 10pt부터 기부 가능하며, 기부 내역은 마이페이지에서 확인할 수 있습니다.",
    },
  ],
};

function UploadView({ onUpload, onDemoCapture, collectionCount, missionCompleted }) {
  var [dragging, setDragging] = React.useState(false);
  var [showNotice, setShowNotice] = React.useState(false);
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
    var maxBytes = window.MAX_UPLOAD_IMAGE_BYTES || (15*1024*1024);
    var maxLabel = window.MAX_UPLOAD_IMAGE_LABEL || "15MB";
    if (file.size > maxBytes) { alert(maxLabel + " 이하 이미지만 가능해요"); return; }
    onUpload(file);
  }

  var mission = DAILY_MISSIONS[new Date().getDate() % DAILY_MISSIONS.length];

  return (
    <div className="home-screen flex flex-col flex-1 relative overflow-hidden" style={{background:"var(--paper)"}}>

      {/* 공지 모달 */}
      {showNotice && (
        <div
          onClick={function(){setShowNotice(false);}}
          style={{position:"fixed",inset:0,zIndex:500,background:"rgba(31,26,18,0.55)",display:"flex",alignItems:"flex-end",justifyContent:"center",padding:"0 0 24px"}}
        >
          <div
            onClick={function(e){e.stopPropagation();}}
            style={{width:"100%",maxWidth:"420px",borderRadius:"20px 20px 16px 16px",background:"var(--C-bg)",border:"1px solid var(--C-bd)",boxShadow:"0 -4px 32px rgba(31,26,18,0.18)",overflow:"hidden"}}
          >
            {/* 모달 헤더 */}
            <div style={{padding:"16px 18px 12px",borderBottom:"1px solid var(--C-bd)",display:"flex",alignItems:"center",gap:"8px"}}>
              <div style={{padding:"2px 9px",background:"rgba(255,255,255,0.55)",border:"1px solid var(--C-bd)",borderRadius:"8px",fontFamily:"'Space Mono',monospace",fontSize:"8px",fontWeight:"700",color:"var(--C)",letterSpacing:"1px"}}>{NOTICE_CONTENT.tag}</div>
              <div style={{fontFamily:"'Noto Serif KR',serif",fontSize:"15px",fontWeight:"900",color:"var(--ink-1)",flex:1}}>{NOTICE_CONTENT.title}</div>
              <button onClick={function(){setShowNotice(false);}} style={{background:"none",border:"none",cursor:"pointer",color:"var(--ink-3)",padding:"2px",lineHeight:0}}>
                <Icon name="X" size={18} strokeWidth={2} />
              </button>
            </div>
            {/* 모달 본문 */}
            <div style={{padding:"14px 18px 18px",display:"flex",flexDirection:"column",gap:"14px",maxHeight:"60vh",overflowY:"auto"}}>
              {NOTICE_CONTENT.sections.map(function(sec, si) {
                return (
                  <div key={si} style={{padding:"12px 14px",borderRadius:"14px",background:"rgba(255,255,255,0.55)",border:"1px solid var(--C-bd)"}}>
                    <div style={{display:"flex",alignItems:"center",gap:"7px",marginBottom:"7px"}}>
                      <div style={{width:"26px",height:"26px",borderRadius:"8px",background:"var(--C-bg)",border:"1px solid var(--C-bd)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                        <Icon name={sec.icon} size={14} strokeWidth={2} style={{color:"var(--C)"}} />
                      </div>
                      <div style={{fontFamily:"'Noto Serif KR',serif",fontSize:"12px",fontWeight:"800",color:"var(--ink-1)",lineHeight:"1.3"}}>{sec.heading}</div>
                    </div>
                    {sec.body && <div style={{fontSize:"11px",color:"var(--ink-3)",lineHeight:"1.6"}}>{sec.body}</div>}
                    {sec.list && (
                      <ul style={{margin:0,padding:0,listStyle:"none",display:"flex",flexDirection:"column",gap:"5px"}}>
                        {sec.list.map(function(item, li) {
                          return (
                            <li key={li} style={{display:"flex",alignItems:"flex-start",gap:"6px",fontSize:"11px",color:"var(--ink-3)",lineHeight:"1.5"}}>
                              <span style={{color:"var(--C)",fontWeight:"700",flexShrink:0,marginTop:"1px"}}>·</span>
                              <span>{item}</span>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                );
              })}
              <div style={{textAlign:"center",fontFamily:"'Space Mono',monospace",fontSize:"9px",color:"var(--C)",letterSpacing:"1px",opacity:0.7}}>{NOTICE_CONTENT.period} 시행</div>
            </div>
          </div>
        </div>
      )}

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

        {/* 이벤트 게시판 */}
        <div style={{marginBottom:"var(--mission-button-gap)"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"8px",paddingLeft:"var(--home-x-pad)",paddingRight:"var(--home-x-pad)"}}>
            <div style={{fontFamily:"'Space Mono',monospace",fontSize:"9px",fontWeight:"700",letterSpacing:"2px",color:"var(--ink-3)"}}>이벤트 · 공지</div>
          </div>
          {/* 스크롤 컨테이너를 전체 너비로 — paddingLeft를 안으로 이동해 366px 제한 해소 */}
          <div style={{display:"flex",gap:"8px",overflowX:"auto",paddingLeft:"var(--home-x-pad)",paddingBottom:"4px",scrollbarWidth:"none",WebkitOverflowScrolling:"touch"}}>
            {EVENTS.map(function(ev, i) {
              return (
                <div key={i} onClick={function(){if(ev.action==="notice") setShowNotice(true);}} style={{flexShrink:0,width:"188px",padding:"12px 14px",borderRadius:"14px",background:ev.bg,border:"1px solid "+ev.bd,boxShadow:"0 2px 10px rgba(45,30,10,0.06)",cursor:ev.action?"pointer":"default"}}>
                  <div style={{display:"flex",alignItems:"center",gap:"6px",marginBottom:"7px"}}>
                    <div style={{padding:"2px 7px",background:"rgba(255,255,255,0.55)",border:"1px solid "+ev.bd,borderRadius:"8px",fontFamily:"'Space Mono',monospace",fontSize:"8px",fontWeight:"700",color:ev.color,letterSpacing:"1px"}}>{ev.tag}</div>
                    <span style={{fontFamily:"'Space Mono',monospace",fontSize:"8px",color:ev.color,marginLeft:"auto",opacity:0.8}}>{ev.period}</span>
                  </div>
                  <div style={{fontFamily:"'Noto Serif KR',serif",fontSize:"13px",fontWeight:"800",color:"var(--ink-1)",marginBottom:"3px",lineHeight:"1.3"}}>{ev.title}</div>
                  <div style={{fontSize:"10px",color:"var(--ink-3)",lineHeight:"1.45"}}>{ev.sub}</div>
                </div>
              );
            })}
            <div style={{flexShrink:0,width:"var(--home-x-pad)",minWidth:"var(--home-x-pad)"}} />
          </div>
        </div>

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
