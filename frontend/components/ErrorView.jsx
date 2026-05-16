function ErrorView({ message, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 px-6 text-center">
      <span className="text-5xl">😥</span>
      <p className="text-stone-700 font-medium">식별에 실패했어요</p>
      <p className="text-sm text-stone-400">{message || "잠시 후 다시 시도해주세요"}</p>
      <button
        onClick={onRetry}
        className="mt-2 px-6 py-2 bg-green-700 text-white rounded-full text-sm hover:bg-green-800"
      >
        다시 시도
      </button>
    </div>
  );
}
