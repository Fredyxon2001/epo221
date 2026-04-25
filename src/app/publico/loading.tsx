export default function PublicoLoading() {
  return (
    <div className="pt-32 pb-28 px-6">
      <div className="max-w-6xl mx-auto animate-pulse">
        <div className="flex flex-col items-center gap-4 mb-14">
          <div className="h-3 w-40 bg-verde/20 rounded-full" />
          <div className="h-10 w-80 max-w-full bg-verde/25 rounded-xl" />
          <div className="h-px w-24 bg-verde/30" />
          <div className="h-3 w-96 max-w-full bg-verde/15 rounded-full" />
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="h-48 rounded-3xl bg-gradient-to-br from-verde/10 to-verde/5 border border-verde/10"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
