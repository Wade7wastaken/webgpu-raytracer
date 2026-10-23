import { Vector3 } from "three";

import { NumberInput } from "./numberInput";

import type { FC } from "react";

type Properties = {
  value: Vector3;
  onChange: (value: Vector3) => void;
};

export const VectorInput: FC<Properties> = ({ value, onChange }) => {
  return (
    <>
      <p className="text-right mr-1">X</p>
      <NumberInput
        value={value.x}
        onChange={(newX) => {
          onChange(new Vector3(newX, value.y, value.z));
        }}
      />
      <p className="text-right mr-1">Y</p>
      <NumberInput
        value={value.y}
        onChange={(newY) => {
          onChange(new Vector3(value.x, newY, value.z));
        }}
      />
      <p className="text-right mr-1">Z</p>
      <NumberInput
        value={value.z}
        onChange={(newZ) => {
          onChange(new Vector3(value.x, value.y, newZ));
        }}
      />
    </>
  );
};
