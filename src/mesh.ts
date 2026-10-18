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

export type SceneObject = {
  toTriangles(): Triangle[];
  render(): ReactNode;
};

export class SceneGroup implements SceneObject {
  public constructor(public children: SceneObject[]) {}

  public toTriangles(): Triangle[] {
    return this.children.flatMap((child) => child.toTriangles());
  }

  public render(): ReactNode {
    return "Todo"
  }
}
