function LoadingView() {
  return (
    <section className="relative min-h-[calc(100vh-88px)]">
      <LoadingOverlay />
    </section>
  );
}

window.LoadingView = LoadingView;
