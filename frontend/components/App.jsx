function App() {
  var [view,      setView]      = React.useState("upload");
  var [result,    setResult]    = React.useState(null);
  var [imageFile, setImageFile] = React.useState(null);
  var [errMsg,    setErrMsg]    = React.useState("");
  var [colCount,  setColCount]  = React.useState(0);
  var [toast,     setToast]     = React.useState("");

  // 도감 수 초기화
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

  function handleRetry() { setResult(null); setImageFile(null); setView("upload"); }

  function handleSaved() {
    setColCount(c=>c+1);
    showToast("📚 도감 +1! "+result.korean_name+" 수집 완료");
  }

  // 바텀 내비 항목
  var tabs = [
    { id:"upload",     icon:"📸", label:"촬영" },
    { id:"collection", icon:"📚", label:"도감" },
  ];

  var activeTab = (view==="upload"||view==="loading"||view==="result"||view==="error") ? "upload" : "collection";

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100vh",background:"var(--paper)",position:"relative"}}>
      <div className="paper-tex"/>

      {/* 뷰 */}
      <div style={{flex:1,overflow:"hidden",display:"flex",flexDirection:"column",position:"relative",zIndex:1}}>
        {view==="upload"     && <UploadView onUpload={handleUpload} collectionCount={colCount}/>}
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
