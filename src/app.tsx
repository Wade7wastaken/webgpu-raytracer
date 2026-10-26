import { useCallback, useEffect, useRef, useState, type FC } from "react";
import { Vector3 } from "three";
import { makeShaderDataDefinitions, makeStructuredView } from "webgpu-utils";

import { MaterialEditor } from "./materialEditor";
import {
  initialMaterials,
  processShader,
  type MaterialList,
  type ShaderCompileResult,
} from "./materials";
import { MainEditor } from "./sceneEditor/sceneEditor";
import {
  sceneObjectToTriangles,
  type SceneObject,
  type IndexedTriangle,
} from "./sceneEditor/utilities";

const TRIANGLE_FLOAT_COUNT = 16;

const fail = (message: string): void => {
  alert(message);
};

const formatTriangle = ({
  vertices,
  materialIndex,
  colorIndex,
}: IndexedTriangle): number[] => {
  const a = vertices[0];
  const b = vertices[1];
  const c = vertices[2];
  const edge1 = b.clone().sub(a);
  const edge2 = c.clone().sub(a);
  const outwardNormal = edge1.clone().cross(edge2).normalize();
  return [
    ...a,
    materialIndex,
    ...edge1,
    colorIndex,
    ...edge2,
    0,
    ...outwardNormal,
    0,
  ];
};

const formatTriangles = (triangles: IndexedTriangle[]): Float32Array => {
  const buffer = [];
  for (const triangle of triangles) {
    buffer.push(...formatTriangle(triangle));
  }
  return new Float32Array(buffer);
};

const App: FC = () => {
  type Keys = {
    W: boolean;
    A: boolean;
    S: boolean;
    D: boolean;
    Space: boolean;
    Shift: boolean;
  };
  const canvasReference = useRef<HTMLCanvasElement>(null);
  const cameraPositionReference = useRef<Vector3>(new Vector3(0.5, 0.5, 0.4));
  const yawReference = useRef(Math.PI / 2);
  const pitchReference = useRef(0);
  const keysReference = useRef<Keys>({
    W: false,
    A: false,
    S: false,
    D: false,
    Space: false,
    Shift: false,
  });

  const [fps, setFps] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [raysPerPixel, setRaysPerPixel] = useState(10);
  const [maxBounces, setMaxBounces] = useState(10);
  const [materials, setMaterials] = useState<MaterialList>(initialMaterials);
  const [compileResult, setCompileResult] = useState<ShaderCompileResult>({
    status: "idle",
    message: "No compile result yet",
  });
  const isRunningReference = useRef(false);

  const raysPerPixelReference = useRef(10);
  const maxBouncesReference = useRef(10);

  const defaultPresentationFormat = "bgra8unorm";
  const materialsReference = useRef<MaterialList>(initialMaterials);
  const presentationFormatReference = useRef<GPUTextureFormat>(
    defaultPresentationFormat,
  );
  const shaderSourceReference = useRef<string>(
    processShader(initialMaterials, defaultPresentationFormat),
  );
  const shaderStaleReference = useRef(false);
  const shaderCompileVersionReference = useRef(0);

  const sceneReference = useRef<SceneObject>({
    type: "list",
    id: 0,
    children: [],
    enabled: true,
  }); // main source of truth for the scene
  const sceneTriangles = useRef(formatTriangles([]));
  const sceneStale = useRef(false);

  useEffect(() => {
    const canceledReference = { current: false };
    let rafId: number | undefined;
    let device: GPUDevice | undefined;

    const setupRenderer = async (): Promise<void> => {
      console.log("starting setup");
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (navigator.gpu == undefined) {
        fail("GPU not available on this browser");
      }

      const adapter = await navigator.gpu.requestAdapter({
        powerPreference: "high-performance",
      });
      if (adapter == undefined) {
        fail("need a browser that supports WebGPU");
        return;
      }

      const hasBGRA8unormStorage = adapter.features.has("bgra8unorm-storage");

      const newDevice = await adapter.requestDevice({
        requiredFeatures: hasBGRA8unormStorage ? ["bgra8unorm-storage"] : [],
      });

      if (canceledReference.current) {
        newDevice.destroy();
        return;
      }
      device = newDevice;

      // ---NO ASYNC AFTER CANCEL---

      if (canvasReference.current == undefined) {
        fail("couldn't find canvas");
        return;
      }

      const context = canvasReference.current.getContext("webgpu");

      if (context == undefined) {
        fail("couldn't create context");
        return;
      }

      presentationFormatReference.current = hasBGRA8unormStorage
        ? navigator.gpu.getPreferredCanvasFormat()
        : "rgba8unorm";

      const fromStorage = localStorage.getItem("presentationFormat");
      if (fromStorage != undefined) {
        presentationFormatReference.current = fromStorage as GPUTextureFormat;
      }

      context.configure({
        device,
        format: presentationFormatReference.current,
        // This is what's required to be able to write to a texture from a compute shader
        usage:
          GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.STORAGE_BINDING,
      });

      console.log(presentationFormatReference.current);
      console.log(context.getConfiguration()?.viewFormats);

      let module = device.createShaderModule({
        code: shaderSourceReference.current,
      });

      const shaderDefinitions = makeShaderDataDefinitions(
        shaderSourceReference.current,
      );
      const uniformDefinitions = shaderDefinitions.uniforms.uniforms;
      if (uniformDefinitions === undefined) {
        fail("no uniform type definitions");
        return;
      }

      const uniformsData = makeStructuredView(uniformDefinitions);

      const uniformBuffer = device.createBuffer({
        size: uniformsData.arrayBuffer.byteLength,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      });

      let triangleBuffer = device.createBuffer({
        size: Math.max(sceneTriangles.current.byteLength, 64),
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
      });

      device.queue.writeBuffer(triangleBuffer, 0, sceneTriangles.current);

      let pipeline = device.createComputePipeline({
        label: "pipeline",
        layout: "auto",
        compute: {
          module,
          entryPoint: "cs",
        },
      });

      let bindGroupLayout = pipeline.getBindGroupLayout(0);
      setCompileResult({
        status: "passed",
        message: "Shader compiled correctly",
      });

      const setUniforms = (
        canvasWidth: number,
        canvasHeight: number,
        time: number,
        deltaTime: number,
        device: GPUDevice,
      ): void => {
        const fov = 40;
        const focalLength = 1;
        const vup = new Vector3(0, 1, 0);

        const theta = (fov / 180) * Math.PI;
        const h = Math.tan(theta / 2);
        const viewportHeight = 2 * h * focalLength;
        const viewportWidth = viewportHeight * (canvasWidth / canvasHeight);

        const directionX =
          Math.cos(yawReference.current) * Math.cos(pitchReference.current);
        const directionY = Math.sin(pitchReference.current);
        const directionZ =
          Math.sin(yawReference.current) * Math.cos(pitchReference.current);

        const w = new Vector3(directionX, directionY, directionZ).normalize();
        const u = vup.clone().cross(w).normalize();
        const v = w.clone().cross(u);
        const forward = new Vector3(-directionX, 0, -directionZ).normalize();
        const right = w.clone().cross(vup).normalize();

        const camSpeed = 0.001 * deltaTime;

        if (keysReference.current.W) {
          cameraPositionReference.current.add(
            forward.clone().multiplyScalar(camSpeed),
          );
        }
        if (keysReference.current.S) {
          cameraPositionReference.current.sub(
            forward.clone().multiplyScalar(camSpeed),
          );
        }
        if (keysReference.current.A) {
          cameraPositionReference.current.add(
            right.clone().multiplyScalar(camSpeed),
          );
        }
        if (keysReference.current.D) {
          cameraPositionReference.current.sub(
            right.clone().multiplyScalar(camSpeed),
          );
        }
        if (keysReference.current.Space) {
          cameraPositionReference.current.add(
            vup.clone().multiplyScalar(camSpeed),
          );
        }
        if (keysReference.current.Shift) {
          cameraPositionReference.current.sub(
            vup.clone().multiplyScalar(camSpeed),
          );
        }

        const camera_center = cameraPositionReference.current.clone();

        const viewportU = u.clone().multiplyScalar(viewportWidth);
        const viewportV = v.negate().clone().multiplyScalar(viewportHeight);

        const pixelDeltaU = viewportU.clone().divideScalar(canvasWidth);
        const pixelDeltaV = viewportV.clone().divideScalar(canvasHeight);

        const viewportUpperLeft = camera_center
          .clone()
          .sub(w.clone().multiplyScalar(focalLength))
          .sub(viewportU.clone().divideScalar(2))
          .sub(viewportV.clone().divideScalar(2));

        const pixel00Location = viewportUpperLeft
          .clone()
          .add(pixelDeltaU.clone().add(pixelDeltaV).multiplyScalar(0.5));

        if (sceneStale.current) {
          sceneTriangles.current = formatTriangles(
            sceneObjectToTriangles(
              sceneReference.current,
              materialsReference.current.materials,
            ),
          );
          if (triangleBuffer.size < sceneTriangles.current.byteLength) {
            triangleBuffer.destroy();
            triangleBuffer = device.createBuffer({
              size: Math.max(sceneTriangles.current.byteLength, 64),
              usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
            });
          }
          device.queue.writeBuffer(triangleBuffer, 0, sceneTriangles.current);
          sceneStale.current = false;
        }

        uniformsData.set({
          pixel00_loc: pixel00Location.toArray(),
          pixel_delta: [...pixelDeltaU, 0, ...pixelDeltaV, 0],
          camera_center: camera_center.toArray(),
          time,
          rays_per_pixel: raysPerPixelReference.current,
          max_bounces: maxBouncesReference.current,
          num_tris: sceneTriangles.current.length / TRIANGLE_FLOAT_COUNT,
        });
      };

      const now = performance.now();

      const startTime = now;
      let lastTime = now;
      let lastFpsUpdate = now;
      let fpsUpdateFrameCount = 0;
      let wasRunning = false;

      function render(now: DOMHighResTimeStamp): void {
        if (
          canceledReference.current ||
          device == undefined ||
          context == undefined
        ) {
          return;
        }

        if (shaderStaleReference.current) {
          shaderStaleReference.current = false;
          const compileVersion = ++shaderCompileVersionReference.current;

          void (async (): Promise<void> => {
            shaderSourceReference.current = processShader(
              materialsReference.current,
              presentationFormatReference.current,
            );

            device.pushErrorScope("validation");
            const newModule = device.createShaderModule({
              code: shaderSourceReference.current,
            });

            const error = await device.popErrorScope();
            if (
              canceledReference.current ||
              compileVersion !== shaderCompileVersionReference.current
            ) {
              return;
            }

            if (error == undefined) {
              module = newModule;
              pipeline = device.createComputePipeline({
                label: "pipeline",
                layout: "auto",
                compute: {
                  module,
                  entryPoint: "cs",
                },
              });

              bindGroupLayout = pipeline.getBindGroupLayout(0);
              setCompileResult({
                status: "passed",
                message: "Shader compiled correctly",
              });
            } else {
              const info = await newModule.getCompilationInfo();
              if (compileVersion !== shaderCompileVersionReference.current) {
                return;
              }
              const message = info.messages
                .toSorted((a, b) => b.lineNum - a.lineNum)
                .map((entry) => entry.message)
                .filter((entry) => entry.length > 0)
                .join("\n")
                .trim();

              setCompileResult({
                status: "failed",
                message: message || error.message,
              });
            }
          })();
        }

        if (!isRunningReference.current) {
          wasRunning = false;
          rafId = requestAnimationFrame(render);
          return;
        }

        if (!wasRunning) {
          wasRunning = true;
          lastTime = now;
          lastFpsUpdate = now;
          fpsUpdateFrameCount = 0;
        }

        // timing and fps logic
        const deltaTime = now - lastTime;
        lastTime = now;
        fpsUpdateFrameCount += 1;
        const elapsed = now - lastFpsUpdate;
        if (elapsed >= 500) {
          setFps(fpsUpdateFrameCount / (elapsed / 1000));
          fpsUpdateFrameCount = 0;
          lastFpsUpdate = now;
        }

        const canvasTexture = context.getCurrentTexture();

        setUniforms(
          canvasTexture.width,
          canvasTexture.height,
          (now - startTime) / 1000,
          deltaTime,
          device,
        );
        device.queue.writeBuffer(uniformBuffer, 0, uniformsData.arrayBuffer);

        const bindGroup = device.createBindGroup({
          layout: bindGroupLayout,
          entries: [
            { binding: 0, resource: canvasTexture.createView() },
            { binding: 1, resource: { buffer: uniformBuffer } },
            { binding: 2, resource: { buffer: triangleBuffer } },
          ],
          label: "bindGroup0",
        });

        const encoder = device.createCommandEncoder({ label: "our encoder" });
        const pass = encoder.beginComputePass();
        pass.setPipeline(pipeline);
        pass.setBindGroup(0, bindGroup);
        pass.dispatchWorkgroups(
          Math.ceil(canvasTexture.width / 16),
          Math.ceil(canvasTexture.height / 16),
        );
        pass.end();

        const commandBuffer = encoder.finish();
        device.queue.submit([commandBuffer]);

        rafId = requestAnimationFrame(render);
      }

      rafId = requestAnimationFrame(render);
    };

    void setupRenderer();

    return (): void => {
      canceledReference.current = true;
      shaderCompileVersionReference.current += 1;
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
      if (device) {
        device.destroy();
      }
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      switch (event.key.toLowerCase()) {
        case "w": {
          keysReference.current.W = true;
          break;
        }
        case "s": {
          keysReference.current.S = true;
          break;
        }
        case "a": {
          keysReference.current.A = true;
          break;
        }
        case "d": {
          keysReference.current.D = true;
          break;
        }
        case " ": {
          if (document.pointerLockElement != undefined) {
            event.preventDefault();
          }
          keysReference.current.Space = true;
          break;
        }
        case "shift": {
          keysReference.current.Shift = true;
          break;
        }
      }
    };

    const onKeyUp = (event: KeyboardEvent): void => {
      switch (event.key.toLowerCase()) {
        case "w": {
          keysReference.current.W = false;
          break;
        }
        case "s": {
          keysReference.current.S = false;
          break;
        }
        case "a": {
          keysReference.current.A = false;
          break;
        }
        case "d": {
          keysReference.current.D = false;
          break;
        }
        case " ": {
          keysReference.current.Space = false;
          break;
        }
        case "shift": {
          keysReference.current.Shift = false;
          break;
        }
      }
    };

    const sensitivity = 0.001;

    const updateMousePosition = (event: MouseEvent): void => {
      yawReference.current += event.movementX * sensitivity;
      pitchReference.current += event.movementY * sensitivity;
    };

    const onLockChangeAlert = (): void => {
      if (document.pointerLockElement === canvasReference.current) {
        document.addEventListener("mousemove", updateMousePosition);
      } else {
        document.removeEventListener("mousemove", updateMousePosition);
      }
    };

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("keyup", onKeyUp);
    document.addEventListener("pointerlockchange", onLockChangeAlert);
    return (): void => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("keyup", onKeyUp);
      document.removeEventListener("pointerlockchange", onLockChangeAlert);
    };
  }, []);

  const updateSceneReference = useCallback((patch: SceneObject): void => {
    sceneReference.current = patch;
    sceneStale.current = true;
    sceneTriangles.current = formatTriangles(
      sceneObjectToTriangles(patch, materialsReference.current.materials),
    );
  }, []);

  const updateMaterials = useCallback((patch: MaterialList): void => {
    const previousMaterials = materialsReference.current.materials;
    const hasMaterialOrderChanged =
      previousMaterials.length !== patch.materials.length ||
      patch.materials.some(
        (material, index) => previousMaterials[index]?.name !== material.name,
      );

    setMaterials(patch);
    materialsReference.current = patch;
    shaderStaleReference.current = true;
    shaderCompileVersionReference.current += 1;
    shaderSourceReference.current = processShader(
      patch,
      presentationFormatReference.current,
    );
    if (!hasMaterialOrderChanged) {
      return;
    }

    sceneTriangles.current = formatTriangles(
      sceneObjectToTriangles(sceneReference.current, patch.materials),
    );
    sceneStale.current = true;
  }, []);

  return (
    <div className="flex h-dvh flex-col gap-2 overflow-hidden bg-zinc-950 p-3 text-zinc-100 scheme-dark">
      <header className="flex h-12 items-center gap-12 rounded-md border border-zinc-800 bg-zinc-900 px-3">
        <div className="flex gap-2">
          <button
            type="button"
            aria-pressed={isRunning}
            className={`rounded px-2 py-1 text-xs font-medium ${isRunning ? "bg-zinc-800 text-zinc-400" : "bg-zinc-200 text-zinc-950 hover:bg-white hover:cursor-pointer"}`}
            onClick={() => {
              isRunningReference.current = true;
              setIsRunning(true);
            }}
          >
            Start
          </button>
          <button
            type="button"
            aria-pressed={!isRunning}
            className={`rounded px-2 py-1 text-xs font-medium ${isRunning ? "bg-zinc-200 text-zinc-950 hover:bg-white hover:cursor-pointer" : "bg-zinc-800 text-zinc-400"}`}
            onClick={() => {
              isRunningReference.current = false;
              setIsRunning(false);
            }}
          >
            Stop
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-zinc-400">FPS</span>
          <span className="w-10 text-right font-mono text-zinc-200 tabular-nums">
            {fps.toFixed(2)}
          </span>
        </div>

        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-xs">
            <span className="whitespace-nowrap text-zinc-400">
              Rays / pixel
            </span>
            <span className="w-7 text-right font-mono text-zinc-200 tabular-nums">
              {raysPerPixel}
            </span>
            <input
              className="h-2 w-28 cursor-pointer appearance-none rounded-full bg-zinc-700 accent-zinc-300 focus-visible:outline-2 focus-visible:outline-zinc-500"
              type="range"
              min={1}
              max={100}
              step={1}
              value={raysPerPixel}
              onChange={(event) => {
                const value = Number.parseInt(event.target.value);
                raysPerPixelReference.current = value;
                setRaysPerPixel(value);
              }}
            />
          </label>
          <label className="flex items-center gap-2 text-xs">
            <span className="whitespace-nowrap text-zinc-400">
              Bounce depth
            </span>
            <span className="w-7 text-right font-mono text-zinc-200 tabular-nums">
              {maxBounces}
            </span>
            <input
              className="h-2 w-28 cursor-pointer appearance-none rounded-full bg-zinc-700 accent-zinc-300 focus-visible:outline-2 focus-visible:outline-zinc-500"
              type="range"
              min={1}
              max={100}
              step={1}
              value={maxBounces}
              onChange={(event) => {
                const value = Number.parseInt(event.target.value);
                maxBouncesReference.current = value;
                setMaxBounces(value);
              }}
            />
          </label>
        </div>
      </header>

      <div className="flex min-h-0 grow basis-3/5 gap-2">
        <section className="min-h-0 min-w-0 basis-2/3 rounded-md border border-zinc-800 bg-zinc-900 p-2 flex justify-center-safe items-center-safe">
            <canvas
              ref={canvasReference}
              className="block max-h-full max-w-full rounded border border-zinc-700 bg-black object-contain"
              width={(720 * 16) / 9}
              height={720}
              onClick={() => {
                void (async (): Promise<void> => {
                  if (
                    !document.pointerLockElement &&
                    canvasReference.current != undefined
                  ) {
                    await canvasReference.current.requestPointerLock({
                      // unadjustedMovement: true,
                    });
                  }
                })();
              }}
            ></canvas>
        </section>

        <section className="min-h-0 min-w-0 basis-1/3 overflow-hidden rounded-md border border-zinc-800 bg-zinc-900 p-2">
          <MainEditor
            materials={materials}
            setSceneReference={updateSceneReference}
          />
        </section>
      </div>

      <div className="min-h-0 grow basis-2/5 rounded-md border border-zinc-800 bg-zinc-900 p-2">
        <MaterialEditor
          materials={materials}
          compileResult={compileResult}
          onMaterialsChange={updateMaterials}
        />
      </div>
    </div>
  );
};

export default App;
