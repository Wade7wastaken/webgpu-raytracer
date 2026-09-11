struct Uniforms {
    pixel00_loc: vec3f,
    pixel_delta_u: vec3f,
    pixel_delta_v: vec3f,
    camera_center: vec3f,
    time: f32,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var tex: texture_storage_2d<bgra8unorm, write>;

fn initRng(pixel: vec2<u32>, frame: u32) -> u32 {
    // Adapted from https://github.com/boksajak/referencePT
    let seed = dot(pixel, vec2<u32>(1u, 500u)) ^ jenkinsHash(frame);
    return jenkinsHash(seed);
}

fn jenkinsHash(input: u32) -> u32 {
    var x = input;
    x += x << 10u;
    x ^= x >> 6u;
    x += x << 3u;
    x ^= x >> 11u;
    x += x << 15u;
    return x;
}

fn rngNextInt(state: ptr<function, u32>) -> u32 {
    // PCG random number generator
    // Based on https://www.shadertoy.com/view/XlGcRh
    let newState = *state * 747796405u + 2891336453u;
    *state = newState;
    let word = ((newState >> ((newState >> 28u) + 4u)) ^ newState) * 277803737u;
    return (word >> 22u) ^ word;
}

// Construct a float with half-open range [0:1] using low 23 bits.
// All zeroes yields 0.0, all ones yields the next smallest representable value below 1.0.
fn float_construct_from_u32(m_in: u32) -> f32 {
    return bitcast<f32>((m_in >> 9) | 0x3F800000u) - 1.0;
}

// Pseudo-random value in half-open range [0:1) from a f32 seed.
fn rand(state: ptr<function, u32>) -> f32 {
    let value = rngNextInt(state);
    return float_construct_from_u32(value);
}

struct Ray {
    orig: vec3f,
    dir: vec3f,
}

fn ray_at(r: Ray, t: f32) -> vec3f {
    return r.orig + t * r.dir;
}

fn hit_sphere(center: vec3f, radius: f32, r: Ray) -> f32 {
    let oc = center - r.orig;
    let a = dot(r.dir, r.dir);
    let h = dot(r.dir, oc);
    let c = dot(oc, oc) - radius * radius;
    let discriminant = h * h - a * c;

    if (discriminant < 0) {
        return -1.0;
    } else {
        return (h - sqrt(discriminant)) / a;
    }
}

fn ray_color(r: Ray) -> vec3f {
    var t: f32;
    t = hit_sphere(vec3f(0.0, 0.0, -1.0), 0.5, r);

    if (t > 0.0) {
        let n = normalize(ray_at(r, t) - vec3f(0.0, 0.0, -1.0));
        return 0.5 * (n + 1);
    }
    
    t = hit_sphere(vec3f(0.0, -100.5, -1.0), 100.0, r);

    if (t > 0.0) {
        let n = normalize(ray_at(r, t) - vec3f(0.0, -100.5, -1.0));
        return 0.5 * (n + 1);
    }
    
    let unit_dir = normalize(r.dir);
    let a = 0.5 * (unit_dir.y + 1.0);
    return (1.0-a)*vec3f(1.0, 1.0, 1.0) + a*vec3f(0.5, 0.7, 1.0);
}

fn sample_square(rseed: ptr<function, u32>) -> vec2f {
    return vec2f(rand(rseed) - 0.5, rand(rseed) - 0.5);
}

fn get_ray(pixel: vec2u, rseed: ptr<function, u32>) -> Ray {
    let offset = sample_square(rseed);
    let pixel_sample = uniforms.pixel00_loc
        + (uniforms.pixel_delta_u * (f32(pixel.x) + offset.x))
        + (uniforms.pixel_delta_v * (f32(pixel.y) + offset.y));

    let ray_direction = pixel_sample - uniforms.camera_center;
    return Ray(uniforms.camera_center, ray_direction);
}

@compute @workgroup_size(64) fn cs(
    @builtin(global_invocation_id) id: vec3u
) {
    var rseed = initRng(id.xy, bitcast<u32>(uniforms.time));

    let spp = 1;
    var pixel_color = vec3f(0.0, 0.0, 0.0);

    for (var i = 0; i < spp; i += 1) {
        let r = get_ray(id.xy, &rseed);
        let color = ray_color(r);
        pixel_color += clamp(color, vec3f(0.0, 0.0, 0.0), vec3f(1.0, 1.0, 1.0));
    }
    pixel_color /= f32(spp);
    
    textureStore(tex, id.xy, vec4f(pixel_color, 1.0));
}
