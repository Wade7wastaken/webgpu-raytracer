import { ListObjectEditor } from "./ListEditor";
import { MeshObjectEditor } from "./MeshEditor";
import { QuadObjectEditor } from "./QuadEditor";

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
        <ListObjectEditor
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
        <QuadObjectEditor
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
        <MeshObjectEditor
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
