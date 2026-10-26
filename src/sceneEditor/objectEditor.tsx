import { ListObjectEditor } from "./listEditor";
import { MeshObjectEditor } from "./meshObjectEditor";
import { QuadObjectEditor } from "./quadEditor";

import type { SceneObject } from "./utilities";
import type { Dispatch, FC, SetStateAction } from "react";

type Properties = {
  sceneObject: SceneObject;
  updateSceneObject: (patch: SceneObject | undefined) => void;
  nextId: number;
  setNextId: Dispatch<SetStateAction<number>>;
};

export const ObjectEditor: FC<Properties> = ({
  sceneObject,
  updateSceneObject,
  nextId,
  setNextId,
}) => {
  switch (sceneObject.type) {
    case "list": {
      return (
        <ListObjectEditor
          listObject={sceneObject}
          updateListObject={(patch) => {
            updateSceneObject(patch);
          }}
          nextId={nextId}
          setNextId={setNextId}
        />
      );
    }
    case "quad": {
      return (
        <QuadObjectEditor
          quadObject={sceneObject}
          updateQuadObject={(patch) => {
            updateSceneObject(patch);
          }}
        />
      );
    }
    case "mesh": {
      return (
        <MeshObjectEditor
          objObject={sceneObject}
          updateObjObject={(patch) => {
            updateSceneObject(patch);
          }}
        />
      );
    }
  }
};
