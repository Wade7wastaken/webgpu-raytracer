struct Uniforms {
    pixel00_loc: vec3f,
    pixel_delta_u: vec3f,
    pixel_delta_v: vec3f,
    camera_center: vec3f,
    time: f32,
}

@group(0) @binding(0) var tex: texture_storage_2d<bgra8unorm, write>;
@group(0) @binding(1) var<uniform> uniforms: Uniforms;
@group(0) @binding(2) var<storage, read> vert: array<f32>;

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

fn ray_at(r: ptr<function, Ray>, t: f32) -> vec3f {
    return r.orig + t * r.dir;
}

fn getVertex(index: u32) -> vec3f {
    let i = index * 3u;
    return vec3f(vert[i], vert[i + 1u], vert[i + 2u]);
}

struct HitRecord {
    p: vec3f,
    n: vec3f,
    t: f32,
}

fn hit_triangle(r: ptr<function, Ray>, triIdx: u32, max_t: f32, outHitRec: ptr<function, HitRecord>) -> bool {
    let a = getVertex(triIdx * 3);
    let b = getVertex(triIdx * 3 + 1);
    let c = getVertex(triIdx * 3 + 2);

    let edge1 = b - a;
    let edge2 = c - a;
    let outward_normal = normalize(cross(edge1, edge2));

    // --- stuff we can't do before ---

    let ray_cross_e2 = cross(r.dir, edge2);
    let denom = dot(edge1, ray_cross_e2);

    if (abs(denom) < 1e-8) {
        return false;
    }

    let s = r.orig - a;
    let u = dot(s, ray_cross_e2) / denom;

    if (u < 0.0 || u > 1.0) {
        return false;
    }

    let s_cross_e1 = cross(s, edge1);
    let v = dot(r.dir, s_cross_e1) / denom;
    if (v < 0.0 || u + v > 1.0) {
        return false;
    }

    let t = dot(edge2, s_cross_e1) / denom;

    if (t < 0.001 || t > max_t) {
        return false;
    }

    let p = ray_at(r, t);

    outHitRec.p = p;
    outHitRec.n = outward_normal;
    outHitRec.t = t;
    
    return true;
}

fn randNormalVector(state: ptr<function, u32>) -> vec3<f32> {
    let r = pow(rand(state), 0.33333f);
    let cosTheta = 1f - 2f * rand(state);
    let sinTheta = sqrt(1f - cosTheta * cosTheta);
    let phi = 2f * 3.1415926535 * rand(state);

    let x = r * sinTheta * cos(phi);
    let y = r * sinTheta * sin(phi);
    let z = cosTheta;

    return vec3(x, y, z);
}

fn ray_color(initialRay: Ray, state: ptr<function, u32>) -> vec3f {
    var ray = initialRay;

    var rayColor = vec3f(1.0, 1.0, 1.0);

    var hitRec = HitRecord();
    var min_t = 0; // double check

    let far_away = 10000000f;

    for (var bounce = 0u; bounce < 10; bounce += 1) {

        var max_t = far_away;
    
        // don't call arrayLength here
        for (var triIdx = 0u; triIdx < arrayLength(&vert) / 9; triIdx += 1) {
            if hit_triangle(&ray, triIdx, max_t, &hitRec) {
                max_t = hitRec.t;
            }
        }

        // we found an intersection closer than `far_away`
        if max_t < far_away {
            var scatter_dir = hitRec.n + randNormalVector(state);
            if (abs(scatter_dir.x) < 1e-6 && abs(scatter_dir.y) < 1e-6 && abs(scatter_dir.z) < 1e-6) {
                scatter_dir = hitRec.n;
            }
            rayColor *= vec3f(0.5, 0.5, 0.5);
            ray = Ray(hitRec.p, scatter_dir);
        } else {
            let unit_dir = normalize(ray.dir);
            let a = 0.5 * (unit_dir.y + 1.0);
            // return vec3f(0.3, 0.4, 0.5);
            return rayColor * (1.0-a)*vec3f(1.0, 1.0, 1.0) + a*vec3f(0.3, 0.7, 1.0);
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
    let pixel_sample = uniforms.pixel00_loc
        + (uniforms.pixel_delta_u * a.x)
        + (uniforms.pixel_delta_v * a.y);

    let ray_direction = pixel_sample - uniforms.camera_center;
    return Ray(uniforms.camera_center, ray_direction);
}

@compute @workgroup_size(1) fn cs(
    @builtin(global_invocation_id) id: vec3u
) {
    var rseed = initRng(id.xy, bitcast<u32>(uniforms.time));

    let spp = 1;
    var pixel_color = vec3f(0.0, 0.0, 0.0);

    for (var i = 0; i < spp; i += 1) {
        let r = get_ray(id.xy, &rseed);
        let color = ray_color(r, &rseed);
        pixel_color += clamp(color, vec3f(0.0, 0.0, 0.0), vec3f(1.0, 1.0, 1.0));
    }
    pixel_color /= f32(spp);
    
    textureStore(tex, id.xy, vec4f(pixel_color, 1.0));
}
