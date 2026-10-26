import { useState, type ReactNode } from "react";

type Properties<Item> = {
  text: string;
  options: Item[];
  onSelect: (option: Item) => void;
};

export const Dropdown = <Item extends string>({
  text,
  options,
  onSelect,
}: Properties<Item>): ReactNode => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        aria-expanded={isOpen}
        className="rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-zinc-200 hover:bg-zinc-700"
        onClick={() => {
          setIsOpen((isOpen) => !isOpen);
        }}
      >
        {text}
      </button>
      {isOpen && (
        <div className="absolute top-full right-0 z-20 mt-1 min-w-max rounded-md border border-zinc-700 bg-zinc-900 p-1 shadow-xl">
          {options.map((option) => (
            <button
              key={option}
              type="button"
              className="block w-full rounded px-3 py-1.5 text-left text-xs text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100"
              onClick={() => {
                onSelect(option);
                setIsOpen(false);
              }}
            >
              {option}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
