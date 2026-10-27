struct Uniforms {
    pixel00_loc: vec3f,
    pixel_delta: mat2x3f,
    camera_center: vec3f,
    frame_count: u32,
    rays_per_pixel: u32,
    max_bounces: u32,
    num_tris: u32,
}

struct Triangle {
    a: vec4f, // w is material
    edge1: vec4f, // w is color
    edge2: vec4f,
    normal: vec4f,
}

// ${presentationFormat} is replaced by the preferred canvas presentation format
// in js.
@group(0) @binding(0) var tex: texture_storage_2d<${presentationFormat}, write>;
@group(0) @binding(1) var<uniform> uniforms: Uniforms;
@group(0) @binding(2) var<storage, read> triangles: array<Triangle>;
@group(0) @binding(3) var<storage, read_write> accumulation: array<vec4f>;

fn init_rng(pixel: vec2<u32>, frame: u32) -> u32 {
    // Adapted from https://github.com/boksajak/referencePT
    let seed = dot(pixel, vec2<u32>(1u, 500u)) ^ jenkins_hash(frame);
    return jenkins_hash(seed);
}

fn jenkins_hash(input: u32) -> u32 {
    var x = input;
    x += x << 10u;
    x ^= x >> 6u;
    x += x << 3u;
    x ^= x >> 11u;
    x += x << 15u;
    return x;
}

fn rng_next_int(state: ptr<function, u32>) -> u32 {
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
    let value = rng_next_int(state);
    return float_construct_from_u32(value);
}

fn rand_vec(state: ptr<function, u32>) -> vec3f {
    return vec3f(rand(state), rand(state), rand(state));
}

fn rand_normal_vec(state: ptr<function, u32>) -> vec3<f32> {
    let r = pow(rand(state), 0.33333f);
    let cos_theta = 1f - 2f * rand(state);
    let sin_theta = sqrt(1f - cos_theta * cos_theta);
    let phi = 2f * 3.1415926535 * rand(state);

    let x = r * sin_theta * cos(phi);
    let y = r * sin_theta * sin(phi);
    let z = cos_theta;

    return vec3(x, y, z);
}

struct Ray {
    orig: vec3f,
    dir: vec3f,
}

fn ray_at(r: ptr<function, Ray>, t: f32) -> vec3f {
    return r.orig + t * r.dir;
}

struct hit_record {
    p: vec3f,
    n: vec3f,
    t: f32,
    mat: f32,
    color_idx: f32,
}

fn hit_triangle(r: ptr<function, Ray>, tri_idx: u32, max_t: f32, out_hit_rec: ptr<function, hit_record>) -> bool {
    let tri = triangles[tri_idx];
    let a = tri.a.xyz;
    let edge1 = tri.edge1.xyz;
    let edge2 = tri.edge2.xyz;
    var normal = tri.normal.xyz;

    let ray_cross_e2 = cross(r.dir, edge2);
    let denom = dot(edge1, ray_cross_e2);

    if (abs(denom) < 1e-8) {
        return false;
    }

    let inv_denom = 1.0 / denom;

    let s = r.orig - a;
    let u = dot(s, ray_cross_e2) * inv_denom;

    if (u < 0.0 || u > 1.0) {
        return false;
    }

    let s_cross_e1 = cross(s, edge1);
    let v = dot(r.dir, s_cross_e1) * inv_denom;
    if (v < 0.0 || u + v > 1.0) {
        return false;
    }

    let t = dot(edge2, s_cross_e1) * inv_denom;

    if (t < 0.0001 || t > max_t) {
        return false;
    }

    let p = ray_at(r, t);

    if (dot(r.dir, normal) > 0.0) {
        normal = -normal;
    }

    out_hit_rec.p = p;
    out_hit_rec.n = normal;
    out_hit_rec.t = t;
    out_hit_rec.mat = tri.a.w;
    out_hit_rec.color_idx = tri.edge1.w;

    return true;
}

fn ray_color(initial_ray: Ray, num_tris: u32, max_bounces: u32, state: ptr<function, u32>) -> vec3f {
    var ray = initial_ray;

    var ray_color = vec3f(1.0, 1.0, 1.0);

    var hit_rec = hit_record();

    let far_away = 10000000f;

    for (var bounce = 0u; bounce < max_bounces; bounce += 1) {

        var max_t = far_away;

        for (var tri_idx = 0u; tri_idx < num_tris; tri_idx += 1) {
            if hit_triangle(&ray, tri_idx, max_t, &hit_rec) {
                max_t = hit_rec.t;
            }
        }

        // we found an intersection closer than `far_away`
        if max_t < far_away {
            //${materials}
        } else {
            //${sky}
        }
    }

    return vec3f(0.0, 0.0, 0.0);
}

fn sample_square(rseed: ptr<function, u32>) -> vec2f {
    return vec2f(rand(rseed) - 0.5, rand(rseed) - 0.5);
}

fn get_ray(pixel: vec2u, rseed: ptr<function, u32>) -> Ray {
    let offset = sample_square(rseed);
    let a = vec2f(pixel) + offset;
    let pixel_sample = uniforms.pixel00_loc + uniforms.pixel_delta * a;

    let ray_direction = pixel_sample - uniforms.camera_center;
    return Ray(uniforms.camera_center, ray_direction);
}

@compute @workgroup_size(16, 16) fn cs(
    @builtin(global_invocation_id) id: vec3u
) {
    let tex_dims = textureDimensions(tex);
    if (id.x >= tex_dims.x || id.y >= tex_dims.y) {
        return;
    }

    var rseed = init_rng(id.xy, uniforms.frame_count);

    let spp = uniforms.rays_per_pixel;
    var pixel_color = vec3f(0.0, 0.0, 0.0);

    for (var i = 0u; i < spp; i += 1) {
        let r = get_ray(id.xy, &rseed);
        let color = ray_color(r, uniforms.num_tris, uniforms.max_bounces, &rseed);
        pixel_color += color;
    }
    pixel_color /= f32(spp);

    let pixel_index = id.y * tex_dims.x + id.x;
    var accumulated_color = pixel_color;
    if (uniforms.frame_count > 0u) {
        let previous_color = accumulation[pixel_index].xyz;
        accumulated_color = previous_color + (pixel_color - previous_color) / f32(uniforms.frame_count + 1u);
    }
    accumulation[pixel_index] = vec4f(accumulated_color, 1.0);

    textureStore(tex, id.xy, vec4f(clamp(accumulated_color, vec3f(0.0, 0.0, 0.0), vec3f(1.0, 1.0, 1.0)), 1.0));
}
