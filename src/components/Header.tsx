interface Props {
  guessesRemaining: number;
  date: string;
  onHelp: () => void;
  onDonate: () => void;
}

export function Header({ guessesRemaining, date, onHelp, onDonate }: Props) {
  const hearts = Array.from({ length: 9 }, (_, i) => i < guessesRemaining);

  return (
    <header className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
      <div className="flex gap-1">
        <button
          onClick={onHelp}
          className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-800 transition-colors text-sm font-bold"
          aria-label="Help"
        >
          ?
        </button>
        <button
          onClick={onDonate}
          className="flex items-center gap-1 px-2 h-8 rounded-full hover:bg-gray-800 transition-colors text-sm font-semibold text-amber-400"
          aria-label="Support the developer"
        >
          🐾 <span className="text-xs">Dog Treat Fund</span>
        </button>
      </div>

      <div className="text-center">
        <h1 className="text-xl font-black tracking-tight">
          <span className="text-white">Spor</span>
          <span className="text-orange-400">doku</span>
        </h1>
        <p className="text-xs text-gray-500">{date}</p>
      </div>

      <div className="flex gap-0.5" title={`${guessesRemaining} guesses remaining`}>
        {hearts.map((alive, i) => (
          <span key={i} className={`text-sm transition-all ${alive ? 'opacity-100' : 'opacity-20 grayscale'}`}>
            ❤️
          </span>
        ))}
      </div>
    </header>
  );
}
