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
  defaultMaterialName: string;
};

// hack to please eslint
const isMeshObject = (object: Object3D): object is Mesh =>
  object instanceof Mesh;

export const ListObjectEditor: FC<ListProperties> = ({
  listObject,
  updateListObject,
  nextId,
  setNextId,
  defaultMaterialName,
}) => {
  const fileInputReference = useRef<HTMLInputElement>(null);
  const [importError, setImportError] = useState("");
  const [isExpanded, setIsExpanded] = useState(true);
  const isRoot = listObject.id === 0;

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
            materialName: defaultMaterialName,
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
    <div
      className={
        isRoot
          ? "flex h-full min-h-0 flex-col"
          : "ml-2 border-l border-zinc-800 pl-2"
      }
    >
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
      <div className="flex min-h-8 items-center gap-2 rounded-md px-1 text-xs">
        <button
          type="button"
          aria-label={isExpanded ? "Collapse group" : "Expand group"}
          className="w-5 rounded text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
          onClick={() => {
            setIsExpanded((expanded) => !expanded);
          }}
        >
          <span className={isExpanded ? "inline-block rotate-90" : "inline-block"}>
            ▸
          </span>
        </button>
        <span className="min-w-0 flex-1 font-medium text-zinc-300">
          {isRoot ? "Scene" : `Collection ${listObject.id}`}
        </span>
        <Dropdown
          text="+ Add"
          options={["Quad", "Collection", "Import OBJ"]}
          onSelect={(option) => {
            switch (option) {
              case "Quad": {
                updateListObject(
                  addObjectToList(
                    listObject,
                    {
                      type: "quad",
                      base: new Vector3(0, 0, 0),
                      u: new Vector3(1, 0, 0),
                      v: new Vector3(0, 1, 0),
                      colorIndex: 0,
                      materialName: defaultMaterialName,
                      enabled: true,
                    },
                    nextId,
                    setNextId,
                  ),
                );
                break;
              }
              case "Collection": {
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
              case "Import OBJ": {
                fileInputReference.current?.click();
                break;
              }
            }
          }}
        />
        <button
          type="button"
          aria-label={isRoot ? "Clear scene" : "Remove collection"}
          className="rounded px-1.5 py-0.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-100"
          onClick={() => {
            updateListObject(undefined);
          }}
        >
          ×
        </button>
      </div>
      {importError !== "" && (
        <p className="px-1 py-1 text-xs text-zinc-400" role="alert">
          {importError}
        </p>
      )}
      {isExpanded && (
        <div
          className={
            isRoot
              ? "min-h-0 flex-1 overflow-y-auto pb-1"
              : "space-y-1 pb-1"
          }
        >
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
              defaultMaterialName={defaultMaterialName}
            />
          ))}
        </div>
      )}
    </div>
  );
};
