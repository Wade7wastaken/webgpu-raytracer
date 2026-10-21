import {
  useEffect,
  useState,
  type Dispatch,
  type FC,
  type SetStateAction,
} from "react";
import { Vector3 } from "three";

import { Dropdown } from "./editorUi/dropdown";
import { VectorInput } from "./editorUi/vectorInput";

import type {
  SceneObject,
  ListSceneObject,
  QuadSceneObject,
  SceneObjectNoId,
} from "./mesh";

type MainProperties = {
  setSceneReference: (scene: SceneObject) => void;
};

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

const addObjectToList = (
  list: ListSceneObject,
  newObject: SceneObjectNoId,
  nextId: number,
  setNextId: Dispatch<SetStateAction<number>>,
): ListSceneObject => {
  const thisId = nextId;
  setNextId((id) => id + 1);
  return {
    ...list,
    children: [...list.children, { ...newObject, id: thisId }],
  };
};

export const MainEditor: FC<MainProperties> = ({ setSceneReference }) => {
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

  const [nextId, setNextId] = useState(1); // 0 is reserved for the root list

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

type Properties = {
  sceneObject: SceneObject;
  updateSceneObject: (patch: SceneObject | undefined) => void;
  nextId: number;
  setNextId: Dispatch<SetStateAction<number>>;
};

export const SceneEditor: FC<Properties> = ({
  sceneObject,
  updateSceneObject,
  nextId,
  setNextId,
}) => {
  console.log(sceneObject);
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
  }
};

type ListProperties = {
  listObject: ListSceneObject;
  updateListObject: (patch: ListSceneObject | undefined) => void;
  nextId: number;
  setNextId: Dispatch<SetStateAction<number>>;
};

const ListObjectEditor: FC<ListProperties> = ({
  listObject,
  updateListObject,
  nextId,
  setNextId,
}) => {
  return (
    <div className="border bg-gray-200 rounded-xl m-2 p-2">
      <div className="flex justify-end gap-2">
        <p
          className="hover:cursor-pointer"
          onClick={() => {
            updateListObject(undefined);
          }}
        >
          X
        </p>
        <Dropdown
          text="+"
          options={["quad", "list"]}
          onSelect={(option) => {
            switch (option) {
              case "quad": {
                updateListObject(
                  addObjectToList(
                    listObject,
                    {
                      type: "quad",
                      base: new Vector3(0, 0, 0),
                      u: new Vector3(1, 0, 0),
                      v: new Vector3(0, 1, 0),
                      colorIndex: 0,
                      materialIndex: 0,
                      enabled: true,
                    },
                    nextId,
                    setNextId,
                  ),
                );
                break;
              }
              case "list": {
                updateListObject(
                  addObjectToList(
                    listObject,
                    { type: "list", children: [], enabled: true },
                    nextId,
                    setNextId,
                  ),
                );
              }
            }
          }}
        />
        <p>Object Group</p>
      </div>
      <div className="">
        {listObject.children.map((child, index) => (
          <SceneEditor
            key={child.id}
            sceneObject={child}
            updateSceneObject={(patch) => {
              updateListObject({
                ...listObject,
                children: [
                  ...listObject.children.slice(0, index),
                  ...(patch === undefined ? [] : [{ ...child, ...patch }]),
                  ...listObject.children.slice(index + 1),
                ],
              });
            }}
            nextId={nextId}
            setNextId={setNextId}
          />
        ))}
      </div>
    </div>
  );
};

type QuadProperties = {
  quadObject: QuadSceneObject;
  updateQuadObject: (patch: QuadSceneObject | undefined) => void;
};

const QuadObjectEditor: FC<QuadProperties> = ({
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
