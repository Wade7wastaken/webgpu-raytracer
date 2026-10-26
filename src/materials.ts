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

export type ShaderCompileResult = {
  status: "idle" | "passed" | "failed";
  message: string;
};

export const initialMaterials: MaterialList = {
  materials: [
    {
      name: "lambertian",
      source: `var scatter_dir = hit_rec.n + rand_normal_vector(state);
if (abs(scatter_dir.x) < 1e-6 && abs(scatter_dir.y) < 1e-6 && abs(scatter_dir.z) < 1e-6) {
    scatter_dir = hit_rec.n;
}
let colors = array(vec3f(0.73, 0.73, 0.73), vec3f(0.65, 0.05, 0.05), vec3f(0.12, 0.45, 0.15));
ray_color *= colors[u32(hit_rec.color_idx)];
ray = Ray(hit_rec.p, scatter_dir);`,
    },
    {
      name: "light",
      source: "return ray_color * vec3f(1.0, 193.0 / 255.0, 104.0 / 255.0) * 15f;",
    },
  ],
};

export const processShader = (
  materialList: MaterialList,
  presentationFormat: string,
): string => {
  const processedComputeShader = computeShader.replaceAll(
    "${presentationFormat}",
    () => presentationFormat,
  );

  const materialInit = `let point = hit_rec.p;
let normal = hit_rec.n;
let time = hit_rec.t;
let mat_color = u32(hit_rec.color_idx);
switch u32(hit_rec.mat) {`;

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
