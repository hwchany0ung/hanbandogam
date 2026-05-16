var DAILY_MISSIONS = [
  "흰색과 초록색이 공존하는 식물을 찍어보세요",
  "길가에서 발견한 들꽃을 찾아보세요",
  "가장 가까운 공원에서 나무를 탐색해보세요",
  "노란색 꽃이 피어있는 식물을 찾아보세요",
  "잎 모양이 독특한 식물을 발견해보세요",
  "물가 주변의 수생식물을 촬영해보세요",
  "산이나 숲에서 특이한 식물을 찾아보세요",
  "자주색 또는 보라색 꽃을 피운 식물을 찾아보세요",
  "줄기나 가시가 특이한 식물을 찍어보세요",
  "꽃보다 잎이 더 아름다운 식물을 탐색해보세요",
  "빨간 열매를 맺은 식물을 발견해보세요",
  "이름을 모르는 식물을 사진으로 찍어보세요",
  "넓은 잎사귀를 가진 식물을 찾아보세요",
  "돌이나 바위 틈에서 자라는 식물을 발견해보세요",
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

  return (
    <div className="flex flex-col flex-1 relative overflow-hidden" style={{background:"var(--paper)"}}>
      <div ref={bokehRef} className="absolute inset-0 pointer-events-none overflow-hidden" style={{zIndex:0}}/>

      {/* 헤더 */}
      <div className="text-center pt-12 pb-6 relative" style={{zIndex:2}}>
        <div style={{fontFamily:"'Black Han Sans',sans-serif",fontSize:"32px",letterSpacing:"6px",color:"var(--ink-1)"}}>한반도감</div>
        <div style={{fontFamily:"'Space Mono',monospace",fontSize:"9px",color:"var(--gold)",letterSpacing:"4px",marginTop:"5px"}}>KOREAN SPECIES FIELD GUIDE</div>
      </div>

      {/* 조리개 */}
      <div className="flex flex-col items-center relative" style={{zIndex:2}}>
        <div
          onClick={() => inputRef.current.click()}
          onDragOver={e=>{e.preventDefault();setDragging(true);}}
          onDragLeave={()=>setDragging(false)}
          onDrop={e=>{e.preventDefault();setDragging(false);handleFile(e.dataTransfer.files[0]);}}
          className="cursor-pointer"
          style={{width:"196px",height:"196px",position:"relative"}}
        >
          <div className="ring ring-1"/><div className="ring ring-2"/><div className="ring ring-3"/>
          <div className="aperture-core" style={{opacity:dragging?0.7:1}}>
            <div className="scan-bar"/>
            <div style={{fontSize:"36px"}}>🔭</div>
            <div style={{fontFamily:"'Space Mono',monospace",fontSize:"8px",color:"var(--ink-3)",letterSpacing:"2px"}}>TAP TO SCAN</div>
          </div>
        </div>

        <div className="text-center mt-5">
          <div style={{fontFamily:"'Noto Serif KR',serif",fontSize:"20px",fontWeight:"700",color:"var(--ink-1)"}}>생물을 발견하세요</div>
          <div style={{fontSize:"12px",color:"var(--ink-2)",marginTop:"6px"}}>사진 한 장으로 토종 생물 즉시 판별</div>
        </div>
      </div>

      {/* 버튼 */}
      <div className="px-6 mt-7 flex flex-col gap-3 relative" style={{zIndex:2}}>
        <button
          onClick={() => onDemoCapture ? onDemoCapture() : inputRef.current.click()}
          className="btn-shine w-full py-4 rounded-xl flex items-center justify-center gap-3"
          style={{background:"linear-gradient(135deg,var(--ink-1),#2C261B)",color:"#FBF7EC",fontFamily:"'Black Han Sans',sans-serif",fontSize:"15px",letterSpacing:"3px",boxShadow:"0 8px 24px rgba(45,30,10,0.25)",border:"none"}}
        >
          📷&nbsp;&nbsp;카메라로 촬영
        </button>
      </div>

      {/* 일일 미션 */}
      <div className="mx-5 mt-6 relative" style={{zIndex:2}}>
        <div className="px-4 py-4 rounded-xl" style={{
          background: missionCompleted ? "rgba(22,163,74,0.07)" : "var(--surface)",
          border: "1px solid " + (missionCompleted ? "rgba(22,163,74,0.35)" : "var(--gold-bd)"),
          boxShadow: "0 4px 12px rgba(45,30,10,0.06)",
          transition: "all 0.4s"
        }}>
          <div style={{display:"flex",alignItems:"center",gap:"6px",marginBottom:"8px"}}>
            <div style={{fontFamily:"'Space Mono',monospace",fontSize:"9px",fontWeight:"700",letterSpacing:"2px",color:missionCompleted?"var(--native)":"var(--gold)"}}>
              {missionCompleted ? "✓ MISSION COMPLETE" : "✦ TODAY'S MISSION"}
            </div>
          </div>
          <div style={{fontFamily:"'Noto Serif KR',serif",fontSize:"14px",fontWeight:"600",color:"var(--ink-1)",lineHeight:1.65}}>
            "{DAILY_MISSIONS[new Date().getDate() % DAILY_MISSIONS.length]}"
          </div>
          {missionCompleted
            ? <div style={{marginTop:"10px",fontSize:"11px",color:"var(--native)",fontWeight:"600"}}>🎉 오늘의 미션을 완료했어요!</div>
            : <div style={{marginTop:"10px",fontSize:"10px",color:"var(--ink-3)"}}>위 촬영 버튼을 눌러 미션을 달성해보세요 📸</div>
          }
        </div>
      </div>

      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={e=>handleFile(e.target.files[0])}/>
    </div>
  );
}
