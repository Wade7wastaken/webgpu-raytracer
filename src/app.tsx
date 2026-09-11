import { useEffect, useRef, type FC } from "react";

import computeShader from "./compute.wgsl?raw";

const fail = (message: string): void => {
  alert(message);
};

const setupRenderer = async (canvas: HTMLCanvasElement): Promise<void> => {
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
    usage:
      GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.STORAGE_BINDING,
  });

  const module = device.createShaderModule({
    code: computeShader,
  });

  const uniformBufferSize = 1 * 4; // 1 Float32 elements * 4 bytes
  const uniformBuffer = device.createBuffer({
    size: uniformBufferSize,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  const uniformData = new Float32Array(1);

  const pipeline = device.createComputePipeline({
    label: "checkboard pipeline",
    layout: "auto",
    compute: {
      module,
      entryPoint: "cs",
    },
  });

  function render(time: DOMHighResTimeStamp): void {
    time *= 0.001;
    uniformData[0] = time;
    device.queue.writeBuffer(uniformBuffer, 0, uniformData);

    // Get the current texture from the canvas context
    const canvasTexture = context.getCurrentTexture();

    const bindGroup = device.createBindGroup({
      layout: pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: uniformBuffer } },
        { binding: 1, resource: canvasTexture.createView() },
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

    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);
}

const App: FC = () => {
  const canvasReference = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasReference.current == undefined) {
      fail("couldn't find canvas");
      return;
    }
    void setupRenderer(canvasReference.current);
  }, []);

  return (
    <canvas
      ref={canvasReference}
      className="block"
      width={(720 * 19) / 9}
      height={720}
    ></canvas>
  );
};

export default App;
