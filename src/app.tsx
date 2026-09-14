import {
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type FC,
  type RefObject,
  type SetStateAction,
} from "react";
import { Vector3 } from "three";

import computeShader from "./compute.wgsl?raw";

class NonNegativeRollingAverage {
  #total = 0;
  #samples: number[] = [];
  #cursor = 0;
  readonly #numSamples;
  public constructor(numberSamples = 30) {
    this.#numSamples = numberSamples;
  }
  public addSample(v: number): void {
    if (!(!Number.isNaN(v) && Number.isFinite(v) && v >= 0)) {
      return;
    }

    this.#total += v - (this.#samples[this.#cursor] || 0);
    this.#samples[this.#cursor] = v;
    this.#cursor = (this.#cursor + 1) % this.#numSamples;
  }
  public get(): number {
    return this.#total / this.#samples.length;
  }
}

const fail = (message: string): void => {
  alert(message);
};

const useAnimationFrame = (callback: (deltaTime: number) => void): void => {
  const requestReference = useRef(0);
  const previousTimeReference = useRef(0);
  const callbackReference = useRef(callback);

  useEffect(() => {
    callbackReference.current = callback;
  }, [callback]);

  useEffect(() => {
    const animate = (time: DOMHighResTimeStamp): void => {
      const deltaTime = time - previousTimeReference.current;
      callbackReference.current(deltaTime);
      previousTimeReference.current = time;
      requestReference.current = requestAnimationFrame(animate);
    };

    requestReference.current = requestAnimationFrame(animate);

    return (): void => {
      cancelAnimationFrame(requestReference.current);
    };
  }, []);
};

const setupRenderer = async (
  canvas: HTMLCanvasElement,
  camera_pos: RefObject<Vector3>,
  setFpsSamples: Dispatch<SetStateAction<number[]>>,
  fpsCount: RefObject<number>,
): Promise<void> => {
  console.log("starting setup");
  const adapter = await navigator.gpu.requestAdapter();
  if (adapter == undefined) {
    fail("need a browser that supports WebGPU");
    return;
  }

  const device = await adapter.requestDevice({
    requiredFeatures: ["bgra8unorm-storage"],
  });

  const pre_context = canvas.getContext("webgpu");

  if (pre_context == undefined) {
    fail("couldn't create context");
    return;
  }

  const context = pre_context;

  context.configure({
    device,
    format: "bgra8unorm",
    // This is what's required to be able to write to a texture from a compute shader
    usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.STORAGE_BINDING,
  });

  const module = device.createShaderModule({
    code: computeShader,
  });

  const uniformsNumberFloats = 64;

  const uniformBufferSize = uniformsNumberFloats * 4; // 1 Float32 elements * 4 bytes
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
    label: "checkboard pipeline",
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
  ) => {
    const viewport_height = 2;
    const viewport_width = viewport_height * (canvasWidth / canvasHeight);

    const focal_length = 1;
    const camera_center = camera_pos.current.clone();

    const viewport_u = new Vector3(viewport_width, 0, 0);
    const viewport_v = new Vector3(0, -viewport_height, 0);

    const pixel_delta_u = viewport_u.clone().divideScalar(canvasWidth);
    const pixel_delta_v = viewport_v.clone().divideScalar(canvasHeight);

    const viewport_upper_left = camera_center
      .clone()
      .sub(new Vector3(0, 0, focal_length))
      .sub(viewport_u.clone().divideScalar(2))
      .sub(viewport_v.clone().divideScalar(2));

    const pixel00_loc = viewport_upper_left
      .clone()
      .add(pixel_delta_u.clone().add(pixel_delta_v).multiplyScalar(0.5));

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
  };

  let lastTime = 0;

  function render(time: DOMHighResTimeStamp): void {
    time *= 0.001;
    const deltaTime = time - lastTime;
    setFpsSamples((s) => {
      const new_s = [...s];
      new_s[fpsCount.current % 10] = 1/deltaTime;
      return new_s;
    });
    fpsCount.current += 1;
    lastTime = time;
    uniformData[15] = time;
    setUniforms(uniformData, canvas.clientWidth, canvas.clientHeight);
    device.queue.writeBuffer(uniformBuffer, 0, uniformData);
    device.queue.writeBuffer(triangleBuffer, 0, triangleData);

    // Get the current texture from the canvas context
    const canvasTexture = context.getCurrentTexture();

    const bindGroup = device.createBindGroup({
      layout: pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: uniformBuffer } },
        { binding: 1, resource: canvasTexture.createView() },
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

    // requestAnimationFrame(render);
  }

  requestAnimationFrame(render);
};

const App: FC = () => {
  const canvasReference = useRef<HTMLCanvasElement>(null);
  const camera_pos = useRef<Vector3>(new Vector3(0.5, 0.5, 0));
  const [fpsSamples, setFpsSamples] = useState(
    Array.from<number>({ length: 10 }),
  );
  const fpsCount = useRef(0);

  useEffect(() => {
    if (canvasReference.current == undefined) {
      fail("couldn't find canvas");
      return;
    }
    void setupRenderer(canvasReference.current, camera_pos, setFpsSamples, fpsCount);
  }, []);

  useEffect(() => {
    document.addEventListener("keydown", (event) => {
      switch (event.key) {
        case "w": {
          camera_pos.current.z -= 0.1;
          break;
        }
        case "s": {
          camera_pos.current.z += 0.1;
          break;
        }
        case "a": {
          camera_pos.current.x -= 0.1;
          break;
        }
        case "d": {
          camera_pos.current.x += 0.1;
          break;
        }
        case " ": {
          camera_pos.current.y += 0.1;
          break;
        }
        case "Shift": {
          camera_pos.current.y -= 0.1;
          break;
        }
      }
    });
  }, []);

  return (
    <>
      <canvas
        ref={canvasReference}
        className="block"
        width={(720 * 19) / 9}
        height={720}
      ></canvas>
      <p>{(fpsSamples.reduce((a, b) => a + b) / 10).toFixed(2)}</p>
    </>
  );
};

export default App;
