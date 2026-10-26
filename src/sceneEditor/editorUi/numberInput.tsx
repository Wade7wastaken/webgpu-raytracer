import { useState, type FC } from "react";

type Properties = {
  value: number;
  onChange: (value: number) => void;
};

export const NumberInput: FC<Properties> = ({ value, onChange }) => {
  const [isHeld, setIsHeld] = useState(false);
  const [dragged, setIsDragged] = useState(false);

  return (
    <input
      type="text"
      className="w-12 min-w-0 rounded border border-zinc-700 bg-zinc-950 px-1 py-0.5 text-right text-xs tabular-nums text-zinc-200 hover:cursor-e-resize focus:border-zinc-500 focus:outline-none"
      unselectable="on"
      value={+value.toFixed(4)}
      onChange={(event) => {
        onChange(Number(event.target.value));
      }}
      onMouseDown={() => {
        setIsHeld(true);
        setIsDragged(false);
      }}
      onMouseUp={(event) => {
        setIsHeld(false);
        if (!dragged) {
          event.currentTarget.select()
        }
      }}
      onMouseMove={(event) => {
        if (!isHeld) {
          return;
        }

        onChange(value + event.movementX / 100);
        setIsDragged(true);
      }}
    />
  );
};
