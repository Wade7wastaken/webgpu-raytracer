import { NumberInput } from "./editorUi/NumberInput";
import { VectorInput } from "./editorUi/VectorInput";

import type { MaterialList } from "../materials";
import type { QuadSceneObject } from "./utilities";
import type { FC } from "react";

type Properties = {
  quadObject: QuadSceneObject;
  updateQuadObject: (patch: QuadSceneObject | undefined) => void;
  materials: MaterialList;
};

export const QuadObjectEditor: FC<Properties> = ({
  quadObject,
  updateQuadObject,
  materials,
}) => {
  return (
    <div className="rounded-md border border-zinc-800 bg-zinc-900 p-2">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium text-zinc-300">
          Quad {quadObject.id}
        </span>
        <button
          type="button"
          aria-label="Remove quad"
          className="size-5 rounded text-sm text-zinc-300 hover:cursor-pointer hover:bg-zinc-700"
          onClick={() => {
            updateQuadObject(undefined);
          }}
        >
          ×
        </button>
      </div>
      <div className="flex flex-wrap gap-3">
        <div className="grid min-w-0 flex-1 gap-1.5">
          <div className="flex items-center gap-2">
            <span className="w-16 shrink-0 text-xs text-zinc-500">
              Position
            </span>
            <VectorInput
              value={quadObject.base}
              onChange={(value) => {
                updateQuadObject({ ...quadObject, base: value });
              }}
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="w-16 shrink-0 text-xs text-zinc-500">Side U</span>
            <VectorInput
              value={quadObject.u}
              onChange={(value) => {
                updateQuadObject({ ...quadObject, u: value });
              }}
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="w-16 shrink-0 text-xs text-zinc-500">Side V</span>
            <VectorInput
              value={quadObject.v}
              onChange={(value) => {
                updateQuadObject({ ...quadObject, v: value });
              }}
            />
          </div>
        </div>
        <div className="grid w-32 shrink-0 content-start gap-1.5">
          <label className="grid gap-1 text-xs text-zinc-500">
            Material
            <select
              value={quadObject.materialName}
              className="w-full min-w-0 cursor-pointer rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs text-zinc-200 focus:border-zinc-500 focus:outline-none"
              onChange={(event) => {
                updateQuadObject({
                  ...quadObject,
                  materialName: event.currentTarget.value,
                });
              }}
            >
              {materials.materials.map((material) => (
                <option key={material.name} value={material.name}>
                  {material.name}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-xs text-zinc-500">
            Material data
            <NumberInput
              value={quadObject.colorIndex}
              onChange={(value) => {
                updateQuadObject({ ...quadObject, colorIndex: value });
              }}
            />
          </label>
        </div>
      </div>
    </div>
  );
};
