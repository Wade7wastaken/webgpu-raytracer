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
    <div className="bg-gray-200 p-2 border rounded-xl m-2">
      <div className="flex justify-end gap-2">
        <p
          className="hover:cursor-pointer"
          onClick={() => {
            updateObjObject(undefined);
          }}
        >
          X
        </p>
        <p>{objObject.name}</p>
      </div>
      <div className="grid grid-cols-7">
        <p>Translation</p>
        <VectorInput
          value={objObject.transform.position}
          onChange={(position) => {
            updateObjObject({
              ...objObject,
              transform: { ...objObject.transform, position },
            });
          }}
        />
        <p>Scale</p>
        <VectorInput
          value={objObject.transform.scale}
          onChange={(scale) => {
            updateObjObject({
              ...objObject,
              transform: { ...objObject.transform, scale },
            });
          }}
        />
        <p>Rotation</p>
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
  );
};
