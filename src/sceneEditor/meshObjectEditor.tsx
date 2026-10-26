import { MathUtils } from "three";

import { NumberInput } from "./editorUi/numberInput";
import { VectorInput } from "./editorUi/vectorInput";

import type { MeshSceneObject } from "./utilities";
import type { MaterialList } from "../materials";
import type { FC } from "react";

type Properties = {
  meshObject: MeshSceneObject;
  updateMeshObject: (patch: MeshSceneObject | undefined) => void;
  materials: MaterialList;
};

export const MeshObjectEditor: FC<Properties> = ({
  meshObject,
  updateMeshObject,
  materials,
}) => {
  const rotationDegrees = meshObject.transform.rotation
    .clone()
    .multiplyScalar(MathUtils.RAD2DEG);

  return (
    <div className="rounded-md border border-zinc-800 bg-zinc-900 p-2">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="min-w-0 truncate text-xs font-medium text-zinc-300">
          {meshObject.name}
        </span>
        <button
          type="button"
          aria-label={`Remove ${meshObject.name}`}
          className="size-5 rounded text-sm text-zinc-300 hover:cursor-pointer hover:bg-zinc-700"
          onClick={() => {
            updateMeshObject(undefined);
          }}
        >
          ×
        </button>
      </div>

      <div className="flex">
        <div className="grid grow gap-1.5">
          <div className="flex items-center gap-2">
            <span className="w-16 shrink-0 text-xs text-zinc-500">
              Position
            </span>
            <VectorInput
              value={meshObject.transform.position}
              onChange={(position) => {
                updateMeshObject({
                  ...meshObject,
                  transform: { ...meshObject.transform, position },
                });
              }}
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="w-16 shrink-0 text-xs text-zinc-500">Scale</span>
            <VectorInput
              value={meshObject.transform.scale}
              onChange={(scale) => {
                updateMeshObject({
                  ...meshObject,
                  transform: { ...meshObject.transform, scale },
                });
              }}
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="w-16 shrink-0 text-xs text-zinc-500">
              Rotation
            </span>
            <VectorInput
              value={rotationDegrees}
              onChange={(degrees) => {
                updateMeshObject({
                  ...meshObject,
                  transform: {
                    ...meshObject.transform,
                    rotation: degrees.multiplyScalar(MathUtils.DEG2RAD),
                  },
                });
              }}
            />
          </div>
        </div>

        <div className="flex flex-col">
          <p>Material:</p>
          <select>
            {materials.materials.map((m) => (
              <option key={m.name}>{m.name}</option>
            ))}
          </select>
          <label>
            data
            <NumberInput
              value={meshObject.colorIndex}
              onChange={(value) => {
                updateMeshObject({ ...meshObject, colorIndex: value });
              }}
            />
          </label>
        </div>
      </div>
    </div>
  );
};
