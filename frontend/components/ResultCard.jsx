var RESULT_FALLBACK_IMAGE =
  "data:image/svg+xml;charset=UTF-8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 520">' +
      '<rect width="720" height="520" fill="#f4eddc"/>' +
      '<circle cx="366" cy="235" r="118" fill="#e3d7bc"/>' +
      '<path d="M332 346c-69-55-102-121-96-199 78 9 138 51 178 128-28 33-55 56-82 71Z" fill="#50895b"/>' +
      '<path d="M350 354c52-76 118-117 199-123-9 81-55 143-138 185-22-15-43-36-61-62Z" fill="#8aad6f"/>' +
      '<path d="M356 388c10-96 4-180-20-254" stroke="#2f5f3b" stroke-width="16" stroke-linecap="round" fill="none"/>' +
      '<text x="360" y="470" font-family="Arial, sans-serif" font-size="32" text-anchor="middle" fill="#6f634d">Hanbando Field Guide</text>' +
    "</svg>"
  );

function getResultValue(result, key, fallback) {
  if (!result || result[key] === undefined || result[key] === null || result[key] === "") {
    return fallback;
  }

  return result[key];
}

function getConfidencePercent(confidence) {
  var value = Number(confidence);

  if (Number.isNaN(value)) {
    return 0;
  }

  if (value > 1 && value <= 100) {
    return Math.round(value);
  }

  return Math.round(Math.max(0, Math.min(1, value)) * 100);
}

function getRarity(result) {
  var rarity = getResultValue(result, "rarity", "");

  if (rarity && RARITY_CONFIG[rarity]) {
    return rarity;
  }

  var confidence = getConfidencePercent(getResultValue(result, "confidence", 0));

  if (confidence >= 92) {
    return "R";
  }

  if (confidence >= 80) {
    return "U";
  }

  return "C";
}

function getNativeClass(nativeStatus) {
  var config = NATIVE_CONFIG[nativeStatus] || NATIVE_CONFIG["불명확"];
  return config.className;
}

function getMorphTags(text) {
  if (!text) {
    return ["식별 포인트 없음"];
  }

  var parts = String(text)
    .split(/[,\n·ㆍ]|(?:\s*\/\s*)|(?:\s*;\s*)/)
    .map(function (part) {
      return part.trim();
    })
    .filter(Boolean);

  if (parts.length <= 1) {
    parts = String(text)
      .split(/[.。]/)
      .map(function (part) {
        return part.trim();
      })
      .filter(Boolean);
  }

  return parts.slice(0, 5);
}

function ResultCard(props) {
  var result = props.result || {};
  var imageSrc = props.imageUrl || result.image_path || RESULT_FALLBACK_IMAGE;
  var koreanName = getResultValue(result, "korean_name", "이름 미상");
  var scientificName = getResultValue(result, "scientific_name", "Scientific name unknown");
  var nativeStatus = getResultValue(result, "native_status", "불명확");
  var confidencePercent = getConfidencePercent(getResultValue(result, "confidence", 0));
  var rarity = getRarity(result);
  var rarityConfig = RARITY_CONFIG[rarity] || RARITY_CONFIG.C;
  var morphTags = getMorphTags(result.morphological_clues);

  function handleImageError(event) {
    if (event.currentTarget.dataset.fallbackApplied === "true") {
      return;
    }

    event.currentTarget.dataset.fallbackApplied = "true";
    event.currentTarget.src = RESULT_FALLBACK_IMAGE;
  }

  return (
    <section className="px-4 pb-5 pt-5">
      <div className="mb-5 flex items-center gap-3">
        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--gold-bd)] bg-[var(--surface)] text-lg shadow-sm"
          onClick={props.onBack}
          aria-label="촬영 화면으로 돌아가기"
        >
          ←
        </button>
        <div>
          <p className="text-[13px] font-bold text-[var(--ink-2)]">AI 판별 결과</p>
          <p className="mono-label mt-1 text-[8px] text-[var(--ink-3)]">Claude Vision</p>
        </div>
        <span className="ai-chip ml-auto">Claude</span>
      </div>

      <article className={"overflow-hidden rounded-[20px] bg-[var(--surface)] shadow-xl ring-1 ring-[var(--gold-bd)]"}>
        <div className="relative h-[260px] overflow-hidden bg-[var(--surface-2)]">
          <img
            className="h-full w-full object-cover"
            src={imageSrc}
            alt={koreanName}
            onError={handleImageError}
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-transparent via-white/20 to-transparent mix-blend-overlay"></div>
          <span className={"rarity-pill " + rarityConfig.className + " absolute left-3 top-3 px-3 py-1 text-[10px]"}>
            ★ {rarityConfig.label}
          </span>
          <span className={"native-pill " + getNativeClass(nativeStatus) + " absolute right-3 top-3 px-3 py-1 text-[11px]"}>
            {nativeStatus}
          </span>
        </div>

        <div className="px-5 pb-4 pt-5">
          <div className="mb-4">
            <h2 className="serif-title text-[28px] font-black leading-tight tracking-[-0.03em]">
              {koreanName}
            </h2>
            <p className="mono-label mt-1 text-[10px] lowercase tracking-[0.08em] text-[var(--ink-3)]">
              {scientificName}
            </p>
          </div>

          <div className="mb-4 flex items-center gap-3 rounded-xl border border-black/5 bg-[var(--surface-2)] px-3 py-3">
            <span className="mono-label text-[9px] font-bold text-[var(--ink-3)]">신뢰도</span>
            <div className="confidence-track h-[6px] flex-1">
              <div
                className="confidence-fill bg-gradient-to-r from-[var(--R)] to-blue-300"
                style={{ width: confidencePercent + "%" }}
              ></div>
            </div>
            <span className="mono-label text-[14px] font-bold text-[var(--R)]">
              {confidencePercent}%
            </span>
          </div>

          <div className="mb-4 flex flex-wrap gap-2">
            <span className="rounded-full border border-black/5 bg-[var(--surface-2)] px-3 py-1 text-[11px] font-bold text-[var(--ink-2)]">
              {nativeStatus}
            </span>
            {result.conservation_status ? (
              <span className="rounded-full border border-black/5 bg-[var(--surface-2)] px-3 py-1 text-[11px] font-bold text-[var(--ink-2)]">
                {result.conservation_status}
              </span>
            ) : null}
          </div>

          <p className="section-title mono-label text-[9px] text-[var(--gold)]">생태 요약</p>
          <p className="mt-2 text-[13px] leading-7 text-[var(--ink-2)]">
            {getResultValue(result, "ecology_summary", "생태 요약이 없습니다.")}
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            {morphTags.map(function (tag) {
              return (
                <span
                  key={tag}
                  className="rounded-md border border-[var(--gold-bd)] bg-[var(--gold-dim)] px-3 py-1 text-[11px] font-bold text-[var(--gold)]"
                >
                  {tag}
                </span>
              );
            })}
          </div>

          <button
            type="button"
            className="mt-5 w-full rounded-[14px] bg-gradient-to-r from-blue-700 to-[var(--R)] px-4 py-4 font-['Black_Han_Sans'] text-[15px] tracking-[0.18em] text-white shadow-lg shadow-blue-700/25 disabled:opacity-60"
            onClick={props.onSave}
            disabled={props.isSaving || props.isSaved}
          >
            {props.isSaved ? "도감에 추가 완료" : props.isSaving ? "저장 중..." : "도감에 추가"}
          </button>
          {props.error ? (
            <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[12px] font-bold text-red-700">
              {props.error}
            </p>
          ) : null}
        </div>

        <footer className="flex items-center gap-2 border-t border-black/5 bg-[var(--surface-2)] px-5 py-3 text-[9px] font-bold text-[var(--ink-3)]">
          <span>AI 판별 결과는 참고용이며 현장 확인이 필요합니다.</span>
          <span className="ml-auto text-[var(--gold)]">REFERENCE</span>
        </footer>
      </article>
    </section>
  );
}

window.ResultCard = ResultCard;
