import { ListEditor } from "./ListEditor";
import { MeshEditor } from "./MeshEditor";
import { QuadEditor } from "./QuadEditor";

import type { MaterialList } from "../materials";
import type { SceneObject } from "./utilities";
import type { Dispatch, FC, SetStateAction } from "react";

type Properties = {
  sceneObject: SceneObject;
  updateSceneObject: (patch: SceneObject | undefined) => void;
  nextId: number;
  setNextId: Dispatch<SetStateAction<number>>;
  materials: MaterialList;
  defaultMaterialName: string;
};

export const ObjectEditor: FC<Properties> = ({
  sceneObject,
  updateSceneObject,
  nextId,
  setNextId,
  materials,
  defaultMaterialName,
}) => {
  switch (sceneObject.type) {
    case "list": {
      return (
        <ListEditor
          listObject={sceneObject}
          updateListObject={(patch) => {
            updateSceneObject(patch);
          }}
          nextId={nextId}
          setNextId={setNextId}
          materials={materials}
          defaultMaterialName={defaultMaterialName}
        />
      );
    }
    case "quad": {
      return (
        <QuadEditor
          quadObject={sceneObject}
          updateQuadObject={(patch) => {
            updateSceneObject(patch);
          }}
          materials={materials}
        />
      );
    }
    case "mesh": {
      return (
        <MeshEditor
          meshObject={sceneObject}
          updateMeshObject={(patch) => {
            updateSceneObject(patch);
          }}
          materials={materials}
        />
      );
    }
  }
};
