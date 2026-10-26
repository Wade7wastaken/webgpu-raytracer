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

export type Material = {
  source: string;
  name: string;
};

const FIRST_LINE =
  "fnscatter(point:vec3f,normal:vec3f,ray_time:f32,mat_data:f32){";

const formatMaterialSource = (source: string): string => {
  const lines = source
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "" && !line.startsWith("//"));
  console.log(lines);
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

  return lines.slice(1, -1).join("\n");
};

export type MaterialList = {
  materials: Material[];
};

export type ShaderCompileResult = {
  status: "idle" | "passed" | "failed";
  message: string;
};

export const defaultNewMaterial = `fn scatter(point: vec3f, normal: vec3f, ray_time: f32, mat_data: f32) {

}`;

export const initialMaterials: MaterialList = {
  materials: [
    {
      name: "lambertian",
      source: `// Edit your material's scatter function here!
// Make sure you don't change the function's signature.

// If you want the ray to keep bouncing, multiply \`ray_color\` and set \`ray\` to the new ray.
// If you want to stop the ray, return the final color.
// The scatter function also comes with a mat_data parameter set differently for each object.

fn scatter(point: vec3f, normal: vec3f, ray_time: f32, mat_data: f32) {
    let colors = array(vec3f(0.73, 0.73, 0.73), vec3f(0.65, 0.05, 0.05), vec3f(0.12, 0.45, 0.15));

    var scatter_dir = normal + rand_normal_vector(state);
    if (abs(scatter_dir.x) < 1e-6 && abs(scatter_dir.y) < 1e-6 && abs(scatter_dir.z) < 1e-6) {
        scatter_dir = normal;
    }
    ray_color *= colors[u32(mat_data)];
    ray = Ray(point, scatter_dir);
}`,
    },
    {
      name: "light",
      source: `fn scatter(point: vec3f, normal: vec3f, ray_time: f32, mat_data: f32) {
    return ray_color * vec3f(1.0, 193.0 / 255.0, 104.0 / 255.0) * 15f;
}`,
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
let ray_time = hit_rec.t;
let mat_data = hit_rec.color_idx;
switch u32(hit_rec.mat) {`;

  const materialSource = materialList.materials
    .map((material) => formatMaterialSource(material.source))
    .map((source, index) => `case ${index}: {\n${source}\n}`)
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
