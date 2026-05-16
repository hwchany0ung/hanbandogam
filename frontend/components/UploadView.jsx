function UploadView({ onUpload }) {
  var [dragging, setDragging] = React.useState(false);
  var inputRef = React.useRef(null);

  function handleFile(file) {
    if (!file) return;
    if (!file.type.startsWith("image/")) { alert("이미지 파일만 업로드 가능해요"); return; }
    if (file.size > 5 * 1024 * 1024) { alert("5MB 이하 이미지만 업로드 가능해요"); return; }
    onUpload(file);
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  }

  return (
    <div className="flex flex-col items-center justify-center h-full px-6 gap-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-stone-800" style={{ fontFamily: "'Black Han Sans', sans-serif" }}>
          한반도감
        </h1>
        <p className="text-sm text-stone-500 mt-1">사진으로 생물을 식별하고 도감을 채워보세요</p>
      </div>

      <div
        onClick={() => inputRef.current.click()}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={
          "w-full max-w-xs border-2 border-dashed rounded-2xl flex flex-col items-center justify-center gap-3 py-12 cursor-pointer transition-colors " +
          (dragging ? "border-green-400 bg-green-50" : "border-stone-300 bg-stone-50 hover:border-green-400 hover:bg-green-50")
        }
      >
        <span className="text-4xl">📷</span>
        <p className="text-sm text-stone-500 text-center px-4">사진을 드래그하거나<br/>클릭해서 올려주세요</p>
        <p className="text-xs text-stone-400">JPG · PNG · WEBP · 최대 5MB</p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => handleFile(e.target.files[0])}
      />
    </div>
  );
}
