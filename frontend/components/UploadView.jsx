function UploadView(props) {
  var fileInputRef = React.useRef(null);
  var isLoading = Boolean(props.isLoading);
  var collectionCount = props.collectionCount || 0;
  var accuracy = props.accuracy || 82;

  function openFilePicker() {
    if (fileInputRef.current && !isLoading) {
      fileInputRef.current.click();
    }
  }

  function handleFileChange(event) {
    var file = event.target.files && event.target.files[0];

    if (file && props.onSelectFile) {
      props.onSelectFile(file);
    }

    event.target.value = "";
  }

  return (
    <section className="relative flex min-h-[calc(100vh-88px)] flex-col items-center px-5 pb-8 pt-12 text-center">
      <header>
        <h1 className="brand-logo text-[34px] leading-none">한반도감</h1>
        <p className="mono-label mt-2 text-[9px] text-[var(--gold)]">
          Korean Species Field Guide
        </p>
      </header>

      <button
        type="button"
        className="mt-10 focus:outline-none focus:ring-2 focus:ring-[var(--gold)] focus:ring-offset-4 focus:ring-offset-[var(--paper)]"
        onClick={openFilePicker}
        aria-label="생물 사진 선택"
      >
        <div className="aperture">
          <div className="aperture-ring"></div>
          <div className="aperture-ring"></div>
          <div className="aperture-ring"></div>
          <div className="aperture-core">
            <div className="scan-line"></div>
            <div className="text-[34px]" aria-hidden="true">⌖</div>
            <div className="mono-label text-[8px] text-[var(--ink-3)]">Tap To Scan</div>
          </div>
        </div>
      </button>

      <div className="mt-5">
        <h2 className="serif-title text-[22px] font-black tracking-[-0.02em]">
          생물을 발견하세요
        </h2>
        <p className="mt-2 text-[13px] font-medium text-[var(--ink-2)]">
          사진 한 장으로 토종 생물 즉시 판별
        </p>
      </div>

      <div className="mt-8 flex w-full flex-col gap-3">
        <button
          type="button"
          className="primary-btn w-full px-4 py-4 text-[15px]"
          disabled={isLoading}
          onClick={openFilePicker}
        >
          카메라로 촬영
        </button>
        <button
          type="button"
          className="secondary-btn w-full px-4 py-4 text-[13px]"
          disabled={isLoading}
          onClick={openFilePicker}
        >
          갤러리에서 선택
        </button>
      </div>

      <input
        ref={fileInputRef}
        className="hidden"
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
      />

      <div className="han-card mt-6 grid w-full grid-cols-[1fr_auto_1fr_auto_1fr] items-center px-3 py-5">
        <StatNumber value="102" label="등록 종" />
        <div className="h-9 w-px bg-[var(--gold-bd)]"></div>
        <StatNumber value={collectionCount} label="내 발견" />
        <div className="h-9 w-px bg-[var(--gold-bd)]"></div>
        <StatNumber value={accuracy + "%"} label="AI 정확도" />
      </div>

      {props.error ? (
        <div className="mt-4 w-full rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-left text-sm text-red-700">
          {props.error}
        </div>
      ) : null}

      {isLoading ? <LoadingOverlay /> : null}
    </section>
  );
}

function StatNumber(props) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="mono-label text-[24px] font-bold leading-none tracking-[-0.02em] text-[var(--gold)]">
        {props.value}
      </div>
      <div className="text-[10px] font-bold tracking-[0.08em] text-[var(--ink-3)]">
        {props.label}
      </div>
    </div>
  );
}

function LoadingOverlay() {
  return (
    <div className="analysis-layer">
      <div className="spinner"></div>
      <div className="serif-title text-[17px] font-black">Claude Vision 분석 중...</div>
      <div className="mono-label text-[9px] text-[var(--ink-3)]">
        Identifying · Claude Sonnet
      </div>
      <div className="ai-chip">AI Powered</div>
    </div>
  );
}

window.UploadView = UploadView;
