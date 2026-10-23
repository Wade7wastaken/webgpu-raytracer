import { useEffect, useRef, useState, type FC } from "react";
import { Vector3 } from "three";
import { makeShaderDataDefinitions, makeStructuredView } from "webgpu-utils";

import { MaterialEditor } from "./materialEditor";
import { processShader, type MaterialList } from "./materials";
import { sceneObjectToTriangles } from "./mesh";
import { MainEditor } from "./sceneEditor";

import type { SceneObject, Triangle } from "./mesh";

type Keys = {
  W: boolean;
  A: boolean;
  S: boolean;
  D: boolean;
  Space: boolean;
  Shift: boolean;
};

const fail = (message: string): void => {
  alert(message);
};

const formatTriangle = ({
  vertices,
  materialIndex,
  colorIndex,
}: Triangle): number[] => {
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

const formatTriangles = (triangles: Triangle[]): Float32Array => {
  const buffer = [];
  for (const triangle of triangles) {
    buffer.push(...formatTriangle(triangle));
  }
  return new Float32Array(buffer);
};

const App: FC = () => {
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
  const isRunningReference = useRef(false);

  const raysPerPixel = useRef(10);
  const maxBounces = useRef(10);

  const defaultMaterials = { materials: [] };
  const defaultPresentationFormat = "bgra8unorm";
  const materialsReference = useRef<MaterialList>(defaultMaterials);
  const presentationFormatReference = useRef<GPUTextureFormat>(
    defaultPresentationFormat,
  );
  const shaderSourceReference = useRef<string>(
    processShader(defaultMaterials, defaultPresentationFormat),
  );
  const shaderStaleReference = useRef(false);

  const sceneReference = useRef<SceneObject>({
    type: "list",
    id: 0,
    children: [],
    enabled: true,
  }); // main source of truth for the scene
  const sceneTriangles = useRef(formatTriangles([])); // updated in setUniforms when sceneReference changes
  const sceneStale = useRef(false); // true when sceneReference is stale

  const [shaderError, setShaderError] = useState("");

  useEffect(() => {
    let isCanceled = false;
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

      if (isCanceled) {
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

      context.configure({
        device,
        format: presentationFormatReference.current,
        // This is what's required to be able to write to a texture from a compute shader
        usage:
          GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.STORAGE_BINDING,
      });

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

        const directionX = Math.cos(yawReference.current) * Math.cos(pitchReference.current);
        const directionY = Math.sin(pitchReference.current);
        const directionZ = Math.sin(yawReference.current) * Math.cos(pitchReference.current);

        const w = new Vector3(
          directionX,
          directionY,
          directionZ,
        ).normalize();
        const u = vup.clone().cross(w).normalize();
        const v = w.clone().cross(u);

        const camSpeed = 0.001 * deltaTime;

        if (keysReference.current.W) {
          cameraPositionReference.current.add(
            w
              .clone()
              .cross(vup)
              .cross(vup)
              .normalize()
              .multiplyScalar(camSpeed),
          );
        }
        if (keysReference.current.S) {
          cameraPositionReference.current.sub(
            w
              .clone()
              .cross(vup)
              .cross(vup)
              .normalize()
              .multiplyScalar(camSpeed),
          );
        }
        if (keysReference.current.A) {
          cameraPositionReference.current.add(
            w.clone().cross(vup).normalize().multiplyScalar(camSpeed),
          );
        }
        if (keysReference.current.D) {
          cameraPositionReference.current.sub(
            w.clone().cross(vup).normalize().multiplyScalar(camSpeed),
          );
        }
        if (keysReference.current.Space) {
          cameraPositionReference.current.add(vup.multiplyScalar(camSpeed));
        }
        if (keysReference.current.Shift) {
          cameraPositionReference.current.sub(vup.multiplyScalar(camSpeed));
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
            sceneObjectToTriangles(sceneReference.current),
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
          rays_per_pixel: raysPerPixel.current,
          max_bounces: maxBounces.current,
          num_tris: sceneObjectToTriangles(sceneReference.current).length, // FIXME
        });
      };

      const now = performance.now();

      const startTime = now;
      let lastTime = now;
      let lastFpsUpdate = now;
      let fpsUpdateFrameCount = 0;

      function render(now: DOMHighResTimeStamp): void {
        if (isCanceled || device == undefined || context == undefined) {
          return;
        }

        if (!isRunningReference.current) {
          rafId = requestAnimationFrame(render);
          return;
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

        if (shaderStaleReference.current) {
          shaderStaleReference.current = false;

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

            if (error == undefined) {
              setShaderError("Shader compiled correctly");
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
            } else {
              const info = await newModule.getCompilationInfo();

              // Sort the messages by line numbers in reverse order
              // so that as we insert the messages they won't affect
              // the line numbers.
              const msgs = info.messages.toSorted(
                (a, b) => b.lineNum - a.lineNum,
              );

              setShaderError(
                msgs
                  .map((m) => m.message)
                  .filter((m) => m.length > 0)
                  .join("\n").trim(),
              );
            }
          })();
        }

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
      isCanceled = true;
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

  return (
    <div className="p-4">
      <div className="flex gap-8">
        <div>
          <div className="flex gap-2 mb-2 items-center-safe">
            <button
              className="bg-gray-500 px-2 py-1 rounded hover:cursor-pointer"
              onClick={() => {
                isRunningReference.current = true;
              }}
            >
              Start
            </button>
            <button
              className="bg-gray-500 px-2 py-1 rounded hover:cursor-pointer"
              onClick={() => {
                isRunningReference.current = false;
              }}
            >
              Stop
            </button>
            <p>FPS: {fps.toFixed(2)}</p>
            <label className="ml-16 flex gap-1">
              Rays per pixel:
              <input
                type="range"
                min={1}
                max={100}
                step={1}
                defaultValue={10}
                onChange={(event) => {
                  raysPerPixel.current = Number.parseInt(event.target.value);
                }}
              />
            </label>
            <label className="flex gap-1">
              Max ray bounces:
              <input
                type="range"
                min={1}
                max={100}
                step={1}
                defaultValue={10}
                onChange={(event) => {
                  maxBounces.current = Number.parseInt(event.target.value);
                }}
              />
            </label>
          </div>
          <canvas
            ref={canvasReference}
            className="block border"
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
        </div>
        <MainEditor
          setSceneReference={(patch) => {
            sceneReference.current = patch;
            sceneStale.current = true;
            sceneTriangles.current = formatTriangles(
              sceneObjectToTriangles(sceneReference.current),
            );
          }}
        />
      </div>
      <div className="flex">
        <MaterialEditor
          setMaterialsReference={(patch) => {
            materialsReference.current = patch;
            shaderStaleReference.current = true;
            shaderSourceReference.current = processShader(
              materialsReference.current,
              presentationFormatReference.current,
            );
          }}
        />
        <pre className="w-1/4">{shaderError}</pre>
      </div>
    </div>
  );
};

export default App;
