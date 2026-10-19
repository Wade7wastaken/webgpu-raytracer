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
      className="bg-gray-300 hover:cursor-e-resize select-none w-16"
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
