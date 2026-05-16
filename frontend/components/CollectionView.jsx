function CollectionView({ isActive, onBack }) {
  var [items,   setItems]   = React.useState([]);
  var [loading, setLoading] = React.useState(true);

  // 최초 mount + isActive 가 true 로 바뀔 때마다 재조회 (캐시 무효 시 새 fetch, 유효 시 캐시 hit)
  React.useEffect(()=>{
    if (isActive === false) return;  // mount 직후 1회는 isActive=undefined or true 라 통과
    getCollection().then(setItems).catch(console.error).finally(()=>setLoading(false));
  },[isActive]);

  async function handleDelete(id) {
    if (!confirm("도감에서 삭제할까요?")) return;
    try { await deleteCollectionItem(id); setItems(p=>p.filter(i=>i.id!==id)); }
    catch(e) { alert("삭제 실패: "+e.message); }
  }

  var [sortBy,    setSortBy]    = React.useState("name");     // "name" | "rarity"
  var [sortOrder, setSortOrder] = React.useState("asc");      // "asc" | "desc"

  // 등급 우선순위 (L 최고 → C 최저)
  var RARITY_RANK = { L:5, E:4, R:3, U:2, C:1 };

  var sortedItems = React.useMemo(function() {
    var arr = items.slice();
    arr.sort(function(a, b) {
      var cmp;
      if (sortBy === "name") {
        cmp = a.korean_name.localeCompare(b.korean_name, "ko");
      } else {
        // rarity: 높은 등급 우선이 기본
        var ra = RARITY_RANK[getRarity(a.korean_name)] || 0;
        var rb = RARITY_RANK[getRarity(b.korean_name)] || 0;
        cmp = rb - ra;
        // 같은 등급이면 이름순 보조 정렬
        if (cmp === 0) cmp = a.korean_name.localeCompare(b.korean_name, "ko");
      }
      return sortOrder === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [items, sortBy, sortOrder]);

  function calcTopPct(count) {
    if (count === 0) return null;
    return Math.max(0.1, +(45 * Math.exp(-count * 0.08)).toFixed(1));
  }
  var topPct = calcTopPct(items.length);
  var moreNeeded = topPct
    ? Math.max(1, Math.ceil(-Math.log(topPct * 0.6 / 45) / 0.08) - items.length)
    : null;

  // 희귀도별 카운트
  var rarCount = {L:0,E:0,R:0,U:0,C:0};
  var rarTotal  = {L:5,E:6,R:35,U:28,C:28};
  items.forEach(item=>{ var r=getRarity(item.korean_name); rarCount[r]=(rarCount[r]||0)+1; });

  return (
    <div className="flex flex-col flex-1 overflow-hidden" style={{background:"var(--paper)"}}>
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {/* 헤더 */}
        <div className="pt-3 pb-3">
          <div style={{fontFamily:"'Black Han Sans',sans-serif",fontSize:"28px",letterSpacing:"3px",color:"var(--ink-1)"}}>내 도감</div>
          <div style={{fontSize:"12px",color:"var(--ink-2)",marginTop:"4px"}}>발견한 한국 토종 생물 수집</div>
        </div>

        {/* 수집 현황 카드 */}
        <div className="mb-3 px-5 py-4 rounded-xl" style={{background:"var(--surface)",border:"1px solid var(--gold-bd)",boxShadow:"0 4px 14px rgba(45,30,10,0.06)"}}>
          <div style={{display:"flex",alignItems:"center",gap:"8px",flexWrap:"wrap"}}>
            <div style={{fontFamily:"'Black Han Sans',sans-serif",fontSize:"30px",letterSpacing:"1px",color:"var(--ink-1)",lineHeight:1}}>
              {items.length}<span style={{fontSize:"16px",color:"var(--ink-3)",fontFamily:"'Noto Sans KR',sans-serif",fontWeight:"500",letterSpacing:"0"}}>종 수집!</span>
            </div>
            {topPct && (
              <div style={{display:"inline-flex",alignItems:"center",padding:"4px 12px",borderRadius:"20px",background:"linear-gradient(135deg,rgba(184,144,47,0.12),rgba(184,144,47,0.18))",border:"1px solid var(--gold-bd)"}}>
                <span style={{fontFamily:"'Space Mono',monospace",fontSize:"11px",color:"var(--gold)",fontWeight:"700"}}>전국민중 상위 {topPct}%</span>
              </div>
            )}
          </div>
          {topPct && (
            <div style={{fontSize:"10px",color:"var(--ink-3)",marginTop:"7px",lineHeight:"1.5"}}>
              {moreNeeded}종 더 수집하면 상위 {+(topPct*0.6).toFixed(1)}%까지 올라갈 수 있어요
            </div>
          )}
          {!topPct && (
            <div style={{fontSize:"10px",color:"var(--ink-3)",marginTop:"7px"}}>첫 번째 생물을 촬영해서 수집을 시작해보세요</div>
          )}
        </div>

        {/* 희귀도 진행 */}
        <div className="mb-3 flex flex-col gap-1.5">
          {["L","E","R","U","C"].map(r=>{
            var rc=RARITY_CONFIG[r], cnt=rarCount[r]||0, tot=rarTotal[r];
            return (
              <div key={r} className="flex items-center gap-2">
                <div style={{fontFamily:"'Space Mono',monospace",fontSize:"10px",width:"12px",textAlign:"center",fontWeight:"700",color:rc.color}}>{r}</div>
                <div style={{flex:1,height:"5px",background:"rgba(45,30,10,0.06)",borderRadius:"3px",overflow:"hidden"}}>
                  <div style={{height:"100%",borderRadius:"3px",background:rc.color,width:(cnt/tot*100)+"%"}}/>
                </div>
                <div style={{fontFamily:"'Space Mono',monospace",fontSize:"9px",color:rc.color,width:"28px",textAlign:"right",fontWeight:"600"}}>{cnt}종</div>
              </div>
            );
          })}
        </div>

        {/* 본문 */}
        {loading ? (
          <div className="flex justify-center items-center h-32" style={{color:"var(--ink-3)"}}>불러오는 중…</div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-3" style={{color:"var(--ink-3)"}}>
            <Icon name="BookOpen" size={40} strokeWidth={1.7} />
            <p style={{fontSize:"13px"}}>아직 도감이 비어있어요</p>
          </div>
        ) : (
          <>
            {/* 정렬 + 발견한 종 라벨 */}
            <div style={{padding:"6px 0 8px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:"8px"}}>
              <div style={{fontFamily:"'Space Mono',monospace",fontSize:"10px",color:"var(--ink-3)",letterSpacing:"2px",fontWeight:"700",flexShrink:0}}>발견한 종 · {items.length}</div>
              <div style={{display:"flex",alignItems:"center",gap:"6px"}}>
                {/* 정렬 기준 토글 */}
                <div style={{display:"flex",gap:"2px",background:"rgba(45,30,10,0.05)",borderRadius:"7px",padding:"2px"}}>
                  <button
                    onClick={() => setSortBy("name")}
                    style={{padding:"3px 9px",background:sortBy==="name"?"var(--surface)":"transparent",borderRadius:"5px",fontSize:"10px",border:"none",cursor:"pointer",color:sortBy==="name"?"var(--ink-1)":"var(--ink-3)",fontWeight:sortBy==="name"?"700":"500",boxShadow:sortBy==="name"?"0 1px 3px rgba(45,30,10,0.1)":"none"}}
                  >이름순</button>
                  <button
                    onClick={() => setSortBy("rarity")}
                    style={{padding:"3px 9px",background:sortBy==="rarity"?"var(--surface)":"transparent",borderRadius:"5px",fontSize:"10px",border:"none",cursor:"pointer",color:sortBy==="rarity"?"var(--ink-1)":"var(--ink-3)",fontWeight:sortBy==="rarity"?"700":"500",boxShadow:sortBy==="rarity"?"0 1px 3px rgba(45,30,10,0.1)":"none"}}
                  >등급순</button>
                </div>
                {/* 오름/내림 토글 */}
                <button
                  onClick={() => setSortOrder(o => o==="asc" ? "desc" : "asc")}
                  title={sortOrder==="asc" ? "오름차순" : "내림차순"}
                  style={{width:"24px",height:"24px",borderRadius:"6px",background:"var(--surface)",border:"1px solid var(--gold-bd)",color:"var(--gold)",fontSize:"12px",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:"700"}}
                ><Icon name={sortOrder==="asc" ? "ArrowUp" : "ArrowDown"} size={13} strokeWidth={2.4} /></button>
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"8px"}}>
              {sortedItems.map(item=>(
                <CollectionCard key={item.id} item={item} onDelete={handleDelete}/>
              ))}
              {Array.from({length:Math.max(0,102-items.length)},(_,i)=>(
                <div key={"lock-"+i} style={{aspectRatio:"1",borderRadius:"12px",background:"rgba(31,26,18,0.04)",border:"1.5px dashed rgba(31,26,18,0.10)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:"3px"}}>
                  <Icon name="Lock" size={16} strokeWidth={1.8} style={{opacity:0.25}} />
                  <span style={{fontFamily:"'Space Mono',monospace",fontSize:"7px",color:"var(--ink-3)",letterSpacing:"1px",opacity:0.4}}>???</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
