function App() {
  var viewState = React.useState("upload");
  var view = viewState[0];
  var setView = viewState[1];
  var loadingState = React.useState(false);
  var isLoading = loadingState[0];
  var setIsLoading = loadingState[1];
  var savingState = React.useState(false);
  var isSaving = savingState[0];
  var setIsSaving = savingState[1];
  var savedState = React.useState(false);
  var isSaved = savedState[0];
  var setIsSaved = savedState[1];
  var resultState = React.useState(null);
  var result = resultState[0];
  var setResult = resultState[1];
  var imageUrlState = React.useState("");
  var imageUrl = imageUrlState[0];
  var setImageUrl = imageUrlState[1];
  var collectionState = React.useState([]);
  var collection = collectionState[0];
  var setCollection = collectionState[1];
  var errorState = React.useState("");
  var error = errorState[0];
  var setError = errorState[1];
  var toastState = React.useState("");
  var toast = toastState[0];
  var setToast = toastState[1];

  React.useEffect(function () {
    getOrCreateUserId();
    loadCollection(false);
  }, []);

  React.useEffect(
    function () {
      if (!toast) {
        return;
      }

      var timerId = window.setTimeout(function () {
        setToast("");
      }, 2200);

      return function () {
        window.clearTimeout(timerId);
      };
    },
    [toast]
  );

  async function loadCollection(showErrors) {
    try {
      var response = await getCollection();
      var items = Array.isArray(response) ? response : response && response.data ? response.data : [];
      setCollection(items);
      setError("");
    } catch (err) {
      if (showErrors) {
        setError(getFriendlyError(err, "도감 목록을 불러오지 못했습니다."));
      }
    }
  }

  async function handleSelectFile(file) {
    if (!file) {
      return;
    }

    if (!file.type || file.type.indexOf("image/") !== 0) {
      setError("이미지 파일만 업로드할 수 있습니다.");
      return;
    }

    setIsLoading(true);
    setSaved(false);
    setError("");

    var nextImageUrl = URL.createObjectURL(file);
    setImageUrl(nextImageUrl);

    try {
      var identified = await identifySpecies(file, "");
      setResult(identified);
      setView("result");
    } catch (err) {
      setError(getFriendlyError(err, "이미지 분석에 실패했습니다."));
      setView("error");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSaveResult() {
    if (!result || isSaving || isSaved) {
      return;
    }

    setIsSaving(true);
    setError("");

    try {
      var savedItem = await addToCollection(result, imageUrl);
      setCollection(function (currentItems) {
        return [savedItem].concat(currentItems);
      });
      setSaved(true);
      setToast("도감에 추가 완료");
    } catch (err) {
      setError(getFriendlyError(err, "도감 저장에 실패했습니다."));
    } finally {
      setIsSaving(false);
    }
  }

  function handleGoUpload() {
    setView("upload");
    setError("");
  }

  function handleGoCollection() {
    setView("collection");
    loadCollection(true);
  }

  function renderContent() {
    if (view === "loading") {
      return <LoadingView />;
    }

    if (view === "result" && result) {
      return (
        <ResultCard
          result={result}
          imageUrl={imageUrl}
          isSaving={isSaving}
          isSaved={isSaved}
          onBack={handleGoUpload}
          onSave={handleSaveResult}
          error={error}
        />
      );
    }

    if (view === "collection") {
      return (
        <CollectionView
          items={collection}
          error={error}
          isLoading={isLoading}
          onRefresh={function () {
            loadCollection(true);
          }}
        />
      );
    }

    if (view === "profile") {
      return <ProfileView collectionCount={collection.length} />;
    }

    if (view === "error") {
      return <ErrorView message={error} onRetry={handleGoUpload} />;
    }

    return (
      <UploadView
        isLoading={isLoading}
        error={view === "upload" ? error : ""}
        collectionCount={collection.length}
        onSelectFile={handleSelectFile}
      />
    );
  }

  return (
    <main className="app-shell">
      <div className="paper-tex"></div>
      <div className="app-content">{renderContent()}</div>
      <BottomNavigation currentView={view} onUpload={handleGoUpload} onCollection={handleGoCollection} onProfile={function () { setView("profile"); }} />
      {toast ? <div className="toast">{toast}</div> : null}
    </main>
  );
}

function getFriendlyError(error, fallback) {
  var message = error && error.message ? error.message : fallback;

  if (message === "Failed to fetch") {
    return "백엔드 서버 연결을 확인해 주세요.";
  }

  return message || fallback;
}

function BottomNavigation(props) {
  return (
    <nav className="bottom-nav" aria-label="하단 내비게이션">
      <NavButton
        icon="⌖"
        label="촬영"
        active={props.currentView === "upload" || props.currentView === "error"}
        onClick={props.onUpload}
      />
      <NavButton
        icon="▦"
        label="도감"
        active={props.currentView === "collection" || props.currentView === "result"}
        onClick={props.onCollection}
      />
      <NavButton
        icon="•"
        label="내 정보"
        active={props.currentView === "profile"}
        onClick={props.onProfile}
      />
    </nav>
  );
}

function NavButton(props) {
  return (
    <button
      type="button"
      className={props.active ? "active" : ""}
      onClick={props.onClick}
      aria-current={props.active ? "page" : undefined}
    >
      <span className="nav-icon">{props.icon}</span>
      <span className="nav-label">{props.label}</span>
    </button>
  );
}

function ProfileView(props) {
  return (
    <section className="flex min-h-[calc(100vh-88px)] flex-col px-5 pt-12">
      <header>
        <h1 className="brand-logo text-[30px] leading-none">내 정보</h1>
        <p className="mt-2 text-[13px] font-medium text-[var(--ink-2)]">
          한반도감 탐사 기록
        </p>
      </header>

      <div className="han-card mt-8 p-5">
        <div className="mono-label text-[10px] text-[var(--gold)]">Explorer ID</div>
        <div className="mt-2 break-all font-['Space_Mono'] text-[12px] text-[var(--ink-2)]">
          {getOrCreateUserId()}
        </div>
      </div>

      <div className="han-card mt-4 grid grid-cols-2 gap-4 p-5">
        <div>
          <div className="mono-label text-[28px] font-bold text-[var(--gold)]">
            {props.collectionCount}
          </div>
          <div className="text-[11px] font-bold text-[var(--ink-3)]">수집한 종</div>
        </div>
        <div>
          <div className="mono-label text-[28px] font-bold text-[var(--gold)]">102</div>
          <div className="text-[11px] font-bold text-[var(--ink-3)]">목표 종</div>
        </div>
      </div>
    </section>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
