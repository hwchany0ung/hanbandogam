function ErrorView({ message, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center flex-1 gap-4 px-6 text-center" style={{background:"var(--paper)"}}>
      <Icon name="CircleAlert" size={48} strokeWidth={1.6} style={{color:"var(--gold)"}} />
      <p style={{fontFamily:"'Noto Serif KR',serif",fontSize:"16px",fontWeight:"700",color:"var(--ink-1)"}}>식별에 실패했어요</p>
      <p style={{fontSize:"13px",color:"var(--ink-3)"}}>{message||"잠시 후 다시 시도해주세요"}</p>
      <button
        onClick={onRetry}
        className="btn-shine px-8 py-3 rounded-xl"
        style={{background:"linear-gradient(135deg,var(--ink-1),#2C261B)",color:"#FBF7EC",fontFamily:"'Black Han Sans',sans-serif",fontSize:"14px",letterSpacing:"2px",border:"none",cursor:"pointer",marginTop:"8px"}}
      >
        다시 시도
      </button>
    </div>
  );
}
