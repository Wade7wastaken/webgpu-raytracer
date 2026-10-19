import { useEffect, useState, type FC } from "react";
import { Vector3 } from "three";

import { NumberInput } from "./editorUi/numberInput";
import { VectorInput } from "./editorUi/vectorInput";

import type { SceneObject, ListSceneObject, QuadSceneObject } from "./mesh";

type MainProperties = {
  setSceneReference: (scene: SceneObject) => void;
};

export const MainEditor: FC<MainProperties> = ({ setSceneReference }) => {
  const [state, setState] = useState<SceneObject>({
    type: "list",
    id: 0,
    enabled: true,
    children: [
      {
        type: "quad",
        id: 1,
        enabled: true,
        base: new Vector3(0, 0, -2),
        u: new Vector3(1, 0, 0),
        v: new Vector3(0, 1, 0),
        materialIndex: 0,
        colorIndex: 0,
      },
      {
        type: "quad",
        id: 2,
        enabled: true,
        base: new Vector3(0, 0, -2),
        u: new Vector3(0, 0, 1),
        v: new Vector3(1, 0, 0),
        materialIndex: 0,
        colorIndex: 0,
      },
      {
        type: "quad",
        id: 3,
        enabled: true,
        base: new Vector3(0, 1, -2),
        u: new Vector3(0, 0, 1),
        v: new Vector3(1, 0, 0),
        materialIndex: 0,
        colorIndex: 0,
      },
      {
        type: "quad",
        id: 4,
        enabled: true,
        base: new Vector3(0, 0, -2),
        u: new Vector3(0, 1, 0),
        v: new Vector3(0, 0, 1),
        materialIndex: 0,
        colorIndex: 1,
      },
      {
        type: "quad",
        id: 5,
        enabled: true,
        base: new Vector3(1, 0, -2),
        u: new Vector3(0, 1, 0),
        v: new Vector3(0, 0, 1),
        materialIndex: 0,
        colorIndex: 2,
      },
      {
        type: "quad",
        id: 6,
        enabled: true,
        base: new Vector3(0.3, 0.995, -1.7),
        u: new Vector3(0.4, 0, 0),
        v: new Vector3(0, 0, 0.4),
        materialIndex: 1,
        colorIndex: 0,
      },
    ],
  });

  useEffect(() => {
    setSceneReference(state);
  }, [setSceneReference, state]);

  return (
    <div>
      <SceneEditor
        sceneObject={state}
        updateSceneObject={(patch) => {
          setState(
            patch ?? { type: "list", id: 0, children: [], enabled: true },
          );
        }}
      />
    </div>
  );
};

type Properties = {
  sceneObject: SceneObject;
  updateSceneObject: (patch: SceneObject | undefined) => void;
};

export const SceneEditor: FC<Properties> = ({
  sceneObject,
  updateSceneObject,
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
  updateListObject: (patch: ListSceneObject) => void;
};

const ListObjectEditor: FC<ListProperties> = ({
  listObject,
  updateListObject,
}) => {
  return (
    <div className="border bg-gray-200 rounded-xl m-2 p-2">
      <p className="text-right">Object Group</p>
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
