// 미션 인덱스 → DEMO_CAPTURES 인덱스 (0=따오기 1=미선나무 2=수달 3=동강할미꽃)
var MISSION_DEMO_IDX = [1,3,1,1,1,2,1,3,3,1,0,0,1,3];

// ── 데모 캡처 시나리오 (고희귀도 순환) ─────────────────────────────
var DEMO_CAPTURES = [
  {
    korean_name: "따오기",
    scientific_name: "Nipponia nippon",
    native_status: "토종",
    confidence: 0.98,
    ecology_summary: "한때 한반도 전역에 서식했으나 1978년 비무장지대에서 마지막 개체가 목격된 이후 야생 절멸 판정을 받았다. 2008년 중국에서 기증된 한 쌍을 시작으로 창녕 우포늪에서 복원 중이며 현재 400여 개체가 생존한다.",
    conservation_status: "CR — 국내 야생절멸 후 복원 중",
    morphological_clues: "흰 깃털에 붉은 얼굴, 긴 부리 끝 하향 만곡, 날개 아래 연한 붉은 빛",
    image_path: "/assets/photos/따오기.jpg",
    memo: "우포늪 상공 촬영",
  },
  {
    korean_name: "한라솜다리",
    scientific_name: "Leontopodium hallaisanense",
    native_status: "토종",
    confidence: 0.94,
    ecology_summary: "한라산 해발 1,500m 이상 정상부에만 자생하는 한국 특산종. '한국의 에델바이스'로 불리며, 별 모양 흰 솜털 포엽이 추위와 강풍을 견디는 고산 생태계의 상징이다. 야생 개체수가 200여 본 이하로 추정되는 초희귀 식물.",
    conservation_status: "CR — 한라산 정상부 한정 200여 본 생존",
    morphological_clues: "별 모양 흰 솜털 포엽, 작은 노란 꽃 머리, 좁고 두꺼운 잎, 전체 은백색 솜털",
    image_path: "/assets/illustrations/한라솜다리.svg",
    memo: "한라산 백록담 능선",
  },
  {
    korean_name: "수달",
    scientific_name: "Lutra lutra",
    native_status: "토종",
    confidence: 0.95,
    ecology_summary: "1급 멸종위기 포유류. 하천 생태계의 최상위 포식자로 수질 오염에 극도로 민감해 수달이 사는 강은 1등급 청정수 판정 기준이 된다. 천연기념물 제330호.",
    conservation_status: "EN — 멸종위기 1급 · 천연기념물 330호",
    morphological_clues: "납작한 머리, 긴 몸통, 두꺼운 꼬리, 발가락 사이 물갈퀴, 갈색 방수털",
    image_path: "/assets/photos/수달.jpg",
    memo: "섬진강 상류 직접 관찰",
  },
  {
    korean_name: "분홍바늘꽃",
    scientific_name: "Chamerion angustifolium",
    native_status: "토종",
    confidence: 0.93,
    ecology_summary: "산불·벌목 후 가장 먼저 자라나는 '개척자 식물'. 분홍색 꽃이 긴 이삭처럼 피며, 한 그루가 한 시즌에 8만 개의 깃털 달린 씨앗을 만들어 바람을 타고 멀리 날아간다. 강원도 산림 복원지의 상징.",
    conservation_status: "VU — 산림 화재·벌목 복원지 의존",
    morphological_clues: "분홍색 꽃 긴 이삭, 좁고 긴 잎 어긋나기, 길게 늘어지는 깃털 씨앗, 7~8월 개화",
    image_path: "/assets/illustrations/분홍바늘꽃.svg",
    memo: "강원도 평창 화재 복원지",
  },
];

function App() {
  var [view,         setView]         = React.useState("upload");
  var [result,       setResult]       = React.useState(null);
  var [imageFile,    setImageFile]    = React.useState(null);
  var [errMsg,       setErrMsg]       = React.useState("");
  var [colCount,     setColCount]     = React.useState(0);
  var [toast,        setToast]        = React.useState("");
  var [shutterOn,        setShutterOn]        = React.useState(false);
  var [demoIdx,          setDemoIdx]          = React.useState(0);
  var [missionCompleted, setMissionCompleted] = React.useState(false);

  React.useEffect(()=>{
    getCollection().then(list=>setColCount(list.length)).catch(()=>{});
  },[]);

  function showToast(msg) {
    setToast(msg);
    setTimeout(()=>setToast(""),2500);
  }

  async function handleUpload(file) {
    setImageFile(file); setView("loading");
    try { var res=await identifySpecies(file); setResult(res); setView("result"); }
    catch(e) { setErrMsg(e.message); setView("error"); }
  }

  async function handleDemoCapture() {
    setShutterOn(true);
    await new Promise(r=>setTimeout(r,350));
    setShutterOn(false);

    // 오늘 미션 기반 시작점 + 매 클릭마다 회전 (중복 없이 다양한 종)
    var todayMissionIdx = new Date().getDate() % MISSION_DEMO_IDX.length;
    var firstIdx = MISSION_DEMO_IDX[todayMissionIdx];
    var captureIdx = (firstIdx + demoIdx) % DEMO_CAPTURES.length;
    var capture = DEMO_CAPTURES[captureIdx];
    setDemoIdx(i=>i+1);
    setImageFile(null);
    setResult(null);
    setView("loading");

    await new Promise(r=>setTimeout(r,1800));
    setResult(capture);
    setView("result");
    setMissionCompleted(true);
  }

  function handleRetry() { setResult(null); setImageFile(null); setView("upload"); }

  function handleSaved() {
    setColCount(c=>c+1);
    showToast("📚 도감 +1! "+result.korean_name+" 수집 완료");
  }

  var tabs = [
    { id:"upload",     icon:"📸", label:"촬영" },
    { id:"collection", icon:"📚", label:"도감" },
    { id:"map",        icon:"🗺️", label:"지도" },
  ];

  var activeTab = view==="map" ? "map" : (view==="collection") ? "collection" : "upload";

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100vh",background:"var(--paper)",position:"relative"}}>
      <div className="paper-tex"/>

      {/* 셔터 플래시 오버레이 */}
      {shutterOn && (
        <div style={{position:"fixed",inset:0,zIndex:9999,background:"rgba(255,255,255,0.92)",pointerEvents:"none",animation:"shutterFlash 0.35s ease-out forwards"}}/>
      )}

      {/* 뷰 */}
      <div style={{flex:1,overflow:"hidden",display:"flex",flexDirection:"column",position:"relative",zIndex:1}}>
        {view==="upload"     && <UploadView onUpload={handleUpload} onDemoCapture={handleDemoCapture} collectionCount={colCount} missionCompleted={missionCompleted}/>}
        {view==="map"        && <MapView onBack={()=>setView("upload")}/>}
        {view==="loading"    && <LoadingView/>}
        {view==="result"     && <ResultCard result={result} imageFile={imageFile} onRetry={handleRetry} onSave={handleSaved} onCollection={()=>setView("collection")}/>}
        {view==="collection" && <CollectionView onBack={()=>setView("upload")}/>}
        {view==="error"      && <ErrorView message={errMsg} onRetry={handleRetry}/>}
      </div>

      {/* 바텀 내비 */}
      <div style={{position:"relative",zIndex:10,background:"rgba(244,237,220,0.96)",backdropFilter:"blur(20px)",borderTop:"1px solid var(--gold-bd)",display:"flex",padding:"8px 0 24px"}}>
        {tabs.map(t=>(
          <button
            key={t.id}
            onClick={()=>setView(t.id)}
            style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:"3px",background:"none",border:"none",cursor:"pointer",color:activeTab===t.id?"var(--gold)":"var(--ink-3)",padding:"6px 0"}}
          >
            <span style={{fontSize:"20px"}}>{t.icon}</span>
            <span style={{fontFamily:"'Space Mono',monospace",fontSize:"8px",fontWeight:"700",letterSpacing:"1px"}}>{t.label}</span>
          </button>
        ))}
      </div>

      {/* 토스트 */}
      <div className={"toast"+(toast?" show":"")}>{toast}</div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(React.createElement(App));
