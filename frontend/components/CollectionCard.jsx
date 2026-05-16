// 수묵화 일러스트 맵 (korean_name → 이미지 경로)
var ILLUSTRATION_MAP = {
  "구상나무":    "/assets/illustrations/구상나무.svg",
  "황소개구리":  "/assets/illustrations/황소개구리.svg",
  "왜가리":      "/assets/illustrations/왜가리.svg",
  "소나무":      "/assets/illustrations/소나무.svg",
  "참나무":      "/assets/illustrations/참나무.svg",
  "은행나무":    "/assets/illustrations/은행나무.svg",
  "진달래":      "/assets/illustrations/진달래.svg",
  "개나리":      "/assets/illustrations/개나리.svg",
  "철쭉":        "/assets/illustrations/철쭉.svg",
  "무궁화":      "/assets/illustrations/무궁화.svg",
  "반달가슴곰":  "/assets/illustrations/반달가슴곰.svg",
  "수달":        "/assets/illustrations/수달.svg",
  "삵":          "/assets/illustrations/삵.svg",
  "두루미":      "/assets/illustrations/두루미.svg",
  "황새":        "/assets/illustrations/황새.svg",
  "따오기":      "/assets/illustrations/따오기.svg",
  "수리부엉이":  "/assets/illustrations/수리부엉이.svg",
  "참수리":      "/assets/illustrations/참수리.svg",
  "꽃사슴":      "/assets/illustrations/꽃사슴.svg",
  "고라니":      "/assets/illustrations/고라니.svg",
  "너구리":      "/assets/illustrations/너구리.svg",
  "맹꽁이":      "/assets/illustrations/맹꽁이.svg",
  "금개구리":    "/assets/illustrations/금개구리.svg",
  "꼬치동자개":  "/assets/illustrations/꼬치동자개.svg",
  "미호종개":    "/assets/illustrations/미호종개.svg",
  "분홍바늘꽃":  "/assets/illustrations/분홍바늘꽃.svg",
  "한라솜다리":  "/assets/illustrations/한라솜다리.svg",
};

var FALLBACK_IMG = "/assets/illustrations/fallback.svg";

function CollectionCard({ item, onDelete }) {
  var [isFlipped, setIsFlipped] = React.useState(false);
  var [imgError, setImgError] = React.useState(false);

  var native = NATIVE_CONFIG[item.native_status] || NATIVE_CONFIG["불명확"];
  var illustSrc = ILLUSTRATION_MAP[item.korean_name] || item.image_path || FALLBACK_IMG;
  var pct = Math.round(item.confidence * 100);

  function handleDelete(e) {
    e.stopPropagation();
    if (onDelete) onDelete(item.id);
  }

  return (
    <div
      className="card-flip-container w-full cursor-pointer"
      style={{ height: "220px" }}
      onClick={() => setIsFlipped(!isFlipped)}
    >
      <div className={"card-flip-inner " + (isFlipped ? "is-flipped" : "")}>

        {/* ── 앞면: 수묵화 이미지 ── */}
        <div className="card-face rounded-2xl overflow-hidden bg-stone-50 border border-stone-200 shadow-sm flex flex-col">
          <div className="flex-1 flex items-center justify-center p-2 bg-amber-50">
            <img
              src={imgError ? FALLBACK_IMG : illustSrc}
              alt={item.korean_name}
              className="h-full max-h-36 object-contain"
              onError={() => setImgError(true)}
            />
          </div>
          <div className="px-3 py-2 flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-stone-800 leading-tight">{item.korean_name}</p>
              <p className="text-xs text-stone-400 italic">{item.scientific_name}</p>
            </div>
            <span className={"text-xs font-medium px-2 py-0.5 rounded-full " + native.bg + " " + native.text}>
              {native.label}
            </span>
          </div>
        </div>

        {/* ── 뒷면: 종 정보 ── */}
        <div className="card-face card-face-back rounded-2xl bg-stone-800 text-stone-100 shadow-sm flex flex-col p-3 gap-1.5">
          <div className="flex items-center justify-between">
            <span className="font-bold text-sm">{item.korean_name}</span>
            <div className="flex items-center gap-1.5">
              <span className={"text-xs px-1.5 py-0.5 rounded-full " + native.bg + " " + native.text}>{native.label}</span>
              <button
                onClick={handleDelete}
                className="text-stone-400 hover:text-red-400 text-xs px-1"
                title="삭제"
              >✕</button>
            </div>
          </div>

          <div className="flex items-center gap-1 text-xs text-stone-300">
            <span className="italic">{item.scientific_name}</span>
            <span className="ml-auto bg-stone-700 rounded px-1.5">{pct}%</span>
          </div>

          <div className="h-px bg-stone-600" />

          <p className="text-xs text-stone-300 leading-relaxed line-clamp-3">{item.ecology_summary}</p>

          <div className="mt-auto text-xs text-stone-400">
            {item.conservation_status}
          </div>
        </div>

      </div>
    </div>
  );
}
