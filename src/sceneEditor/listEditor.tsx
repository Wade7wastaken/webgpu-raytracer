import { Vector3 } from "three";

import { Dropdown } from "./editorUi/dropdown";
import { ObjectEditor } from "./objectEditor";
import { addObjectToList, type ListSceneObject } from "./utilities";

import type { Dispatch, FC, SetStateAction } from "react";

type ListProperties = {
  listObject: ListSceneObject;
  updateListObject: (patch: ListSceneObject | undefined) => void;
  nextId: number;
  setNextId: Dispatch<SetStateAction<number>>;
};

export const ListObjectEditor: FC<ListProperties> = ({
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
          <ObjectEditor
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
