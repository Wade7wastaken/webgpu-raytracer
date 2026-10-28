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

const MAT_FIRST_LINE =
  "fnscatter(ray:Ray,point:vec3f,normal:vec3f,ray_time:f32,mat_data:f32){";

const SKY_FIRST_LINE = "fnsky(ray:Ray){";

const defaultSky = `fn sky(ray: Ray) {
    let unit_dir = normalize(ray.dir);
    let a = 0.5 * (unit_dir.y + 1.0);
    return ray_color * ((1.0-a)*vec3f(1.0, 1.0, 1.0) + a*vec3f(0.3, 0.7, 1.0));
}`;

const formatMaterialSource = (source: string): string => {
  const lines = source
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "" && !line.startsWith("//"));
  const first = lines[0];
  const last = lines.at(-1);
  if (first === undefined || last === undefined) {
    return "Empty materials are invalid";
  }
  if (
    !first.endsWith("{") ||
    first.replaceAll(/[ \t]/g, "") !== MAT_FIRST_LINE
  ) {
    return "Invalid function definition";
  }
  if (last !== "}") {
    return "Material must end with a closing bracket on its own line";
  }

  return lines
    .slice(1, -1)
    .map((l) =>
      l
        .replaceAll("rand()", "rand(state)")
        .replaceAll("rand_vec()", "rand_vec(state)")
        .replaceAll("rand_normal_vec()", "rand_normal_vec(state)"),
    )
    .join("\n");
};

const formatSkySource = (source: string): string => {
  const lines = source
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "" && !line.startsWith("//"));
  const first = lines[0];
  const last = lines.at(-1);
  if (first === undefined || last === undefined) {
    return "Empty materials are invalid";
  }
  if (
    !first.endsWith("{") ||
    first.replaceAll(/[ \t]/g, "") !== SKY_FIRST_LINE
  ) {
    return "Invalid function definition";
  }
  if (last !== "}") {
    return "Material must end with a closing bracket on its own line";
  }

  return lines
    .slice(1, -1)
    .map((l) =>
      l
        .replaceAll("rand()", "rand(state)")
        .replaceAll("rand_vec()", "rand_vec(state)")
        .replaceAll("rand_normal_vec()", "rand_normal_vec(state)"),
    )
    .join("\n");
};

export type MaterialList = {
  materials: Material[];
};

export type ShaderCompileResult = {
  status: "idle" | "passed" | "failed";
  message: string;
};

export const defaultNewMaterial = `fn scatter(ray: Ray, point: vec3f, normal: vec3f, ray_time: f32, mat_data: f32) {

}`;

export const initialMaterials: MaterialList = {
  materials: [
    {
      name: "Lambertian",
      source: `// Edit your material's scatter function here!
// Make sure you don't change the function's signature.

// If you want the ray to keep bouncing, multiply \`ray_color\` and set \`ray\` to the new ray.
// If you want to stop the ray, return the final color.
// The scatter function also comes with a mat_data parameter set differently for each object.

// use \`rand()\`, \`rand_vec()\`, and \`rand_normal_vec()\` for randomness.

fn scatter(ray: Ray, point: vec3f, normal: vec3f, ray_time: f32, mat_data: f32) {
    let colors = array(vec3f(0.73, 0.73, 0.73), vec3f(0.65, 0.05, 0.05), vec3f(0.12, 0.45, 0.15));

    var scatter_dir = normal + rand_normal_vec();
    if (abs(scatter_dir.x) < 1e-6 && abs(scatter_dir.y) < 1e-6 && abs(scatter_dir.z) < 1e-6) {
        scatter_dir = normal;
    }
    ray_color *= colors[u32(mat_data)];
    ray = Ray(point, scatter_dir);
}`,
    },
    {
      name: "Emissive",
      source: `fn scatter(ray: Ray, point: vec3f, normal: vec3f, ray_time: f32, mat_data: f32) {
    return ray_color * vec3f(1.0, 193.0 / 255.0, 104.0 / 255.0) * 15f;
}`,
    },
    {
      name: "Sky",
      source: defaultSky,
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
    .map((material, index) =>
      material.name === "Sky"
        ? ""
        : `case ${index}: {\n${formatMaterialSource(material.source)}\n}`,
    )
    .join("\n");

  const materialEnd = `default {
return vec3f(1.0, 0.0, 1.0);
}
}`;

  const skySource =
    materialList.materials.find((m) => m.name === "Sky")?.source ?? defaultSky;

  const sky = formatSkySource(skySource);

  const result = processedComputeShader
    .replace(
      "//${materials}",
      () => `${materialInit}\n${materialSource}\n${materialEnd}`,
    )
    .replace("//${sky}", () => sky);

  return result;
};
