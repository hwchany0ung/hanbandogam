var SPECIES_LOCATIONS = {
  "구상나무":     { lat: 33.362, lng: 126.527, desc: "한라산 백록담" },
  "미선나무":     { lat: 36.971, lng: 127.861, desc: "괴산군 자생지" },
  "금강초롱꽃":   { lat: 38.175, lng: 128.457, desc: "설악산 대청봉" },
  "동강할미꽃":   { lat: 37.234, lng: 128.644, desc: "정선 동강 백운산" },
  "노랑붓꽃":     { lat: 35.456, lng: 127.234, desc: "전북 남원" },
  "개느삼":       { lat: 37.123, lng: 128.456, desc: "충북 제천 석회암지대" },
  "고려엉겅퀴":   { lat: 37.456, lng: 128.934, desc: "강원도 정선" },
  "곰취":         { lat: 37.567, lng: 128.567, desc: "강원도 태백산" },
  "노랑무늬붓꽃": { lat: 37.689, lng: 128.234, desc: "오대산 월정사" },
  "금꿩의다리":   { lat: 37.456, lng: 128.789, desc: "강원도 계곡 습지" },
  "개족도리풀":   { lat: 37.234, lng: 128.123, desc: "강원도 산지" },
  "좀민들레":     { lat: 33.356, lng: 126.522, desc: "한라산 고지대" },
  "가시딸기":     { lat: 33.488, lng: 126.731, desc: "제주 서귀포" },
  "나도승마":     { lat: 35.345, lng: 127.678, desc: "지리산 세석평전" },
  "서양민들레":   { lat: 37.567, lng: 127.023, desc: "서울 도심" },
  "돼지풀":       { lat: 37.456, lng: 126.789, desc: "경기 하천변" },
  "단풍잎돼지풀": { lat: 35.678, lng: 128.456, desc: "낙동강 하천" },
  "미국쑥부쟁이": { lat: 37.234, lng: 126.789, desc: "경기 하천" },
  "양미역취":     { lat: 37.567, lng: 128.234, desc: "강원 하천변" },
  "가시박":       { lat: 37.234, lng: 127.678, desc: "남한강 하천림" },
  "수달":         { lat: 35.089, lng: 127.794, desc: "섬진강 상류" },
  "따오기":       { lat: 35.572, lng: 128.423, desc: "창녕 우포늪" },
};

function MapView({ onBack }) {
  var mapRef  = React.useRef(null);
  var mapInst = React.useRef(null);
  var [items, setItems] = React.useState([]);

  React.useEffect(function() {
    getCollection().then(setItems).catch(function(){});
  }, []);

  React.useEffect(function() {
    if (!window.L || !mapRef.current || mapInst.current) return;

    var map = L.map(mapRef.current, { zoomControl: true }).setView([36.5, 127.8], 7);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
      maxZoom: 18,
    }).addTo(map);
    mapInst.current = map;

    items.forEach(function(item) {
      var loc = SPECIES_LOCATIONS[item.korean_name];
      if (!loc) return;
      var rarity = getRarity(item.korean_name);
      var rc = RARITY_CONFIG[rarity];
      var radius = { L:11, E:9, R:8, U:7, C:6 }[rarity] || 7;

      var marker = L.circleMarker([loc.lat, loc.lng], {
        radius: radius,
        fillColor: rc.color,
        color: "#fff",
        weight: 2,
        opacity: 1,
        fillOpacity: 0.88,
      }).addTo(map);

      marker.bindPopup(
        "<div style='font-family:sans-serif;min-width:120px'>" +
        "<b style='font-size:14px'>" + item.korean_name + "</b><br>" +
        "<span style='color:" + rc.color + ";font-size:11px;font-weight:700'>" + rc.label + "</span><br>" +
        "<span style='color:#888;font-size:11px'>" + loc.desc + "</span>" +
        "</div>"
      );
    });

    return function() {
      if (mapInst.current) { mapInst.current.remove(); mapInst.current = null; }
    };
  }, [items]);

  return (
    <div className="flex flex-col flex-1 overflow-hidden" style={{background:"var(--paper)"}}>
      {/* 헤더 */}
      <div style={{display:"flex",alignItems:"center",gap:"12px",padding:"44px 20px 14px",flexShrink:0}}>
        <button
          onClick={onBack}
          style={{width:"36px",height:"36px",borderRadius:"50%",background:"var(--surface)",border:"1px solid var(--gold-bd)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"16px",cursor:"pointer",flexShrink:0}}
        ><Icon name="ArrowLeft" size={17} /></button>
        <div>
          <div style={{fontFamily:"'Black Han Sans',sans-serif",fontSize:"22px",letterSpacing:"2px",color:"var(--ink-1)"}}>발견 지도</div>
          <div style={{fontSize:"11px",color:"var(--ink-2)",marginTop:"2px"}}>수집한 생물 발견 위치</div>
        </div>
        <div style={{marginLeft:"auto",fontFamily:"'Space Mono',monospace",fontSize:"10px",color:"var(--gold)",fontWeight:"700"}}>{items.length}종</div>
      </div>

      {/* 지도 */}
      <div style={{flex:1,position:"relative"}}>
        <div ref={mapRef} style={{width:"100%",height:"100%",minHeight:"360px"}}/>
        {items.length === 0 && (
          <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:"rgba(244,237,220,0.88)",zIndex:1000,gap:"12px"}}>
            <span style={{fontSize:"44px"}}>🗺️</span>
            <p style={{fontSize:"13px",color:"var(--ink-3)"}}>아직 수집한 생물이 없어요</p>
            <p style={{fontSize:"11px",color:"var(--ink-4)"}}>촬영 탭에서 생물을 발견해보세요</p>
          </div>
        )}
      </div>

      {/* 범례 */}
      <div style={{padding:"10px 16px 20px",display:"flex",gap:"12px",flexWrap:"wrap",background:"var(--paper)",flexShrink:0}}>
        {["L","E","R","U","C"].map(function(r) {
          var rc = RARITY_CONFIG[r];
          return (
            <div key={r} style={{display:"flex",alignItems:"center",gap:"5px"}}>
              <div style={{width:"10px",height:"10px",borderRadius:"50%",background:rc.color,border:"1.5px solid #fff",boxShadow:"0 0 0 1px "+rc.color}}/>
              <span style={{fontFamily:"'Space Mono',monospace",fontSize:"8px",color:rc.color,fontWeight:"700"}}>{rc.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
