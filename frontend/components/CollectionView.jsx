function CollectionView({ onBack }) {
  var [items, setItems] = React.useState([]);
  var [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    getCollection()
      .then(setItems)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function handleDelete(id) {
    if (!confirm("도감에서 삭제할까요?")) return;
    try {
      await deleteCollectionItem(id);
      setItems(prev => prev.filter(i => i.id !== id));
    } catch (e) {
      alert("삭제 실패: " + e.message);
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-stone-400">불러오는 중…</div>
  );

  return (
    <div className="flex flex-col h-full">
      {/* 헤더 */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-stone-100">
        <button onClick={onBack} className="text-stone-500 hover:text-stone-800">
          ←
        </button>
        <h2 className="font-bold text-stone-800">내 도감</h2>
        <span className="ml-auto text-sm text-stone-400">{items.length} / 102</span>
      </div>

      {/* 격자 */}
      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 gap-3 text-stone-400">
          <span className="text-4xl">📖</span>
          <p className="text-sm">아직 도감이 비어있어요</p>
          <button onClick={onBack} className="text-sm text-green-700 underline">사진 찍으러 가기</button>
        </div>
      ) : (
        <div className="overflow-y-auto flex-1 p-4 grid grid-cols-2 gap-3">
          {items.map(item => (
            <CollectionCard key={item.id} item={item} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  );
}
