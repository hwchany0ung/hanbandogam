var RARITY_LABEL_KR = { L:"전설", E:"특산", R:"희귀", U:"비범", C:"평범" };

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
  var mapRef    = React.useRef(null);
  var mapInst   = React.useRef(null);
  var markersRef = React.useRef([]);
  var [items, setItems] = React.useState(null);

  React.useEffect(function() {
    getCollection().then(setItems).catch(function(){ setItems([]); });
  }, []);

  React.useEffect(function() {
    if (!window.L || !mapRef.current || items === null) return;

    // 지도 최초 1회 생성
    if (!mapInst.current) {
      var map = L.map(mapRef.current, { zoomControl: true }).setView([36.5, 127.8], 7);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
        maxZoom: 18,
      }).addTo(map);
      mapInst.current = map;
    }

    // 기존 마커 제거 후 도감 종으로 재구성
    markersRef.current.forEach(function(m){ mapInst.current.removeLayer(m); });
    markersRef.current = [];

    items.forEach(function(item) {
      // item.lat/lng 우선, 없으면 SPECIES_LOCATIONS 폴백
      var lat, lng, desc;
      if (item.lat && item.lng) {
        lat = item.lat; lng = item.lng;
        desc = item.memo || item.district || (item.korean_name + " 발견지");
      } else if (SPECIES_LOCATIONS[item.korean_name]) {
        var loc = SPECIES_LOCATIONS[item.korean_name];
        lat = loc.lat; lng = loc.lng; desc = loc.desc;
      } else {
        return;
      }

      var rarity = getRarity(item.korean_name);
      var rc = RARITY_CONFIG[rarity];
      var radius = { L:11, E:9, R:8, U:7, C:6 }[rarity] || 7;
      var rarityKr = RARITY_LABEL_KR[rarity];

      var marker = L.circleMarker([lat, lng], {
        radius: radius,
        fillColor: rc.color,
        color: "#fff",
        weight: 2,
        opacity: 1,
        fillOpacity: 0.88,
      }).addTo(mapInst.current);

      marker.bindPopup(
        "<div style='font-family:sans-serif;min-width:130px'>" +
        "<b style='font-size:14px'>" + item.korean_name + "</b><br>" +
        "<span style='color:" + rc.color + ";font-size:11px;font-weight:700'>" + rarityKr + "급</span><br>" +
        "<span style='color:#888;font-size:11px'>" + desc + "</span>" +
        "</div>"
      );
      markersRef.current.push(marker);
    });

    return function() {};
  }, [items]);

  React.useEffect(function() {
    return function() {
      if (mapInst.current) { mapInst.current.remove(); mapInst.current = null; markersRef.current = []; }
    };
  }, []);

  var loaded = items !== null;
  var displayed = loaded ? items : [];

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
        <div style={{marginLeft:"auto",fontFamily:"'Space Mono',monospace",fontSize:"10px",color:"var(--gold)",fontWeight:"700"}}>{displayed.length}종</div>
      </div>

      {/* 지도 */}
      <div style={{flex:1,position:"relative"}}>
        <div ref={mapRef} style={{width:"100%",height:"100%",minHeight:"360px"}}/>
        {loaded && displayed.length === 0 && (
          <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:"rgba(244,237,220,0.88)",zIndex:1000,gap:"12px"}}>
            <span style={{fontSize:"44px"}}>🗺️</span>
            <p style={{fontSize:"13px",color:"var(--ink-3)"}}>아직 수집한 생물이 없어요</p>
            <p style={{fontSize:"11px",color:"var(--ink-4)"}}>촬영 탭에서 생물을 발견해보세요</p>
          </div>
        )}
      </div>

      {/* 범례 (한국어 등급) */}
      <div style={{padding:"10px 16px 20px",display:"flex",gap:"14px",flexWrap:"wrap",justifyContent:"center",background:"var(--paper)",flexShrink:0}}>
        {["L","E","R","U","C"].map(function(r) {
          var rc = RARITY_CONFIG[r];
          return (
            <div key={r} style={{display:"flex",alignItems:"center",gap:"5px"}}>
              <div style={{width:"10px",height:"10px",borderRadius:"50%",background:rc.color,border:"1.5px solid #fff",boxShadow:"0 0 0 1px "+rc.color}}/>
              <span style={{fontFamily:"'Space Mono',monospace",fontSize:"10px",color:rc.color,fontWeight:"700",letterSpacing:"1px"}}>{r}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
