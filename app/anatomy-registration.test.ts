import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applySimilarityRegistration,
  fitSimilarityRegistration,
  type RegistrationLandmark,
  type Vec3,
} from './anatomy-registration.ts';

const close = (actual: number, expected: number, epsilon = 1e-8) => {
  assert.ok(Math.abs(actual - expected) <= epsilon, `expected ${actual} to be within ${epsilon} of ${expected}`);
};
const closeVec = (actual: Vec3, expected: Vec3, epsilon = 1e-8) => {
  actual.forEach((value, index) => close(value, expected[index], epsilon));
};

test('fits identity registration without moving points', () => {
  const landmarks: RegistrationLandmark[] = [
    { id: 'A', source: [0, 0, 0], target: [0, 0, 0] },
    { id: 'B', source: [1, 0, 0], target: [1, 0, 0] },
    { id: 'C', source: [0, 1, 0], target: [0, 1, 0] },
    { id: 'D', source: [1, 1, 1], target: [1, 1, 1] },
  ];
  const fit = fitSimilarityRegistration(landmarks);
  close(fit.scale, 1);
  close(fit.rmsResidual, 0);
  closeVec(applySimilarityRegistration([0.25, -2, 4], fit), [0.25, -2, 4]);
});

test('recovers a known rotation, uniform scale and translation', () => {
  const transform = (p: Vec3): Vec3 => [-2 * p[1] + 10, 2 * p[0] - 4, 2 * p[2] + 3];
  const source: Vec3[] = [[0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 2]];
  const fit = fitSimilarityRegistration(source.map((point, index) => ({
    id: `P${index + 1}`, source: point, target: transform(point),
  })));
  close(fit.scale, 2);
  close(fit.rmsResidual, 0);
  closeVec(applySimilarityRegistration([0.5, -1, 2], fit), transform([0.5, -1, 2]));
});

test('rejects collinear landmarks', () => {
  assert.throws(() => fitSimilarityRegistration([
    { id: 'A', source: [0, 0, 0], target: [0, 0, 0] },
    { id: 'B', source: [1, 0, 0], target: [1, 0, 0] },
    { id: 'C', source: [2, 0, 0], target: [2, 0, 0] },
  ]), /Degenerate registration landmarks/);
});

test('rejects duplicate IDs and non-finite coordinates', () => {
  const base: RegistrationLandmark[] = [
    { id: 'A', source: [0, 0, 0], target: [0, 0, 0] },
    { id: 'B', source: [1, 0, 0], target: [1, 0, 0] },
    { id: 'C', source: [0, 1, 0], target: [0, 1, 0] },
  ];
  assert.throws(() => fitSimilarityRegistration([...base, { ...base[2] }]), /IDs must be unique/);
  assert.throws(() => fitSimilarityRegistration([
    base[0], base[1], { id: 'C', source: [0, Number.NaN, 0], target: [0, 1, 0] },
  ]), /finite source\/target coordinates/);
});

test('reports independent validation-landmark mismatch instead of refitting', () => {
  const fit = fitSimilarityRegistration([
    { id: 'A', source: [0, 0, 0], target: [0, 0, 0] },
    { id: 'B', source: [1, 0, 0], target: [1, 0, 0] },
    { id: 'C', source: [0, 1, 0], target: [0, 1, 0] },
    { id: 'validation-outlier', source: [1, 1, 1], target: [1, 1, 1.25] },
  ]);
  assert.equal(fit.residuals[3].id, 'validation-outlier');
  close(fit.residuals[3].distance, 0.25);
  close(fit.maxResidual, 0.25);
});
