function ErrorView(props) {
  return (
    <section className="flex min-h-[calc(100vh-88px)] flex-col justify-center px-6 py-12">
      <div className="han-card p-6 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-2xl text-red-600">
          !
        </div>
        <h2 className="serif-title mt-4 text-2xl font-black">분석에 실패했습니다</h2>
        <p className="mt-3 text-sm leading-6 text-[var(--ink-2)]">
          {props.message || "이미지를 다시 선택해 주세요."}
        </p>
        <button
          type="button"
          className="primary-btn mt-6 w-full px-4 py-4 text-sm"
          onClick={props.onRetry}
        >
          다시 촬영하기
        </button>
      </div>
    </section>
  );
}

window.ErrorView = ErrorView;
