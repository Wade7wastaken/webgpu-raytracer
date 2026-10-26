import { useRef, useState } from "react";
import { Mesh, Vector3 } from "three";
import { OBJLoader } from "three/addons/loaders/OBJLoader.js";

import { Dropdown } from "./editorUi/dropdown";
import { ObjectEditor } from "./objectEditor";
import {
  addObjectToList,
  type ListSceneObject,
  type Triangle,
} from "./utilities";

import type { Dispatch, FC, SetStateAction } from "react";
import type { Object3D } from "three";

type ListProperties = {
  listObject: ListSceneObject;
  updateListObject: (patch: ListSceneObject | undefined) => void;
  nextId: number;
  setNextId: Dispatch<SetStateAction<number>>;
};

// hack to please eslint
const isMeshObject = (object: Object3D): object is Mesh =>
  object instanceof Mesh;

export const ListObjectEditor: FC<ListProperties> = ({
  listObject,
  updateListObject,
  nextId,
  setNextId,
}) => {
  const fileInputReference = useRef<HTMLInputElement>(null);
  const [importError, setImportError] = useState("");

  const importObjectFile = async (file: File): Promise<void> => {
    setImportError("");
    try {
      const source = await file.text();
      const importedObject = new OBJLoader().parse(source);
      importedObject.updateMatrixWorld(true);

      const triangles: Triangle[] = [];
      importedObject.traverse((object: Object3D) => {
        if (!isMeshObject(object)) {
          return;
        }

        const position = object.geometry.getAttribute("position");
        const index = object.geometry.getIndex();
        const vertexAt = (vertexIndex: number): Vector3 =>
          new Vector3(
            position.getX(vertexIndex),
            position.getY(vertexIndex),
            position.getZ(vertexIndex),
          ).applyMatrix4(object.matrixWorld);
        const vertexCount = index?.count ?? position.count;
        const indexAt = (offset: number): number =>
          index?.getX(offset) ?? offset;

        for (
          let vertexIndex = 0;
          vertexIndex + 2 < vertexCount;
          vertexIndex += 3
        ) {
          triangles.push({
            vertices: [
              vertexAt(indexAt(vertexIndex)),
              vertexAt(indexAt(vertexIndex + 1)),
              vertexAt(indexAt(vertexIndex + 2)),
            ],
            materialIndex: 0,
            colorIndex: 0,
          });
        }
      });

      if (triangles.length === 0) {
        setImportError("This OBJ file does not contain any triangle geometry.");
        return;
      }

      updateListObject(
        addObjectToList(
          listObject,
          {
            type: "mesh",
            name: file.name,
            triangles,
            transform: {
              position: new Vector3(0, 0, 0),
              rotation: new Vector3(0, 0, 0),
              scale: new Vector3(1, 1, 1),
            },
            enabled: true,
          },
          nextId,
          setNextId,
        ),
      );
    } catch {
      setImportError("Could not read this OBJ file.");
    }
  };

  return (
    <div className="border bg-gray-200 rounded-xl m-2 p-2">
      <input
        ref={fileInputReference}
        type="file"
        accept=".obj,text/plain"
        className="hidden"
        onChange={(event) => {
          const [file] = event.currentTarget.files ?? [];
          if (file !== undefined) {
            void importObjectFile(file);
          }
          event.currentTarget.value = "";
        }}
      />
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
          options={["quad", "list", "obj"]}
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
                break;
              }
              case "obj": {
                fileInputReference.current?.click();
                break;
              }
            }
          }}
        />
        <p>Object Group</p>
      </div>
      {importError !== "" && (
        <p className="text-red-700" role="alert">
          {importError}
        </p>
      )}
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
