function LoadingView() {
  return (
    <div className="flex flex-col items-center justify-center flex-1 gap-4" style={{background:"rgba(244,237,220,0.96)"}}>
      <div style={{width:"56px",height:"56px",borderRadius:"50%",border:"2px solid rgba(184,144,47,0.18)",borderTopColor:"var(--gold)",animation:"spin 0.9s linear infinite"}}/>
      <div style={{fontFamily:"'Noto Serif KR',serif",fontSize:"18px",fontWeight:"700",color:"var(--ink-1)",letterSpacing:"1px"}}>한반도감이 판별 중입니다…</div>
    </div>
  );
}
