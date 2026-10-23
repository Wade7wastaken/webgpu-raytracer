import { Editor } from "@monaco-editor/react";
import { useEffect, useRef, useState, type FC } from "react";

import type { MaterialList } from "./materials";
import type { editor } from "monaco-editor";

type Properties = {
  setMaterialsReference: (materials: MaterialList) => void;
};

export const MaterialEditor: FC<Properties> = ({ setMaterialsReference }) => {
  const [materials, setMaterials] = useState<MaterialList>({
    materials: [
      {
        name: "lambertian",
        source: `var scatter_dir = hitRec.n + randNormalVector(state);
if (abs(scatter_dir.x) < 1e-6 && abs(scatter_dir.y) < 1e-6 && abs(scatter_dir.z) < 1e-6) {
    scatter_dir = hitRec.n;
}
let colors = array(vec3f(0.73, 0.73, 0.73), vec3f(0.65, 0.05, 0.05), vec3f(0.12, 0.45, 0.15));
rayColor *= colors[u32(hitRec.colorIdx)];
ray = Ray(hitRec.p, scatter_dir);
            `,
      },
      {
        name: "light",
        source: `return rayColor * vec3f(1.0, 193.0 / 255.0, 104.0 / 255.0) * 15f;`,
      },
    ],
  });

  const firstMat = materials.materials[0];

  if (firstMat === undefined) {
    throw new Error("no first mat");
  }

  const [selectedMaterial, setSelectedMaterial] = useState(firstMat.name);

  useEffect(() => {
    setMaterialsReference(materials);
  }, [setMaterialsReference, materials]);

  const editorReference = useRef<editor.IStandaloneCodeEditor>(undefined);

  const justSwitchedReference = useRef(false);

  return (
    <div className="flex gap-4 grow">
      <div className="w-1/6">
        {materials.materials.map((mat) => {
          return (
            <p
              key={mat.name}
              onClick={() => {
                setSelectedMaterial(mat.name);
                justSwitchedReference.current = true;
                editorReference.current?.setValue(mat.source);
              }}
            >
              {mat.name}
            </p>
          );
        })}
      </div>
      <Editor
        defaultValue={
          materials.materials.find((m) => m.name === selectedMaterial)?.source
        }
        defaultLanguage="wgsl"
        height="40vh"
        className="border"
        onMount={(editor) => {
          editorReference.current = editor;
        }}
        onChange={(value) => {
          if (justSwitchedReference.current) {
            justSwitchedReference.current = false;
            return;
          }
          if (typeof value !== "string") {
            return;
          }

          const index = materials.materials.findIndex(
            (m) => m.name === selectedMaterial,
          );
          const material = materials.materials[index];
          if (material === undefined) {
            return;
          }
          setMaterials({
            materials: [
              ...materials.materials.slice(0, index),
              { ...material, source: value },
              ...materials.materials.slice(index + 1),
            ],
          });
        }}
      />
    </div>
  );
};
