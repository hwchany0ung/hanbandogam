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
    korean_name: "미선나무",
    scientific_name: "Abeliophyllum distichum",
    native_status: "토종",
    confidence: 0.97,
    ecology_summary: "지구상에서 오직 한반도에만 자라는 1속 1종의 한국 특산식물. 세계에서 가장 희귀한 수목 중 하나로 꼽히며 괴산·진안 등 4개 자생지만 천연기념물로 지정 보호 중이다.",
    conservation_status: "VU — 세계 유일 한반도 특산 1속 1종",
    morphological_clues: "부채꼴 납작한 시과, 2~3월 잎보다 먼저 피는 흰 꽃, 대생 타원형 잎",
    image_path: "/assets/photos/미선나무.jpg",
    memo: "괴산 자생지 군락",
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
    korean_name: "동강할미꽃",
    scientific_name: "Pulsatilla tongkangensis",
    native_status: "토종",
    confidence: 0.94,
    ecology_summary: "동강 석회암 절벽에만 자생하는 한국 특산종. 2000년 동강댐 건설 반대 여론의 상징이 된 꽃으로, 댐이 지어졌다면 영원히 사라졌을 식물이다. 현재 자생지 전체가 멸종위기 서식지로 관리된다.",
    conservation_status: "EN — 동강 석회암 절벽 한정 자생",
    morphological_clues: "꽃잎 6장 보라색, 전체 흰 솜털, 3~4월 개화, 석회암 절벽 틈 특이 서식",
    image_path: "/assets/photos/동강할미꽃.jpg",
    memo: "동강 백운산 절벽",
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

    // 첫 촬영은 오늘의 미션에 맞는 종, 이후 순환
    var todayMissionIdx = new Date().getDate() % MISSION_DEMO_IDX.length;
    var captureIdx = demoIdx === 0
      ? MISSION_DEMO_IDX[todayMissionIdx]
      : demoIdx % DEMO_CAPTURES.length;
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
    <div className="app-shell">
      <div className="paper-tex"/>

      {/* 셔터 플래시 오버레이 */}
      {shutterOn && (
        <div style={{position:"fixed",inset:0,zIndex:9999,background:"rgba(255,255,255,0.92)",pointerEvents:"none",animation:"shutterFlash 0.35s ease-out forwards"}}/>
      )}

      {/* 뷰 */}
      <div className="app-view">
        {view==="upload"     && <UploadView onUpload={handleUpload} onDemoCapture={handleDemoCapture} collectionCount={colCount} missionCompleted={missionCompleted}/>}
        {view==="map"        && <MapView onBack={()=>setView("upload")}/>}
        {view==="loading"    && <LoadingView/>}
        {view==="result"     && <ResultCard result={result} imageFile={imageFile} onRetry={handleRetry} onSave={handleSaved} onCollection={()=>setView("collection")}/>}
        {view==="collection" && <CollectionView onBack={()=>setView("upload")}/>}
        {view==="error"      && <ErrorView message={errMsg} onRetry={handleRetry}/>}
      </div>

      {/* 바텀 내비 */}
      <div className="bottom-tabs">
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
