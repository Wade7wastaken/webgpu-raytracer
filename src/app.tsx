import { useEffect, useRef, useState, type FC } from "react";
import { Vector3 } from "three";

import computeShader from "./compute.wgsl?raw";

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

const App: FC = () => {
  const canvasReference = useRef<HTMLCanvasElement>(null);
  const camera_pos = useRef<Vector3>(new Vector3(0.5, 0.5, 0));
  const yaw = useRef(Math.PI / 2);
  const pitch = useRef(0);
  const keys = useRef<Keys>({
    W: false,
    A: false,
    S: false,
    D: false,
    Space: false,
    Shift: false,
  });

  const [fps, setFps] = useState(0);
  const runningReference = useRef(false);

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

      const new_device = await adapter.requestDevice({
        requiredFeatures: hasBGRA8unormStorage ? ["bgra8unorm-storage"] : [],
      });

      if (isCanceled) {
        new_device.destroy();
        return;
      }
      device = new_device;

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

      const presentationFormat = hasBGRA8unormStorage
        ? navigator.gpu.getPreferredCanvasFormat()
        : "rgba8unorm";

      context.configure({
        device,
        format: presentationFormat,
        // This is what's required to be able to write to a texture from a compute shader
        usage:
          GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.STORAGE_BINDING,
      });

      const module = device.createShaderModule({
        code: computeShader.replaceAll(
          "${presentationFormat}",
          () => presentationFormat,
        ),
      });

      const uniformsNumberFloats = 64;

      const uniformBufferSize = uniformsNumberFloats * 4;
      const uniformBuffer = device.createBuffer({
        size: uniformBufferSize,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      });
      const uniformData = new Float32Array(uniformsNumberFloats);

      const triangleBufferSize = 10 * 9 * 4;
      const triangleBuffer = device.createBuffer({
        size: triangleBufferSize,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
      });

      // prettier-ignore
      const triangleData = new Float32Array([
        // back face
        0, 0, -2, // bottom left
        1, 0, -2, // bottom right
        1, 1, -2, // top right

        0, 0, -2, // bottom left
        1, 1, -2, // top right
        0, 1, -2, // top left

        // bottom face
        0, 0, -2, // bottom left
        0, 0, -1, // forward left
        1, 0, -2, // bottom right

        1, 0, -2, // bottom right
        0, 0, -1, // forward left
        1, 0, -1, // forward right

        // top face
        0, 1, -2, // bottom left
        1, 1, -2, // bottom right
        0, 1, -1, // forward left

        1, 1, -2, // bottom right
        1, 1, -1, // forward right
        0, 1, -1, // forward left

        // left face
        0, 0, -2, // bottom left
        0, 1, -2, // bottom left
        0, 0, -1, // forward left

        0, 1, -2, // bottom left
        0, 1, -1, // forward left
        0, 0, -1, // forward left

        // left face
        1, 0, -2, // bottom left
        1, 0, -1, // forward left
        1, 1, -2, // bottom left

        1, 1, -2, // bottom left
        1, 0, -1, // forward left
        1, 1, -1, // forward left
      ]);

      const pipeline = device.createComputePipeline({
        label: "pipeline",
        layout: "auto",
        compute: {
          module,
          entryPoint: "cs",
        },
      });

      const setUniforms = (
        uniformData: Float32Array<ArrayBuffer>,
        canvasWidth: number,
        canvasHeight: number,
        time: number,
        deltaTime: number,
      ): void => {
        const fov = 90;
        const focal_length = 1;
        const vup = new Vector3(0, 1, 0);

        const theta = (fov / 180) * Math.PI;
        const h = Math.tan(theta / 2);
        const viewport_height = 2 * h * focal_length;
        const viewport_width = viewport_height * (canvasWidth / canvasHeight);

        const direction_x = Math.cos(yaw.current) * Math.cos(pitch.current);
        const direction_y = Math.sin(pitch.current);
        const direction_z = Math.sin(yaw.current) * Math.cos(pitch.current);

        const w = new Vector3(
          direction_x,
          direction_y,
          direction_z,
        ).normalize();
        const u = vup.clone().cross(w).normalize();
        const v = w.clone().cross(u);

        const camSpeed = 0.001 * deltaTime;

        if (keys.current.W) {
          camera_pos.current.add(
            w
              .clone()
              .cross(vup)
              .cross(vup)
              .normalize()
              .multiplyScalar(camSpeed),
          );
        }
        if (keys.current.S) {
          camera_pos.current.sub(
            w
              .clone()
              .cross(vup)
              .cross(vup)
              .normalize()
              .multiplyScalar(camSpeed),
          );
        }
        if (keys.current.A) {
          camera_pos.current.add(
            w.clone().cross(vup).normalize().multiplyScalar(camSpeed),
          );
        }
        if (keys.current.D) {
          camera_pos.current.sub(
            w.clone().cross(vup).normalize().multiplyScalar(camSpeed),
          );
        }
        if (keys.current.Space) {
          camera_pos.current.sub(vup.multiplyScalar(camSpeed));
        }
        if (keys.current.Shift) {
          camera_pos.current.add(vup.multiplyScalar(camSpeed));
        }

        const camera_center = camera_pos.current.clone();

        const viewport_u = u.clone().multiplyScalar(viewport_width);
        const viewport_v = v.clone().multiplyScalar(viewport_height);

        const pixel_delta_u = viewport_u.clone().divideScalar(canvasWidth);
        const pixel_delta_v = viewport_v.clone().divideScalar(canvasHeight);

        const viewport_upper_left = camera_center
          .clone()
          .sub(w.clone().multiplyScalar(focal_length))
          .sub(viewport_u.clone().divideScalar(2))
          .sub(viewport_v.clone().divideScalar(2));

        const pixel00_loc = viewport_upper_left
          .clone()
          .add(pixel_delta_u.clone().add(pixel_delta_v).multiplyScalar(0.5));

        // console.log("u:", u);
        // console.log("v:", v);
        // console.log("w:", w);
        // console.log("cam:", camera_center);
        // console.log();

        uniformData[0] = pixel00_loc.x;
        uniformData[1] = pixel00_loc.y;
        uniformData[2] = pixel00_loc.z;

        uniformData[3] = 0;

        uniformData[4] = pixel_delta_u.x;
        uniformData[5] = pixel_delta_u.y;
        uniformData[6] = pixel_delta_u.z;

        uniformData[7] = 0;

        uniformData[8] = pixel_delta_v.x;
        uniformData[9] = pixel_delta_v.y;
        uniformData[10] = pixel_delta_v.z;

        uniformData[11] = 0;

        uniformData[12] = camera_center.x;
        uniformData[13] = camera_center.y;
        uniformData[14] = camera_center.z;

        uniformData[15] = time;
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

        if (!runningReference.current) {
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
          uniformData,
          canvasTexture.width,
          canvasTexture.height,
          (now - startTime) / 1000,
          deltaTime,
        );
        device.queue.writeBuffer(uniformBuffer, 0, uniformData);
        device.queue.writeBuffer(triangleBuffer, 0, triangleData);

        const bindGroup = device.createBindGroup({
          layout: pipeline.getBindGroupLayout(0),
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
        pass.dispatchWorkgroups(canvasTexture.width, canvasTexture.height);
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
          keys.current.W = true;
          break;
        }
        case "s": {
          keys.current.S = true;
          break;
        }
        case "a": {
          keys.current.A = true;
          break;
        }
        case "d": {
          keys.current.D = true;
          break;
        }
        case " ": {
          keys.current.Space = true;
          break;
        }
        case "shift": {
          keys.current.Shift = true;
          break;
        }
      }
    };

    const onKeyUp = (event: KeyboardEvent): void => {
      switch (event.key.toLowerCase()) {
        case "w": {
          keys.current.W = false;
          break;
        }
        case "s": {
          keys.current.S = false;
          break;
        }
        case "a": {
          keys.current.A = false;
          break;
        }
        case "d": {
          keys.current.D = false;
          break;
        }
        case " ": {
          keys.current.Space = false;
          break;
        }
        case "shift": {
          keys.current.Shift = false;
          break;
        }
      }
    };

    const sensitivity = 0.001;

    const updateMousePosition = (event: MouseEvent): void => {
      yaw.current += event.movementX * sensitivity;
      pitch.current -= event.movementY * sensitivity;
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
    <>
      <canvas
        ref={canvasReference}
        className="block"
        width={(720 * 19) / 9}
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
      <p>{fps.toFixed(2)}</p>
      <button
        onClick={() => {
          runningReference.current = true;
        }}
      >
        Start
      </button>
      <button
        onClick={() => {
          runningReference.current = false;
        }}
      >
        Stop
      </button>
    </>
  );
};

export default App;
