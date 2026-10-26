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

      <div className="flex flex-wrap gap-3">
        <div className="grid min-w-0 flex-1 gap-1.5">
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

        <div className="grid w-32 shrink-0 content-start gap-1.5">
          <label className="grid gap-1 text-xs text-zinc-500">
            Material
            <select
              value={meshObject.materialName}
              className="w-full min-w-0 cursor-pointer rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs text-zinc-200 focus:border-zinc-500 focus:outline-none"
              onChange={(event) => {
                const materialName = event.currentTarget.value;
                updateMeshObject({
                  ...meshObject,
                  materialName,
                  triangles: meshObject.triangles.map((triangle) => ({
                    ...triangle,
                    materialName,
                  })),
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
