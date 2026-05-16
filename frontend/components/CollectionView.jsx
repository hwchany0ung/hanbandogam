function CollectionView({ onBack }) {
  var [items,   setItems]   = React.useState([]);
  var [loading, setLoading] = React.useState(true);

  React.useEffect(()=>{
    getCollection().then(setItems).catch(console.error).finally(()=>setLoading(false));
  },[]);

  async function handleDelete(id) {
    if (!confirm("도감에서 삭제할까요?")) return;
    try { await deleteCollectionItem(id); setItems(p=>p.filter(i=>i.id!==id)); }
    catch(e) { alert("삭제 실패: "+e.message); }
  }

  var pct = items.length ? (items.length/102*100).toFixed(1) : 0;

  // 희귀도별 카운트
  var rarCount = {L:0,E:0,R:0,U:0,C:0};
  var rarTotal  = {L:5,E:6,R:35,U:28,C:28};
  items.forEach(item=>{ var r=getRarity(item.korean_name); rarCount[r]=(rarCount[r]||0)+1; });

  return (
    <div className="flex flex-col flex-1 overflow-hidden" style={{background:"var(--paper)"}}>
      {/* 헤더 */}
      <div className="px-5 pt-12 pb-3">
        <div style={{fontFamily:"'Black Han Sans',sans-serif",fontSize:"28px",letterSpacing:"3px",color:"var(--ink-1)"}}>내 도감</div>
        <div style={{fontSize:"12px",color:"var(--ink-2)",marginTop:"4px"}}>발견한 한국 토종 생물 수집</div>
      </div>

      {/* 수집 현황 카드 */}
      <div className="mx-4 mb-3 px-5 py-4 rounded-xl flex justify-between items-center" style={{background:"var(--surface)",border:"1px solid var(--gold-bd)",boxShadow:"0 4px 14px rgba(45,30,10,0.06)"}}>
        <div>
          <div style={{fontFamily:"'Space Mono',monospace",fontSize:"36px",fontWeight:"700",color:"var(--gold)",lineHeight:1}}>
            {items.length}<span style={{fontSize:"18px",color:"var(--ink-3)"}}>/102</span>
          </div>
          <div style={{fontSize:"10px",color:"var(--ink-3)",marginTop:"5px",letterSpacing:"1px",fontWeight:"600"}}>SPECIES COLLECTED</div>
        </div>
        <div>
          <div style={{fontSize:"11px",color:"var(--ink-2)",textAlign:"right",fontWeight:"600"}}>수집률 {pct}%</div>
          <div style={{marginTop:"4px",width:"130px",height:"5px",background:"rgba(45,30,10,0.08)",borderRadius:"3px",overflow:"hidden"}}>
            <div style={{height:"100%",background:"linear-gradient(90deg,var(--gold),var(--gold-2))",borderRadius:"3px",width:pct+"%"}}/>
          </div>
        </div>
      </div>

      {/* 희귀도 진행 */}
      <div className="px-4 mb-3 flex flex-col gap-1.5">
        {["L","E","R","U","C"].map(r=>{
          var rc=RARITY_CONFIG[r], cnt=rarCount[r]||0, tot=rarTotal[r];
          return (
            <div key={r} className="flex items-center gap-2">
              <div style={{fontFamily:"'Space Mono',monospace",fontSize:"10px",width:"12px",textAlign:"center",fontWeight:"700",color:rc.color}}>{r}</div>
              <div style={{flex:1,height:"5px",background:"rgba(45,30,10,0.06)",borderRadius:"3px",overflow:"hidden"}}>
                <div style={{height:"100%",borderRadius:"3px",background:rc.color,width:(cnt/tot*100)+"%"}}/>
              </div>
              <div style={{fontFamily:"'Space Mono',monospace",fontSize:"9px",color:rc.color,width:"38px",textAlign:"right",fontWeight:"600"}}>{cnt}/{tot}</div>
            </div>
          );
        })}
      </div>

      {/* 본문 */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {loading ? (
          <div className="flex justify-center items-center h-32" style={{color:"var(--ink-3)"}}>불러오는 중…</div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-3" style={{color:"var(--ink-3)"}}>
            <span style={{fontSize:"40px"}}>📖</span>
            <p style={{fontSize:"13px"}}>아직 도감이 비어있어요</p>
          </div>
        ) : (
          <>
            <div style={{padding:"6px 0 8px",fontFamily:"'Space Mono',monospace",fontSize:"10px",color:"var(--ink-3)",letterSpacing:"2px",fontWeight:"700"}}>발견한 종 · {items.length}</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"8px"}}>
              {items.map(item=>(
                <CollectionCard key={item.id} item={item} onDelete={handleDelete}/>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
