import type { SceneObject, Triangle } from "./mesh";
import type { Vector3 } from "three";

export class Quad implements SceneObject {
  public constructor(
    public base: Vector3,
    public u: Vector3,
    public v: Vector3,
    public materialIndex: number,
    public colorIndex: number,
  ) {}

  public toTriangles(): Triangle[] {
    const b = this.base.clone().add(this.u);
    const c = this.base.clone().add(this.v);
    const d = this.base.clone().add(this.u).add(this.v);
    return [
      {
        vertices: [this.base, b, c],
        materialIndex: this.materialIndex,
        colorIndex: this.colorIndex,
      },
      {
        vertices: [b, c, d],
        materialIndex: this.materialIndex,
        colorIndex: this.colorIndex,
      },
    ];
  }

  public render(): React.ReactNode {
    return (
      <input
        type="number"
        onChange={(event) => {
          this.base.x = Number(event.target.value);
        }}
      ></input>
    );
  }
}
