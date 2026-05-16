function ResultCard({ result, imageFile, onSave, onRetry, onCollection }) {
  var [saving, setSaving] = React.useState(false);
  var [saved, setSaved] = React.useState(false);
  var previewUrl = imageFile ? URL.createObjectURL(imageFile) : null;

  var native = NATIVE_CONFIG[result.native_status] || NATIVE_CONFIG["불명확"];
  var pct = Math.round(result.confidence * 100);

  async function handleSave() {
    if (saved) return;
    setSaving(true);
    try {
      await addToCollection(result, previewUrl || "");
      setSaved(true);
    } catch (e) {
      alert("저장 실패: " + e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* 이미지 */}
      {previewUrl && (
        <div className="w-full h-48 bg-stone-100 flex-shrink-0 overflow-hidden">
          <img src={previewUrl} alt="업로드 이미지" className="w-full h-full object-cover" />
        </div>
      )}

      <div className="p-4 flex flex-col gap-4">
        {/* 종명 + 배지 */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="text-xl font-bold text-stone-800">{result.korean_name}</h2>
            <p className="text-sm italic text-stone-400">{result.scientific_name}</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className={"text-xs font-medium px-2 py-0.5 rounded-full " + native.bg + " " + native.text}>
              {native.label}
            </span>
            <span className="text-xs text-stone-400">신뢰도 {pct}%</span>
          </div>
        </div>

        {/* 신뢰도 바 */}
        <div className="w-full bg-stone-100 rounded-full h-1.5">
          <div className="bg-green-500 h-1.5 rounded-full" style={{ width: pct + "%" }} />
        </div>

        {/* 생태 요약 */}
        <div className="bg-stone-50 rounded-xl p-3">
          <p className="text-xs text-stone-500 mb-1 font-medium">생태 요약</p>
          <p className="text-sm text-stone-700 leading-relaxed">{result.ecology_summary}</p>
        </div>

        {/* 식별 포인트 */}
        <div className="bg-amber-50 rounded-xl p-3">
          <p className="text-xs text-amber-700 mb-1 font-medium">식별 포인트</p>
          <p className="text-sm text-stone-700">{result.morphological_clues}</p>
        </div>

        {/* 보전 현황 */}
        <p className="text-xs text-stone-400 text-center">{result.conservation_status}</p>

        {/* 버튼 */}
        <div className="flex gap-2 mt-2">
          <button
            onClick={onRetry}
            className="flex-1 py-2.5 border border-stone-300 rounded-xl text-sm text-stone-600 hover:bg-stone-50"
          >
            다시 찍기
          </button>
          <button
            onClick={handleSave}
            disabled={saving || saved}
            className={"flex-1 py-2.5 rounded-xl text-sm text-white transition-colors " +
              (saved ? "bg-stone-400" : "bg-green-700 hover:bg-green-800")}
          >
            {saved ? "✓ 저장됨" : saving ? "저장 중…" : "도감에 추가"}
          </button>
        </div>

        {saved && (
          <button onClick={onCollection} className="text-sm text-green-700 underline text-center">
            내 도감 보기 →
          </button>
        )}
      </div>
    </div>
  );
}
