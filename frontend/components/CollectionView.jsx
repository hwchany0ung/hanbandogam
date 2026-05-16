function CollectionView(props) {
  var items = Array.isArray(props.items) ? props.items : [];
  var filterState = React.useState("ALL");
  var filter = filterState[0];
  var setFilter = filterState[1];
  var total = window.COLLECTION_TOTAL || 102;
  var collectedCount = items.length;
  var collectedRate = Math.min(100, Math.round((collectedCount / total) * 1000) / 10);
  var rarityKeys = ["L", "E", "R", "U", "C"];
  var rarityGoals = { L: 5, E: 6, R: 35, U: 28, C: 28 };
  var rarityCounts = getRarityCounts(items);
  var filteredItems =
    filter === "ALL"
      ? items
      : items.filter(function (item) {
          return getRarity(item) === filter;
        });
  var placeholders = createPlaceholderItems(Math.max(8, 16 - filteredItems.length));

  return (
    <section className="pb-5">
      <header className="px-5 pb-3 pt-12">
        <h1 className="brand-logo text-[30px] leading-none">내 도감</h1>
        <p className="mt-2 text-[13px] font-medium text-[var(--ink-2)]">
          발견한 한국 토종 생물 수집
        </p>
      </header>

      <div className="han-card mx-4 mt-2 flex items-center justify-between px-5 py-4">
        <div>
          <div className="mono-label text-[36px] font-bold leading-none tracking-[-0.03em] text-[var(--gold)]">
            {collectedCount}
            <span className="text-[18px] text-[var(--ink-3)]">/{total}</span>
          </div>
          <div className="mt-1 text-[10px] font-bold tracking-[0.12em] text-[var(--ink-3)]">
            SPECIES COLLECTED
          </div>
        </div>
        <div className="min-w-[132px] text-right">
          <div className="text-[11px] font-bold text-[var(--ink-2)]">
            수집률 {collectedRate}%
          </div>
          <div className="total-track ml-auto mt-2 h-[5px] w-[132px]">
            <div
              className="total-fill bg-gradient-to-r from-[var(--gold)] to-[var(--gold-2)]"
              style={{ width: collectedRate + "%" }}
            ></div>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2 px-4">
        {rarityKeys.map(function (key) {
          var count = rarityCounts[key] || 0;
          var goal = rarityGoals[key] || 1;
          var width = Math.min(100, Math.round((count / goal) * 100));
          return (
            <div key={key} className="flex items-center gap-2">
              <div
                className="mono-label w-4 text-center text-[10px] font-bold"
                style={{ color: RARITY_CONFIG[key].color }}
              >
                {key}
              </div>
              <div className="rarity-track h-[5px] flex-1">
                <div
                  className="rarity-fill"
                  style={{ width: width + "%", background: RARITY_CONFIG[key].color }}
                ></div>
              </div>
              <div
                className="mono-label w-10 text-right text-[9px] font-bold"
                style={{ color: RARITY_CONFIG[key].color }}
              >
                {count}/{goal}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex gap-2 overflow-x-auto px-4 pb-1">
        <FilterButton label="전체" value="ALL" current={filter} onSelect={setFilter} />
        {rarityKeys.map(function (key) {
          return (
            <FilterButton
              key={key}
              label={"★ " + key}
              value={key}
              current={filter}
              onSelect={setFilter}
              color={RARITY_CONFIG[key].color}
            />
          );
        })}
      </div>

      {props.error ? (
        <div className="mx-4 mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {props.error}
        </div>
      ) : null}

      <div className="mono-label px-4 pb-3 pt-5 text-[10px] font-bold text-[var(--ink-3)]">
        발견한 종 · {filteredItems.length}
      </div>
      <div className="grid grid-cols-4 gap-2 px-4">
        {filteredItems.map(function (item, index) {
          return <CollectionCard key={item.id || item.korean_name || index} item={item} />;
        })}
      </div>

      <div className="mono-label px-4 pb-3 pt-6 text-[10px] font-bold text-[var(--ink-3)]">
        미발견 종 · {Math.max(0, total - collectedCount)}
      </div>
      <div className="grid grid-cols-4 gap-2 px-4">
        {placeholders.map(function (item) {
          return <CollectionCard key={item.id} item={item} />;
        })}
      </div>

      {filteredItems.length === 0 && !props.isLoading ? (
        <div className="mx-4 mt-5 rounded-2xl border border-dashed border-[var(--gold-bd)] bg-[var(--surface-2)] px-4 py-5 text-center text-sm text-[var(--ink-2)]">
          아직 수집된 생물이 없습니다. 촬영 화면에서 첫 도감을 채워보세요.
        </div>
      ) : null}
    </section>
  );
}

function getRarityCounts(items) {
  return items.reduce(function (acc, item) {
    var rarity = getRarity(item);
    acc[rarity] = (acc[rarity] || 0) + 1;
    return acc;
  }, {});
}

function createPlaceholderItems(count) {
  var items = [];

  for (var index = 0; index < count; index += 1) {
    items.push({ id: "placeholder-" + index, isPlaceholder: true });
  }

  return items;
}

function FilterButton(props) {
  var isActive = props.current === props.value;

  return (
    <button
      type="button"
      className={
        "shrink-0 rounded-full border px-4 py-1.5 font-['Space_Mono'] text-[10px] font-bold " +
        (isActive
          ? "border-[var(--ink-1)] bg-[var(--ink-1)] text-[var(--paper)]"
          : "border-black/10 bg-[var(--surface)] text-[var(--ink-3)]")
      }
      style={!isActive && props.color ? { color: props.color, borderColor: props.color + "55" } : null}
      onClick={function () {
        props.onSelect(props.value);
      }}
    >
      {props.label}
    </button>
  );
}

window.CollectionView = CollectionView;
