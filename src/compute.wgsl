struct Uniforms {
    time: f32,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var tex: texture_storage_2d<bgra8unorm, write>;

@compute @workgroup_size(1) fn cs(
    @builtin(global_invocation_id) id: vec3u
) {
    const double_time = uniforms.time * 2;

    let color = vec4f(fract(vec2f(id.xy) / 32.0), abs(cos(uniforms.time)), 1);

    textureStore(tex, id.xy, color);
}
