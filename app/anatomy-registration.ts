/**
 * Landmark-based similarity registration for external anatomy meshes.
 *
 * This module deliberately does not contain a guessed scale, offset, or axis
 * conversion. A caller must supply corresponding points measured in the STL
 * source and in the target atlas coordinate space.
 */
export type Vec3 = readonly [number, number, number];

export interface RegistrationLandmark {
  id: string;
  source: Vec3;
  target: Vec3;
}

export interface SimilarityRegistration {
  /** Row-major 3x3 rotation matrix. */
  rotation: readonly [number, number, number, number, number, number, number, number, number];
  scale: number;
  translation: Vec3;
  landmarkIds: string[];
  residuals: { id: string; distance: number }[];
  rmsResidual: number;
  maxResidual: number;
}

const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mul = (a: Vec3, s: number): Vec3 => [a[0] * s, a[1] * s, a[2] * s];
const dot = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const norm = (a: Vec3): number => Math.sqrt(dot(a, a));
const unit = (a: Vec3, label: string): Vec3 => {
  const length = norm(a);
  if (!Number.isFinite(length) || length < 1e-9) throw new Error(`Degenerate registration landmarks: ${label}.`);
  return mul(a, 1 / length);
};
const finite = (p: Vec3): boolean => p.length === 3 && p.every(Number.isFinite);

/** Build a right-handed orthonormal frame from three non-collinear points. */
function frame(points: readonly Vec3[], label: string): [Vec3, Vec3, Vec3] {
  const x = unit(sub(points[1], points[0]), `${label} first baseline`);
  const z = unit(cross(x, sub(points[2], points[0])), `${label} landmark plane`);
  const y = unit(cross(z, x), `${label} perpendicular axis`);
  return [x, y, z];
}

/**
 * Fit a uniform-scale, rotation and translation transform using three
 * non-collinear corresponding landmarks. Additional landmarks are validation
 * points; they are never silently used to distort the fit.
 */
export function fitSimilarityRegistration(
  landmarks: readonly RegistrationLandmark[],
): SimilarityRegistration {
  if (landmarks.length < 3) throw new Error('At least three corresponding landmarks are required.');
  if (new Set(landmarks.map((p) => p.id)).size !== landmarks.length) {
    throw new Error('Registration landmark IDs must be unique.');
  }
  for (const point of landmarks) {
    if (!point.id.trim() || !finite(point.source) || !finite(point.target)) {
      throw new Error('Every registration landmark needs an ID and finite source/target coordinates.');
    }
  }

  const source = landmarks.map((p) => p.source);
  const target = landmarks.map((p) => p.target);
  const sourceFrame = frame(source, 'Source');
  const targetFrame = frame(target, 'Target');
  const sourceBaseline = norm(sub(source[1], source[0]));
  const targetBaseline = norm(sub(target[1], target[0]));
  const scale = targetBaseline / sourceBaseline;
  if (!Number.isFinite(scale) || scale <= 0) throw new Error('Invalid registration scale.');

  // R = targetFrame * transpose(sourceFrame), with basis vectors as columns.
  const rotation = Array.from({ length: 9 }, (_, index) => {
    const row = Math.floor(index / 3);
    const column = index % 3;
    return targetFrame[0][row] * sourceFrame[0][column]
      + targetFrame[1][row] * sourceFrame[1][column]
      + targetFrame[2][row] * sourceFrame[2][column];
  }) as [number, number, number, number, number, number, number, number, number];

  const rotate = (p: Vec3): Vec3 => [
    rotation[0] * p[0] + rotation[1] * p[1] + rotation[2] * p[2],
    rotation[3] * p[0] + rotation[4] * p[1] + rotation[5] * p[2],
    rotation[6] * p[0] + rotation[7] * p[1] + rotation[8] * p[2],
  ];
  const translation = sub(target[0], mul(rotate(source[0]), scale));
  const transform = (p: Vec3): Vec3 => add(mul(rotate(p), scale), translation);
  const residuals = landmarks.map(({ id, target: expected, source: measured }) => ({
    id,
    distance: norm(sub(transform(measured), expected)),
  }));
  const rmsResidual = Math.sqrt(residuals.reduce((sum, p) => sum + p.distance ** 2, 0) / residuals.length);
  const maxResidual = Math.max(...residuals.map((p) => p.distance));

  return {
    rotation,
    scale,
    translation,
    landmarkIds: landmarks.map((p) => p.id),
    residuals,
    rmsResidual,
    maxResidual,
  };
}

/** Apply a previously measured registration to one STL-space vertex. */
export function applySimilarityRegistration(
  point: Vec3,
  registration: Pick<SimilarityRegistration, 'rotation' | 'scale' | 'translation'>,
): Vec3 {
  const r = registration.rotation;
  const rotated: Vec3 = [
    r[0] * point[0] + r[1] * point[1] + r[2] * point[2],
    r[3] * point[0] + r[4] * point[1] + r[5] * point[2],
    r[6] * point[0] + r[7] * point[1] + r[8] * point[2],
  ];
  return add(mul(rotated, registration.scale), registration.translation);
}
