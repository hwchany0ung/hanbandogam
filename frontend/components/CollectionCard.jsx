var FALLBACK_ILLUSTRATION =
  "data:image/svg+xml;charset=UTF-8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 320">' +
      '<rect width="320" height="320" fill="#f0e8d4"/>' +
      '<circle cx="166" cy="142" r="64" fill="#d9ead3"/>' +
      '<path d="M150 206c-42-38-63-78-61-122 46 4 83 30 110 75-17 23-33 39-49 47Z" fill="#4f8f62"/>' +
      '<path d="M160 210c35-48 75-73 122-75-5 49-32 85-82 109-14-9-27-21-40-34Z" fill="#86b36f"/>' +
      '<path d="M160 228c7-56 4-105-12-151" stroke="#2f5f3b" stroke-width="10" stroke-linecap="round" fill="none"/>' +
    "</svg>"
  );

var ILLUSTRATION_MAP = window.ILLUSTRATION_MAP || {};
window.ILLUSTRATION_MAP = ILLUSTRATION_MAP;

var CARD_NATIVE_CONFIG = {
  "토종": { label: "토종", className: "native-native" },
  "외래종": { label: "외래종", className: "native-invasive" },
  "불명확": { label: "불명확", className: "native-unknown" },
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

function getCollectionNativeConfig(nativeStatus) {
  var globalConfig =
    typeof NATIVE_CONFIG !== "undefined" && NATIVE_CONFIG ? NATIVE_CONFIG : null;
  var fallbackConfig =
    CARD_NATIVE_CONFIG[nativeStatus] || CARD_NATIVE_CONFIG["불명확"];

  if (!globalConfig || !globalConfig[nativeStatus]) {
    return fallbackConfig;
  }

  return {
    label: globalConfig[nativeStatus].label || fallbackConfig.label,
    className: globalConfig[nativeStatus].className || fallbackConfig.className,
  };
}

function getCollectionIllustrationSrc(item, koreanName) {
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

  return date.toLocaleDateString("ko-KR");
}

function CollectionCard(props) {
  var item = getCollectionCardItem(props);
  var isPlaceholder = Boolean(item.isPlaceholder);
  var isFlippedState = React.useState(false);
  var isFlipped = isFlippedState[0];
  var setIsFlipped = isFlippedState[1];

  var koreanName = getCardText(item.korean_name, "미발견");
  var scientificName = getCardText(item.scientific_name, "Unknown");
  var nativeStatus = getCardText(item.native_status, "불명확");
  var nativeConfig = getCollectionNativeConfig(nativeStatus);
  var rarity = item.rarity && RARITY_CONFIG[item.rarity] ? item.rarity : isPlaceholder ? "C" : getRarity(item);
  var rarityConfig = RARITY_CONFIG[rarity] || RARITY_CONFIG.C;
  var illustrationSrc = getCollectionIllustrationSrc(item, koreanName);

  function toggleFlip() {
    if (isPlaceholder) {
      return;
    }

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

  if (isPlaceholder) {
    return (
      <div className="relative aspect-square overflow-hidden rounded-xl border border-black/5 bg-[var(--lift)]">
        <div className="absolute left-1.5 top-1.5 flex h-[18px] w-[18px] items-center justify-center rounded-md border border-black/10 bg-white/70 font-['Space_Mono'] text-[8px] font-bold text-[var(--C)]">
          C
        </div>
        <div className="flex h-full items-center justify-center font-['Black_Han_Sans'] text-[34px] text-[var(--ink-4)]">
          ?
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative aspect-square cursor-pointer outline-none"
      style={{ perspective: "900px" }}
      role="button"
      tabIndex="0"
      aria-pressed={isFlipped}
      aria-label={koreanName + " 도감 카드 뒤집기"}
      onClick={toggleFlip}
      onKeyDown={handleKeyDown}
    >
      <div className={"card-flip-inner" + (isFlipped ? " is-flipped" : "")}>
        <article className="card-face overflow-hidden rounded-xl bg-[var(--surface)] shadow-md ring-1 ring-[var(--gold-bd)]">
          <img
            className="h-full w-full object-cover"
            src={illustrationSrc}
            alt={koreanName}
            loading="lazy"
            onError={handleImageError}
          />
          <span className={"absolute left-1.5 top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-md px-1 font-['Space_Mono'] text-[8px] font-bold " + rarityConfig.className}>
            {rarityConfig.short}
          </span>
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-1.5 pb-1.5 pt-8 text-center text-[10px] font-bold text-white">
            {koreanName}
          </div>
        </article>

        <article className="card-face card-face-back overflow-hidden rounded-xl bg-[var(--surface)] p-2 shadow-md ring-1 ring-[var(--gold-bd)]">
          <div className="flex h-full flex-col gap-1.5 text-[10px] leading-4 text-[var(--ink-2)]">
            <div>
              <div className="serif-title line-clamp-1 text-[15px] font-black text-[var(--ink-1)]">
                {koreanName}
              </div>
              <div className="line-clamp-1 font-['Space_Mono'] text-[8px] italic text-[var(--ink-3)]">
                {scientificName}
              </div>
            </div>
            <div className="flex flex-wrap gap-1">
              <span className={"native-pill px-2 py-0.5 text-[9px] " + nativeConfig.className}>
                {nativeConfig.label}
              </span>
              <span className={"rarity-pill px-2 py-0.5 text-[8px] " + rarityConfig.className}>
                {rarityConfig.short}
              </span>
            </div>
            <p className="line-clamp-3">
              {getCardText(item.ecology_summary, "생태 설명 기록 없음")}
            </p>
            <p className="mt-auto border-t border-black/5 pt-1 font-['Space_Mono'] text-[8px] text-[var(--ink-3)]">
              {formatCreatedAt(item.created_at)}
            </p>
          </div>
        </article>
      </div>
    </div>
  );
}

window.CollectionCard = CollectionCard;
