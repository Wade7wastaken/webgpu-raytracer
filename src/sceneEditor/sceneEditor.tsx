import { useEffect, useMemo, useState, type FC } from "react";
import { Vector3 } from "three";

import { ListObjectEditor } from "./listEditor";
import {
  remapSceneMaterials,
  type ListSceneObject,
  type SceneObject,
  type SceneObjectNoId,
} from "./utilities";

import type { MaterialList } from "../materials";

const rootList: ListSceneObject = {
  type: "list",
  id: 0,
  enabled: true,
  children: [],
};

const startingObjects: SceneObjectNoId[] = [
  {
    type: "quad",
    enabled: true,
    base: new Vector3(0, 0, -2),
    u: new Vector3(1, 0, 0),
    v: new Vector3(0, 1, 0),
    materialName: "Lambertian",
    colorIndex: 0,
  },
  {
    type: "quad",
    enabled: true,
    base: new Vector3(0, 0, -2),
    u: new Vector3(0, 0, 1),
    v: new Vector3(1, 0, 0),
    materialName: "Lambertian",
    colorIndex: 0,
  },
  {
    type: "quad",
    enabled: true,
    base: new Vector3(0, 1, -2),
    u: new Vector3(0, 0, 1),
    v: new Vector3(1, 0, 0),
    materialName: "Lambertian",
    colorIndex: 0,
  },
  {
    type: "quad",
    enabled: true,
    base: new Vector3(0, 0, -2),
    u: new Vector3(0, 1, 0),
    v: new Vector3(0, 0, 1),
    materialName: "Lambertian",
    colorIndex: 1,
  },
  {
    type: "quad",
    enabled: true,
    base: new Vector3(1, 0, -2),
    u: new Vector3(0, 1, 0),
    v: new Vector3(0, 0, 1),
    materialName: "Lambertian",
    colorIndex: 2,
  },
  {
    type: "quad",
    enabled: true,
    base: new Vector3(0.3, 0.995, -1.7),
    u: new Vector3(0.4, 0, 0),
    v: new Vector3(0, 0, 0.4),
    materialName: "Emissive",
    colorIndex: 0,
  },
];

type Properties = {
  materials: MaterialList;
  setSceneReference: (scene: SceneObject) => void;
};

const createInitialRootObject = (): ListSceneObject => ({
  ...rootList,
  children: startingObjects.map((object, index) => ({
    ...object,
    id: index + 1,
  })),
});

export const MainEditor: FC<Properties> = ({
  materials,
  setSceneReference,
}) => {
  const [rootObject, setRootObject] = useState<ListSceneObject>(
    createInitialRootObject,
  );
  const [nextId, setNextId] = useState(startingObjects.length + 1);
  const displayedRootObject = useMemo(
    () =>
      remapSceneMaterials(
        rootObject,
        materials.materials.map((material) => material.name),
      ) as ListSceneObject,
    [rootObject, materials],
  );

  useEffect(() => {
    setSceneReference(displayedRootObject);
  }, [setSceneReference, displayedRootObject]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <ListObjectEditor
        listObject={displayedRootObject}
        updateListObject={(patch) => {
          setRootObject(patch ?? rootList);
        }}
        nextId={nextId}
        setNextId={setNextId}
        materials={materials}
        defaultMaterialName={materials.materials[0]?.name ?? "lambertian"}
      />
    </div>
  );
};
