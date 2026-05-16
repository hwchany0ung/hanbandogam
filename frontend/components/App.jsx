// 미션 인덱스 → DEMO_CAPTURES 인덱스 (0=따오기 1=미선나무 2=수달 3=동강할미꽃)
var MISSION_DEMO_IDX = [1,3,1,1,1,2,1,3,3,1,0,0,1,3];

// ── 데모 캡처 시나리오 (고희귀도 순환) ─────────────────────────────
var DEMO_CAPTURES = [
  {
    korean_name: "노랑갈퀴",
    scientific_name: "Vicia chosenensis",
    native_status: "토종",
    confidence: 0.95,
    ecology_summary: "한반도 고유의 콩과 야생화로, 황금빛 노란색 나비 모양 꽃이 무리지어 피는 한국 특산종이다. 강원도 산지 능선과 메마른 경사면에서 5~6월에 만날 수 있으며, 자생지가 한정되어 발견하기 쉽지 않다.",
    conservation_status: "VU — 한반도 특산 콩과 식물",
    morphological_clues: "황금색 나비 모양 꽃 5~10송이, 잎 7~10쌍 작은잎, 덩굴손, 5~6월 개화",
    image_path: "/assets/illustrations/plant_015_노랑갈퀴.png",
    memo: "강원도 태백산 능선",
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
    korean_name: "가시복분자딸기",
    scientific_name: "Rubus phoenicolasius",
    native_status: "토종",
    confidence: 0.94,
    ecology_summary: "한국·일본·중국 동부에만 자생하는 야생 산딸기로, 줄기 전체가 붉은 가시털로 빽빽이 덮여 있다. 7~8월에 익는 진홍색 열매는 작은 보석처럼 빛나며, 산지 가장자리·계곡 주변에서 발견된다.",
    conservation_status: "LC — 산지 자생 한국 토종 산딸기",
    morphological_clues: "줄기에 붉은 선모 가시, 잎 뒷면 흰 솜털, 진홍색 작은 둥근 열매, 5장 잎",
    image_path: "/assets/illustrations/plant_002_가시복분자딸기.png",
    memo: "강원도 평창 계곡 산지",
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
    showToast("도감 +1! "+result.korean_name+" 수집 완료");
  }

  var tabs = [
    { id:"upload",     icon:"Camera", label:"촬영" },
    { id:"collection", icon:"BookOpen", label:"도감" },
    { id:"map",        icon:"Map", label:"지도" },
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
            <Icon name={t.icon} size={20} strokeWidth={activeTab===t.id ? 2.4 : 2} />
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
