interface Props {
  guessesRemaining: number;
  date: string;
  onHelp: () => void;
  onDonate: () => void;
  lastGuessWasWrong?: boolean;
}

export function Header({ guessesRemaining, date, onHelp, onDonate, lastGuessWasWrong }: Props) {
  const lives = Array.from({ length: 3 }, (_, i) => i < guessesRemaining);

  return (
    <header style={{ background: '#000', borderBottom: '1px solid #1f1f1f' }} className="px-4 py-3">
      <div className="max-w-lg mx-auto flex items-center justify-between">

        {/* Donate */}
        <button
          onClick={onDonate}
          className="text-amber-400 hover:text-amber-300 transition-colors text-xs font-bold uppercase tracking-widest"
          style={{ fontFamily: '"Barlow Condensed", system-ui, sans-serif', letterSpacing: '0.1em' }}
        >
          🐾 Dog Treat Fund
        </button>

        {/* Logo — absolute center */}
        <div className="absolute left-1/2 -translate-x-1/2 text-center">
          <div
            className="font-display font-black uppercase leading-none"
            style={{ fontSize: '22px', letterSpacing: '0.15em' }}
          >
            <span className="text-white">SPOR</span>
            <span
              className="text-orange-400"
              style={{ animation: 'neonFlicker 6s infinite', textShadow: '0 0 8px #f97316, 0 0 20px #f97316, 0 0 40px #ea580c' }}
            >
              DOKU
            </span>
          </div>
          <div className="text-gray-600 text-[10px] uppercase tracking-widest mt-0.5">
            {date}
          </div>
        </div>

        {/* Lives + help */}
        <div className="flex items-center gap-3">
          <div className="flex gap-1 items-center" title={`${guessesRemaining} of 3 lives remaining`}>
            {lives.map((alive, i) => (
              <span
                key={i}
                className={`text-xl transition-all duration-300 ${alive ? 'opacity-100' : 'opacity-20 grayscale'} ${!alive && lastGuessWasWrong && i === guessesRemaining ? 'animate-heart-break' : ''}`}
              >
                ❤️
              </span>
            ))}
          </div>
          <button
            onClick={onHelp}
            className="text-gray-500 hover:text-white transition-colors font-bold"
            style={{ fontFamily: '"Barlow Condensed", system-ui, sans-serif', fontSize: 16 }}
            aria-label="Help"
          >
            ?
          </button>
        </div>

      </div>
    </header>
  );
}
