const KOFI_URL = 'https://ko-fi.com/dogdaddev';

interface Props {
  onClose: () => void;
}

export function DonatePage({ onClose }: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-sm bg-gray-900 rounded-2xl border border-gray-700 overflow-hidden animate-fade-in">

        {/* Header banner */}
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-6 text-center relative">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 text-white/70 hover:text-white text-2xl leading-none"
            aria-label="Close"
          >
            ×
          </button>
          <div className="text-4xl mb-2">🐾</div>
          <h2 className="text-xl font-black text-white">Dog Treat Fund</h2>
          <p className="text-white/80 text-sm mt-1">100% goes to the pups. Promise.</p>
        </div>

        {/* Dog photo */}
        <img
          src="/Doggies.JPG"
          alt="The dogs"
          className="w-full h-48 object-cover"
        />

        {/* Body */}
        <div className="p-6 space-y-5">

          <div className="text-sm text-gray-300 space-y-2 leading-relaxed">
            <p>
              Hey! I'm a small independent developer and proud dad of 2 (dogs) who built
              SportsDoku in my spare time because I love sports and a good daily challenge.
            </p>
            <p className="text-gray-400">
              If you enjoy the game, any donation goes straight to buying my co-developers
              some treats. They've earned it. 🐶🐶
            </p>
          </div>

          {/* Treat fund bar */}
          <div>
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>🦴 Treat fund</span>
              <span>Always empty</span>
            </div>
            <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
              <div className="h-full w-[12%] bg-gradient-to-r from-amber-500 to-orange-400 rounded-full" />
            </div>
          </div>

          <a
            href={KOFI_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl font-bold text-sm bg-[#FF5E5B] hover:bg-[#e54e4b] text-white transition-colors"
          >
            <span className="text-lg">🐾</span>
            Dog Treat Fund
          </a>

          <p className="text-center text-xs text-gray-600">
            No pressure — enjoying the game is enough 🙏
          </p>
        </div>
      </div>
    </div>
  );
}
