import computeShader from "./compute.wgsl?raw";

// Inputs:
// point
// normal
// time
// mat_color

// Functions:
// rand
// rand_vec

// Outputs:
// out_color
// ray

// fn scatter(point: vec3f, normal: vec3f, time: f32, mat_color: vec3f) {
//     // stuff here
// }

export type Material = {
  source: string;
  name: string;
};

const FIRST_LINE =
  "fnscatter(point:vec3f,normal:vec3f,time:f32,mat_color:vec3f){";

export const newMaterial = (
  source: string,
  name: string,
): Material | string => {
  const lines = source.split("\n").map((line) => line.trim());
  const first = lines[0];
  const last = lines.at(-1);
  if (first === undefined || last === undefined) {
    return "Empty materials are invalid";
  }
  if (
    !first.startsWith("fn") ||
    !first.endsWith("{") ||
    first.replaceAll(/[ \t]/g, "") !== FIRST_LINE
  ) {
    return "Invalid function definition";
  }
  if (last !== "}") {
    return "Material must end with a closing bracket on its own line";
  }

  return {
    source: lines.slice(1, -1).join("\n"),
    name,
  };
};

export type MaterialList = {
  materials: Material[];
};

export const processShader = (
  materialList: MaterialList,
  presentationFormat: string,
): string => {
  const processedComputeShader = computeShader.replaceAll(
    "${presentationFormat}",
    () => presentationFormat,
  );

  const materialInit = `let point = hitRec.p;
let normal = hitRec.n;
let time = hitRec.t;
let mat_color = u32(hitRec.colorIdx);
switch u32(hitRec.mat) {`;

  const materialSource = materialList.materials
    .map((material, index) => `case ${index}: {\n${material.source}\n}`)
    .join("\n");

  const materialEnd = `default {
return vec3f(1.0, 0.0, 1.0);
}
}`;

  return processedComputeShader.replace(
    "//${materials}",
    () => `${materialInit}\n${materialSource}\n${materialEnd}`,
  );
};
