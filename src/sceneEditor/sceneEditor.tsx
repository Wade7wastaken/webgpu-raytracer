import { useEffect, useState, type FC } from "react";
import { Vector3 } from "three";

import { ListObjectEditor } from "./listEditor";
import {
  addObjectToList,
  type ListSceneObject,
  type SceneObject,
  type SceneObjectNoId,
} from "./utilities";

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
    materialIndex: 0,
    colorIndex: 0,
  },
  {
    type: "quad",
    enabled: true,
    base: new Vector3(0, 0, -2),
    u: new Vector3(0, 0, 1),
    v: new Vector3(1, 0, 0),
    materialIndex: 0,
    colorIndex: 0,
  },
  {
    type: "quad",
    enabled: true,
    base: new Vector3(0, 1, -2),
    u: new Vector3(0, 0, 1),
    v: new Vector3(1, 0, 0),
    materialIndex: 0,
    colorIndex: 0,
  },
  {
    type: "quad",
    enabled: true,
    base: new Vector3(0, 0, -2),
    u: new Vector3(0, 1, 0),
    v: new Vector3(0, 0, 1),
    materialIndex: 0,
    colorIndex: 1,
  },
  {
    type: "quad",
    enabled: true,
    base: new Vector3(1, 0, -2),
    u: new Vector3(0, 1, 0),
    v: new Vector3(0, 0, 1),
    materialIndex: 0,
    colorIndex: 2,
  },
  {
    type: "quad",
    enabled: true,
    base: new Vector3(0.3, 0.995, -1.7),
    u: new Vector3(0.4, 0, 0),
    v: new Vector3(0, 0, 0.4),
    materialIndex: 1,
    colorIndex: 0,
  },
];

type Properties = {
  setSceneReference: (scene: SceneObject) => void;
};

export const MainEditor: FC<Properties> = ({ setSceneReference }) => {
  let startingId = 1;

  const getInitialRootObject = (
    rootList: ListSceneObject,
    objects: SceneObjectNoId[],
  ): ListSceneObject => {
    for (const object of objects) {
      rootList = addObjectToList(rootList, object, startingId, (update) => {
        startingId = typeof update === "function" ? update(startingId) : update;
      });
    }
    return rootList;
  };

  const [rootObject, setRootObject] = useState<ListSceneObject>(
    getInitialRootObject(rootList, startingObjects),
  );

  const [nextId, setNextId] = useState(startingId); // 0 is reserved for the root list

  useEffect(() => {
    setSceneReference(rootObject);
  }, [setSceneReference, rootObject]);

  return (
    <div className="w-full">
      <ListObjectEditor
        listObject={rootObject}
        updateListObject={(patch) => {
          setRootObject(patch ?? rootList);
        }}
        nextId={nextId}
        setNextId={setNextId}
      />
    </div>
  );
};
