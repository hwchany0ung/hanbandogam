var FALLBACK_ILLUSTRATION =
  "data:image/svg+xml;charset=UTF-8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 240">' +
      '<rect width="320" height="240" fill="#f3f4ec"/>' +
      '<circle cx="168" cy="116" r="58" fill="#d9ead3"/>' +
      '<path d="M158 164c-30-28-46-58-45-91 33 2 60 19 82 53-13 18-25 31-37 38Z" fill="#4f8f62"/>' +
      '<path d="M162 165c24-33 52-50 84-52-2 34-20 59-54 76-10-6-20-14-30-24Z" fill="#86b36f"/>' +
      '<path d="M160 178c5-38 3-72-8-103" stroke="#2f5f3b" stroke-width="7" stroke-linecap="round" fill="none"/>' +
      '<text x="160" y="218" font-family="Arial, sans-serif" font-size="18" text-anchor="middle" fill="#5f6f52">Hanbando</text>' +
    "</svg>"
  );

var ILLUSTRATION_MAP = window.ILLUSTRATION_MAP || {};
window.ILLUSTRATION_MAP = ILLUSTRATION_MAP;

var FALLBACK_NATIVE_CONFIG = {
  "토종": {
    bg: "bg-emerald-100",
    text: "text-emerald-800",
    label: "토종",
  },
  "외래종": {
    bg: "bg-rose-100",
    text: "text-rose-800",
    label: "외래종",
  },
  "불명확": {
    bg: "bg-stone-100",
    text: "text-stone-700",
    label: "불명확",
  },
};

function getCollectionCardItem(props) {
  if (!props) {
    return {};
  }

  return props.item || props.collectionItem || props.result || props.species || props;
}

function getCardText(value, fallback) {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  return String(value);
}

function getNativeConfig(nativeStatus) {
  var globalConfig =
    typeof NATIVE_CONFIG !== "undefined" && NATIVE_CONFIG ? NATIVE_CONFIG : null;
  var fallbackConfig =
    FALLBACK_NATIVE_CONFIG[nativeStatus] || FALLBACK_NATIVE_CONFIG["불명확"];

  if (!globalConfig || !globalConfig[nativeStatus]) {
    return fallbackConfig;
  }

  return {
    bg: globalConfig[nativeStatus].bg || fallbackConfig.bg,
    text: globalConfig[nativeStatus].text || fallbackConfig.text,
    label: globalConfig[nativeStatus].label || fallbackConfig.label,
  };
}

function getIllustrationSrc(item, koreanName) {
  return (
    ILLUSTRATION_MAP[koreanName] ||
    item.illustration_path ||
    item.illustrationUrl ||
    item.image_path ||
    FALLBACK_ILLUSTRATION
  );
}

function formatCreatedAt(createdAt) {
  if (!createdAt) {
    return "기록 없음";
  }

  var date = new Date(createdAt);

  if (Number.isNaN(date.getTime())) {
    return String(createdAt);
  }

  return date.toLocaleString("ko-KR");
}

function CollectionCard(props) {
  var item = getCollectionCardItem(props);
  var isFlippedState = React.useState(false);
  var isFlipped = isFlippedState[0];
  var setIsFlipped = isFlippedState[1];

  var koreanName = getCardText(item.korean_name, "이름 미상");
  var scientificName = getCardText(item.scientific_name, "Scientific name unknown");
  var nativeStatus = getCardText(item.native_status, "불명확");
  var nativeConfig = getNativeConfig(nativeStatus);
  var nativeBadgeClassName =
    "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold " +
    nativeConfig.bg +
    " " +
    nativeConfig.text;
  var illustrationSrc = getIllustrationSrc(item, koreanName);

  function toggleFlip() {
    setIsFlipped(function (currentValue) {
      return !currentValue;
    });
  }

  function handleKeyDown(event) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      toggleFlip();
    }
  }

  function handleImageError(event) {
    if (event.currentTarget.dataset.fallbackApplied === "true") {
      return;
    }

    event.currentTarget.dataset.fallbackApplied = "true";
    event.currentTarget.src = FALLBACK_ILLUSTRATION;
  }

  return (
    <div
      className="relative h-full min-h-[360px] cursor-pointer outline-none"
      style={{ perspective: "1000px" }}
      role="button"
      tabIndex="0"
      aria-pressed={isFlipped}
      aria-label={koreanName + " 도감 카드 뒤집기"}
      onClick={toggleFlip}
      onKeyDown={handleKeyDown}
    >
      <div
        className={"card-flip-inner" + (isFlipped ? " is-flipped" : "")}
        style={{ minHeight: "360px" }}
      >
        <article className="card-face overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
          <div className="flex h-full flex-col">
            <div className="flex min-h-[220px] items-center justify-center bg-stone-50 p-4">
              <img
                className="max-h-48 w-full object-contain"
                src={illustrationSrc}
                alt={koreanName + " 일러스트"}
                loading="lazy"
                onError={handleImageError}
              />
            </div>

            <div className="flex flex-1 flex-col gap-3 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-xl font-bold text-stone-900">{koreanName}</h3>
                  <p className="mt-1 text-sm italic text-stone-500">
                    {scientificName}
                  </p>
                </div>
                <span className={nativeBadgeClassName}>{nativeConfig.label}</span>
              </div>
            </div>
          </div>
        </article>

        <article className="card-face card-face-back overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
          <div className="flex h-full flex-col gap-4 overflow-y-auto p-5 text-sm text-stone-700">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wide text-stone-400">
                Ecology
              </h4>
              <p className="mt-1 leading-6">
                {getCardText(item.ecology_summary, "생태 설명 기록 없음")}
              </p>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wide text-stone-400">
                Conservation
              </h4>
              <p className="mt-1 leading-6">
                {getCardText(item.conservation_status, "보전 상태 기록 없음")}
              </p>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wide text-stone-400">
                Clues
              </h4>
              <p className="mt-1 leading-6">
                {getCardText(item.morphological_clues, "식별 포인트 기록 없음")}
              </p>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wide text-stone-400">
                Memo
              </h4>
              <p className="mt-1 leading-6">{getCardText(item.memo, "메모 없음")}</p>
            </div>

            <div className="mt-auto border-t border-stone-100 pt-3 text-xs text-stone-400">
              {formatCreatedAt(item.created_at)}
            </div>
          </div>
        </article>
      </div>
    </div>
  );
}

window.CollectionCard = CollectionCard;
