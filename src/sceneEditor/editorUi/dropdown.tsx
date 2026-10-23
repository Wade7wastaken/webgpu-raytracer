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
    <div>
      <button
        className="relative"
        onClick={() => {
          setIsOpen((isOpen) => !isOpen);
        }}
        onBlur={() => {
          setIsOpen(false);
        }}
      >
        {text}
        {isOpen && (
          <div className="absolute bg-gray-400">
            {options.map((option) => (
              <div
                key={option}
                onClick={() => {
                  onSelect(option);
                }}
              >
                {option}
              </div>
            ))}
          </div>
        )}
      </button>
    </div>
  );
};
