import { Vector3 } from "three";

import { NumberInput } from "./numberInput";

import type { FC } from "react";

type Properties = {
  value: Vector3;
  onChange: (value: Vector3) => void;
};

export const VectorInput: FC<Properties> = ({ value, onChange }) => {
  return (
    <div className="grid min-w-0 flex-1 grid-cols-3 gap-1">
      <label className="flex min-w-0 items-center gap-1 text-xs text-zinc-500">
        X
        <NumberInput
          value={value.x}
          onChange={(newX) => {
            onChange(new Vector3(newX, value.y, value.z));
          }}
        />
      </label>
      <label className="flex min-w-0 items-center gap-1 text-xs text-zinc-500">
        Y
        <NumberInput
          value={value.y}
          onChange={(newY) => {
            onChange(new Vector3(value.x, newY, value.z));
          }}
        />
      </label>
      <label className="flex min-w-0 items-center gap-1 text-xs text-zinc-500">
        Z
        <NumberInput
          value={value.z}
          onChange={(newZ) => {
            onChange(new Vector3(value.x, value.y, newZ));
          }}
        />
      </label>
    </div>
  );
};
