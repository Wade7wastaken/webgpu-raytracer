import type { ReactNode } from "react";
import type { Vector3 } from "three";

export type Triangle = {
  vertices: [Vector3, Vector3, Vector3];
  materialIndex: number;
  colorIndex: number;
};

export class Mesh {
  public static triangle(
    a: Vector3,
    b: Vector3,
    c: Vector3,
    materialIndex?: number,
    colorIndex?: number,
  ): Mesh {
    return new Mesh([
      {
        vertices: [a, b, c],
        materialIndex: materialIndex ?? 0,
        colorIndex: colorIndex ?? 0,
      },
    ]);
  }

  public static quad(
    base: Vector3,
    u: Vector3,
    v: Vector3,
    materialIndex = 0,
    colorIndex = 0,
  ): Mesh {
    const b = base.clone().add(u);
    const c = base.clone().add(v);
    const d = base.clone().add(u).add(v);

    return new Mesh([
      { vertices: [base, b, c], materialIndex, colorIndex },
      { vertices: [b, c, d], materialIndex, colorIndex },
    ]);
  }

  public triangles: Triangle[];

  public constructor(...children: (Mesh | Triangle[])[]) {
    this.triangles = children.flatMap((mesh) =>
      Array.isArray(mesh) ? mesh : mesh.triangles,
    );
  }
}

// export type SceneObject = {
//   toTriangles(): Triangle[];
//   render(): ReactNode;
// };

// export class SceneGroup implements SceneObject {
//   public constructor(public children: SceneObject[]) {}

//   public toTriangles(): Triangle[] {
//     return this.children.flatMap((child) => child.toTriangles());
//   }

//   public render(): ReactNode {
//     return "Todo";
//   }
// }

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
export type SceneObjectNoId = Omit<QuadSceneObject, "id"> | Omit<ListSceneObject, "id">;

// export const objectStore = create<{
//   sceneObjects: Record<ObjectId, SceneObject>;
//   nextId: number;
//   addObject: (object: SceneObject) => number;
// }>((set, get) => ({
//   sceneObjects: {},
//   nextId: 0,
//   addObject: (object): number => {
//     const thisId = get().nextId;
//     set((state) => ({
//       nextId: thisId + 1,
//       sceneObjects: {
//         ...state.sceneObjects,
//         [thisId]: { ...object, id: thisId },
//       },
//     }));
//     return thisId;
//   },
// }));

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
