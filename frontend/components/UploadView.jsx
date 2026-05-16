function UploadView({ onUpload, onDemoCapture, collectionCount }) {
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
        <button
          onClick={() => inputRef.current.click()}
          className="w-full py-3.5 rounded-xl flex items-center justify-center gap-2"
          style={{background:"var(--surface)",border:"1px solid var(--gold-bd)",color:"var(--ink-2)",fontSize:"13px",fontWeight:"500"}}
        >
          🖼️&nbsp;&nbsp;갤러리에서 선택
        </button>
      </div>

      {/* 통계 띠 */}
      <div className="mx-5 mt-6 relative" style={{zIndex:2}}>
        <div className="flex justify-between items-center px-3 py-4 rounded-xl" style={{background:"var(--surface)",border:"1px solid var(--gold-bd)",boxShadow:"0 4px 12px rgba(45,30,10,0.06)"}}>
          {[["102","등록 종"],[(collectionCount||0)+"","내 발견"],["AI","Claude"]].map(([n,l],i,arr)=>(
            <React.Fragment key={l}>
              <div className="flex-1 flex flex-col items-center gap-1">
                <div style={{fontFamily:"'Space Mono',monospace",fontSize:"24px",fontWeight:"700",color:"var(--gold)",lineHeight:1}}>{n}</div>
                <div style={{fontSize:"10px",color:"var(--ink-3)",letterSpacing:"1px",fontWeight:"600"}}>{l}</div>
              </div>
              {i<arr.length-1 && <div style={{width:"1px",height:"36px",background:"var(--gold-bd)",flexShrink:0}}/>}
            </React.Fragment>
          ))}
        </div>
      </div>

      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={e=>handleFile(e.target.files[0])}/>
    </div>
  );
}
