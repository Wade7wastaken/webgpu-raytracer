import { useState, type FC } from "react";

type Properties = {
  value: number;
  onChange: (value: number) => void;
};

export const NumberInput: FC<Properties> = ({ value, onChange }) => {
  const [stringValue, setStringValue] = useState(value.toString());
  const [isHeld, setIsHeld] = useState(false);
  const [dragged, setIsDragged] = useState(false);

  return (
    <input
      type="text"
      className="w-12 min-w-0 rounded border border-zinc-700 bg-zinc-950 px-1 py-0.5 text-right text-xs text-zinc-200 tabular-nums hover:cursor-e-resize focus:border-zinc-500 focus:outline-none"
      unselectable="on"
      value={stringValue}
      onChange={(event) => {
        setStringValue(event.target.value);
        const converted = Number(event.target.value);
        if (Number.isFinite(converted)) {
          onChange(converted);
        }
      }}
      onPointerDown={(event) => {
        if (event.button !== 0) {
          return;
        }

        event.currentTarget.setPointerCapture(event.pointerId);
        setIsHeld(true);
        setIsDragged(false);
      }}
      onPointerUp={(event) => {
        setIsHeld(false);
        if (!dragged) {
          event.currentTarget.select();
        }
      }}
      onPointerCancel={() => {
        setIsHeld(false);
      }}
      onLostPointerCapture={() => {
        setIsHeld(false);
      }}
      onPointerMove={(event) => {
        if (!isHeld) {
          return;
        }

        const newValue = value + event.movementX / 100;
        onChange(newValue);
        setStringValue(Number(newValue.toFixed(4)).toString())
        setIsDragged(true);
      }}
    />
  );
};
