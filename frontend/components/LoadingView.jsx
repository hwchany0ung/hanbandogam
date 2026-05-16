function LoadingView() {
  return (
    <div className="flex flex-col items-center justify-center flex-1 gap-4" style={{background:"rgba(244,237,220,0.96)"}}>
      <div style={{width:"56px",height:"56px",borderRadius:"50%",border:"2px solid rgba(184,144,47,0.18)",borderTopColor:"var(--gold)",animation:"spin 0.9s linear infinite"}}/>
      <div style={{fontFamily:"'Noto Serif KR',serif",fontSize:"16px",fontWeight:"700",color:"var(--ink-1)"}}>Claude Vision 분석 중…</div>
      <div style={{fontFamily:"'Space Mono',monospace",fontSize:"9px",color:"var(--ink-3)",letterSpacing:"3px"}}>IDENTIFYING · CLAUDE-SONNET-4-6</div>
      <div style={{display:"inline-flex",alignItems:"center",gap:"5px",padding:"4px 10px",background:"var(--E-bg)",border:"1px solid var(--E-bd)",borderRadius:"20px",fontFamily:"'Space Mono',monospace",fontSize:"9px",color:"var(--E)",fontWeight:"700"}}>
        ✦ AI POWERED
      </div>
    </div>
  );
}
