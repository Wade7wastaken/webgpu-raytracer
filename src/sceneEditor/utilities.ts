import type { Dispatch, SetStateAction } from "react";
import type { Vector3 } from "three";

export const addObjectToList = (
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

export type Triangle = {
  vertices: [Vector3, Vector3, Vector3];
  materialIndex: number;
  colorIndex: number;
};

export type ObjectId = number;
export type Transform = {
  position: Vector3;
  rotation: Vector3;
  scale: Vector3;
};

export type BaseSceneObject = {
  id: ObjectId;
  enabled: boolean;
  // transform: Transform;
};

export type QuadSceneObject = BaseSceneObject & {
  type: "quad";
  base: Vector3;
  u: Vector3;
  v: Vector3;
  materialIndex: number;
  colorIndex: number;
};

export type ListSceneObject = BaseSceneObject & {
  type: "list";
  children: SceneObject[];
};

export type SceneObject = QuadSceneObject | ListSceneObject;
export type SceneObjectNoId =
  | Omit<QuadSceneObject, "id">
  | Omit<ListSceneObject, "id">;

export const sceneObjectToTriangles = (
  sceneObject: SceneObject,
): Triangle[] => {
  switch (sceneObject.type) {
    case "list": {
      return sceneObject.children.flatMap((child) =>
        sceneObjectToTriangles(child),
      );
    }
    case "quad": {
      const b = sceneObject.base.clone().add(sceneObject.u);
      const c = sceneObject.base.clone().add(sceneObject.v);
      const d = sceneObject.base.clone().add(sceneObject.u).add(sceneObject.v);

      return [
        {
          vertices: [sceneObject.base, b, c],
          materialIndex: sceneObject.materialIndex,
          colorIndex: sceneObject.colorIndex,
        },
        {
          vertices: [b, c, d],
          materialIndex: sceneObject.materialIndex,
          colorIndex: sceneObject.colorIndex,
        },
      ];
    }
  }
};
