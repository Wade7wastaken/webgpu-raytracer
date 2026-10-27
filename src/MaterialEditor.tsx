import { Editor } from "@monaco-editor/react";
import { useState, type FC } from "react";

import {
  defaultNewMaterial,
  type MaterialList,
  type ShaderCompileResult,
} from "./materials";

type Properties = {
  materials: MaterialList;
  compileResult: ShaderCompileResult;
  onMaterialsChange: (materials: MaterialList) => void;
};

export const MaterialEditor: FC<Properties> = ({
  materials,
  compileResult,
  onMaterialsChange,
}) => {
  const [selectedMaterial, setSelectedMaterial] = useState(
    materials.materials[0]?.name ?? "",
  );
  const selected = materials.materials.find(
    (material) => material.name === selectedMaterial,
  );

  const addMaterial = (): void => {
    let name: string | undefined | null;
    const shouldTryAgain = (name: string | undefined | null): boolean => {
      if (name == undefined) {
        alert("You must enter a material name.");
        return true;
      }
      const isTaken = materials.materials.some(
        (material) => material.name === name,
      );
      if (isTaken) {
        alert("Material names must be unique.");
      }
      return isTaken;
    };

    do {
      name = prompt("Enter a name for the material:");
    } while (shouldTryAgain(name));

    if (name === "" || name == undefined) {
      name = "Material";
    }

    const material = { name, source: defaultNewMaterial };
    onMaterialsChange({ materials: [...materials.materials, material] });
    setSelectedMaterial(name);
  };

  const deleteMaterial = (): void => {
    if (materials.materials.length <= 1) {
      return;
    }

    const selectedIndex = materials.materials.findIndex(
      (material) => material.name === selectedMaterial,
    );
    if (selectedIndex === -1 || materials.materials[selectedIndex]?.name === "Sky") {
      return;
    }

    const nextMaterials = materials.materials.filter(
      (material) => material.name !== selectedMaterial,
    );
    const nextIndex = Math.min(selectedIndex, nextMaterials.length - 1);
    const nextMaterial = nextMaterials[nextIndex];
    if (nextMaterial === undefined) {
      return;
    }

    onMaterialsChange({ materials: nextMaterials });
    setSelectedMaterial(nextMaterial.name);
  };

  const statusLabel = {
    idle: "WAITING",
    passed: "PASS",
    failed: "FAIL",
  }[compileResult.status];
  const statusClass = {
    idle: "bg-zinc-800 text-zinc-300",
    passed: "bg-emerald-950 text-emerald-300",
    failed: "bg-red-950 text-red-300",
  }[compileResult.status];

  return (
    <div className="flex h-full min-h-0 gap-2">
      <section className="flex min-h-0 min-w-32 basis-1/6 flex-col overflow-hidden rounded-md border border-zinc-800 bg-zinc-950">
        <div className="flex h-8 shrink-0 items-center justify-between border-b border-zinc-800 px-2">
          <h2 className="text-xs font-medium tracking-wide text-zinc-400">
            Materials
          </h2>
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label="Add material"
              title="Add material"
              className="size-5 rounded text-sm text-zinc-200 hover:cursor-pointer hover:bg-zinc-700"
              onClick={addMaterial}
            >
              +
            </button>
            <button
              type="button"
              aria-label="Delete selected material"
              title="Delete selected material"
              disabled={materials.materials.length <= 1}
              className="size-5 rounded text-sm text-zinc-300 hover:cursor-pointer hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-40"
              onClick={deleteMaterial}
            >
              ×
            </button>
          </div>
        </div>
        <div className="min-h-0 flex-1 space-y-1 overflow-y-auto p-1">
          {materials.materials.map((material) => {
            const isSelected = material.name === selectedMaterial;
            return (
              <button
                key={material.name}
                type="button"
                aria-pressed={isSelected}
                className={`w-full truncate rounded px-2 py-1.5 text-left text-xs ${isSelected ? "bg-zinc-800 text-zinc-100" : "text-zinc-400 hover:cursor-pointer hover:bg-zinc-900 hover:text-zinc-200"}`}
                onClick={() => {
                  setSelectedMaterial(material.name);
                }}
              >
                {material.name}
              </button>
            );
          })}
        </div>
      </section>

      <section className="min-h-0 min-w-0 grow overflow-hidden rounded-md border border-zinc-800 bg-zinc-950">
        <Editor
          value={selected?.source ?? ""}
          defaultLanguage="wgsl"
          theme="vs-dark"
          height="100%"
          options={{
            automaticLayout: true,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            fontSize: 13,
            padding: { top: 8, bottom: 8 },
          }}
          onChange={(value) => {
            if (typeof value !== "string" || selected === undefined) {
              return;
            }

            onMaterialsChange({
              materials: materials.materials.map((material) =>
                material.name === selectedMaterial
                  ? { ...material, source: value }
                  : material,
              ),
            });
          }}
        />
      </section>

      <section
        className={`flex min-h-0 min-w-40 flex-col overflow-hidden rounded-md border border-zinc-800 bg-zinc-950 ${compileResult.status === "failed" ? "basis-1/4" : "basis-1/6"}`}
      >
        <div className="flex h-8 shrink-0 items-center justify-between border-b border-zinc-800 px-3">
          <h2 className="text-xs font-medium tracking-wide text-zinc-400">
            Shader status
          </h2>
          <span
            className={`rounded px-2 py-1 text-xs font-semibold tracking-wide ${statusClass}`}
          >
            {statusLabel}
          </span>
        </div>
        <pre className="min-h-0 flex-1 overflow-auto p-3 font-mono text-xs leading-relaxed wrap-break-word whitespace-pre-wrap text-zinc-300">
          {compileResult.message}
        </pre>
      </section>
    </div>
  );
};
