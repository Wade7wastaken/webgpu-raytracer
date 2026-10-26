import { MathUtils } from "three";

import { VectorInput } from "./editorUi/vectorInput";

import type { MeshSceneObject } from "./utilities";
import type { FC } from "react";

type Properties = {
  objObject: MeshSceneObject;
  updateObjObject: (patch: MeshSceneObject | undefined) => void;
};

export const MeshObjectEditor: FC<Properties> = ({
  objObject,
  updateObjObject,
}) => {
  const rotationDegrees = objObject.transform.rotation
    .clone()
    .multiplyScalar(MathUtils.RAD2DEG);

  return (
    <div className="rounded-md border border-zinc-800 bg-zinc-900/60 p-2">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="min-w-0 truncate text-xs font-medium text-zinc-300">
          {objObject.name}
        </span>
        <button
          type="button"
          aria-label={`Remove ${objObject.name}`}
          className="rounded px-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-100"
          onClick={() => {
            updateObjObject(undefined);
          }}
        >
          ×
        </button>
      </div>
      <div className="grid gap-1.5">
        <div className="flex items-center gap-2">
          <span className="w-16 shrink-0 text-xs text-zinc-500">Position</span>
          <VectorInput
            value={objObject.transform.position}
            onChange={(position) => {
              updateObjObject({
                ...objObject,
                transform: { ...objObject.transform, position },
              });
            }}
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="w-16 shrink-0 text-xs text-zinc-500">Scale</span>
          <VectorInput
            value={objObject.transform.scale}
            onChange={(scale) => {
              updateObjObject({
                ...objObject,
                transform: { ...objObject.transform, scale },
              });
            }}
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="w-16 shrink-0 text-xs text-zinc-500">Rotation</span>
          <VectorInput
            value={rotationDegrees}
            onChange={(degrees) => {
              updateObjObject({
                ...objObject,
                transform: {
                  ...objObject.transform,
                  rotation: degrees.multiplyScalar(MathUtils.DEG2RAD),
                },
              });
            }}
          />
        </div>
      </div>
    </div>
  );
};
