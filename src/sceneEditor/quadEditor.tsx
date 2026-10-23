import { VectorInput } from "./editorUi/vectorInput";

import type { QuadSceneObject } from "./utilities";
import type { FC } from "react";

type Properties = {
  quadObject: QuadSceneObject;
  updateQuadObject: (patch: QuadSceneObject | undefined) => void;
};

export const QuadObjectEditor: FC<Properties> = ({
  quadObject,
  updateQuadObject,
}) => {
  return (
    <div className="bg-gray-200 p-2 border rounded-xl m-2">
      <div className="flex justify-end gap-2">
        <p
          className="hover:cursor-pointer"
          onClick={() => {
            updateQuadObject(undefined);
          }}
        >
          X
        </p>
        <p>Quad</p>
      </div>
      <div className="grid grid-cols-7">
        <p>Position</p>
        <VectorInput
          value={quadObject.base}
          onChange={(value) => {
            updateQuadObject({ ...quadObject, base: value });
          }}
        />
        <p>Side 1</p>
        <VectorInput
          value={quadObject.u}
          onChange={(value) => {
            updateQuadObject({ ...quadObject, u: value });
          }}
        />
        <p>Side 2</p>
        <VectorInput
          value={quadObject.v}
          onChange={(value) => {
            updateQuadObject({ ...quadObject, v: value });
          }}
        />
      </div>
    </div>
  );
};
