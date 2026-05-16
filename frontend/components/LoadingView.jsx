function LoadingView() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 text-stone-600">
      <div className="w-12 h-12 border-4 border-green-200 border-t-green-600 rounded-full animate-spin" />
      <p className="text-sm">생물을 식별하는 중…</p>
    </div>
  );
}
