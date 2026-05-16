function App() {
  var [view, setView]     = React.useState("upload");   // upload | loading | result | collection | error
  var [result, setResult] = React.useState(null);
  var [imageFile, setImageFile] = React.useState(null);
  var [errMsg, setErrMsg] = React.useState("");

  async function handleUpload(file) {
    setImageFile(file);
    setView("loading");
    try {
      var res = await identifySpecies(file);
      setResult(res);
      setView("result");
    } catch (e) {
      setErrMsg(e.message);
      setView("error");
    }
  }

  function handleRetry() {
    setResult(null);
    setImageFile(null);
    setView("upload");
  }

  return (
    <div className="max-w-sm mx-auto h-screen flex flex-col bg-white shadow-lg relative overflow-hidden">

      {/* 상단 탭바 (업로드/도감 뷰에서만) */}
      {(view === "upload" || view === "collection") && (
        <div className="flex border-b border-stone-100 flex-shrink-0">
          <button
            onClick={() => setView("upload")}
            className={"flex-1 py-3 text-sm font-medium transition-colors " +
              (view === "upload" ? "text-green-700 border-b-2 border-green-700" : "text-stone-400")}
          >
            🔍 식별
          </button>
          <button
            onClick={() => setView("collection")}
            className={"flex-1 py-3 text-sm font-medium transition-colors " +
              (view === "collection" ? "text-green-700 border-b-2 border-green-700" : "text-stone-400")}
          >
            📖 도감
          </button>
        </div>
      )}

      {/* 뷰 */}
      <div className="flex-1 overflow-hidden">
        {view === "upload"     && <UploadView onUpload={handleUpload} />}
        {view === "loading"    && <LoadingView />}
        {view === "result"     && <ResultCard result={result} imageFile={imageFile} onRetry={handleRetry} onCollection={() => setView("collection")} />}
        {view === "collection" && <CollectionView onBack={() => setView("upload")} />}
        {view === "error"      && <ErrorView message={errMsg} onRetry={handleRetry} />}
      </div>

    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(React.createElement(App));
