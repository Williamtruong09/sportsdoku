interface Props {
  guessesRemaining: number;
  date: string;
  onHelp: () => void;
}

export function Header({ guessesRemaining, date, onHelp }: Props) {
  const hearts = Array.from({ length: 9 }, (_, i) => i < guessesRemaining);

  return (
    <header className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
      <button
        onClick={onHelp}
        className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-800 transition-colors text-sm font-bold"
        aria-label="Help"
      >
        ?
      </button>

      <div className="text-center">
        <h1 className="text-xl font-black tracking-tight">
          <span className="text-white">Sports</span>
          <span className="text-orange-400">Doku</span>
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
