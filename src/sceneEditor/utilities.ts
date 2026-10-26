import { Euler, Matrix4, Quaternion } from "three";

import type { Material } from "../materials";
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
  materialName: string;
  colorIndex: number;
};

export type IndexedTriangle = {
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
  materialName: string;
  colorIndex: number;
};

export type ListSceneObject = BaseSceneObject & {
  type: "list";
  children: SceneObject[];
};

export type MeshSceneObject = BaseSceneObject & {
  type: "mesh";
  name: string;
  triangles: [Vector3, Vector3, Vector3][];
  transform: Transform;
  materialName: string;
  colorIndex: number;
};

export type SceneObject = QuadSceneObject | ListSceneObject | MeshSceneObject;
export type SceneObjectNoId =
  | Omit<QuadSceneObject, "id">
  | Omit<ListSceneObject, "id">
  | Omit<MeshSceneObject, "id">;

export const sceneObjectToTriangles = (
  sceneObject: SceneObject,
  materials: Material[],
): IndexedTriangle[] => {
  const materialIndices = new Map(
    materials.map((material, index) => [material.name, index] as const),
  );
  const materialIndex = (materialName: string): number => {
    return materialIndices.get(materialName) ?? 0;
  };

  const convertObject = (object: SceneObject): IndexedTriangle[] => {
    switch (object.type) {
      case "list": {
        return object.children.flatMap((element) => convertObject(element));
      }
      case "quad": {
        const b = object.base.clone().add(object.u);
        const c = object.base.clone().add(object.v);
        const d = object.base.clone().add(object.u).add(object.v);

        return [
          {
            vertices: [object.base, b, c],
            materialIndex: materialIndex(object.materialName),
            colorIndex: object.colorIndex,
          },
          {
            vertices: [b, c, d],
            materialIndex: materialIndex(object.materialName),
            colorIndex: object.colorIndex,
          },
        ];
      }
      case "mesh": {
        const { position, rotation, scale } = object.transform;
        const transform = new Matrix4().compose(
          position,
          new Quaternion().setFromEuler(
            new Euler(rotation.x, rotation.y, rotation.z, "XYZ"),
          ),
          scale,
        );

        return object.triangles.map((triangle) => ({
          vertices: triangle.map((vertex) =>
            vertex.clone().applyMatrix4(transform),
          ) as [Vector3, Vector3, Vector3],
          materialIndex: materialIndex(object.materialName),
          colorIndex: object.colorIndex,
        }));
      }
    }
  };

  return convertObject(sceneObject);
};

export const remapSceneMaterials = (
  sceneObject: SceneObject,
  materialNames: string[],
): SceneObject => {
  const materialNameSet = new Set(materialNames);
  const fallbackMaterialName = materialNames[0];

  const resolveName = (materialName: string): string =>
    fallbackMaterialName === undefined || materialNameSet.has(materialName)
      ? materialName
      : fallbackMaterialName;

  const remapObject = (object: SceneObject): SceneObject => {
    switch (object.type) {
      case "list": {
        const children = object.children.map((child) => {
          return remapObject(child);
        });
        return children.every(
          (child, index) => child === object.children[index],
        )
          ? object
          : { ...object, children };
      }
      case "quad": {
        const materialName = resolveName(object.materialName);
        return materialName === object.materialName
          ? object
          : { ...object, materialName };
      }
      case "mesh": {
        const materialName = resolveName(object.materialName);
        return materialName === object.materialName
          ? object
          : { ...object, materialName };
      }
    }
  };

  return remapObject(sceneObject);
};
