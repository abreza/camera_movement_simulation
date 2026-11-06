require('./register-typescript.cjs');
const test = require('node:test');
const assert = require('node:assert/strict');
const { Vector3, Euler } = require('three');
const {
  IndexedParameterDictionary, createParameterDictionary, updateParameterDictionary,
  createParameterReference, reconstructFromReference,
} = require('../src/service/dataset/parameterDictionary.ts');
const { formatSimulationData } = require('../src/service/dataset/simulationFormatter.ts');

test('indexed appends exactly match immutable dictionary order and references across continuous clips', () => {
  let legacy = createParameterDictionary('dictionary-equivalence');
  const writer = new IndexedParameterDictionary(legacy);
  for (let index = 0; index < 1024; index++) {
    const objects = [
      { movement: index % 3 ? 'panLeft' : 'static', nested: { focal: 24 + index / 31,
        aspect: [1, 16 / 9][index % 2], enabled: !!(index % 2) },
      array: ['first', 'second', 'first'], frameCount: 100 + index, subjectIndex: index,
      geometry: new Vector3(index, 1, 2), rotation: new Euler(), missing: undefined },
      { nested: { scale: index / 2048, repeated: [index % 7, index % 7] } },
    ];
    const before = JSON.stringify(objects);
    legacy = updateParameterDictionary(objects, legacy, 'simulation');
    const expected = createParameterReference(objects, legacy, 'simulation');
    assert.deepEqual(writer.appendReference(objects, 'simulation'), expected);
    assert.equal(JSON.stringify(objects), before);
    if (index % 128 === 0) assert.deepEqual(writer.snapshot(), legacy);
  }
  assert.deepEqual(writer.snapshot(), legacy);
  assert.ok(!writer.dictionary.keys.some((key) => /frameCount|subjectIndex|geometry|rotation/.test(key)));
});

test('first Object.is match wins including distinct negative/positive zero and existing duplicate values', () => {
  const initial = { keys: ['root__value'], values: [[-0, 0, -0, '0', false, 0]] };
  const writer = new IndexedParameterDictionary(initial);
  const object = { value: [0, -0, '0', false, true] };
  const expected = updateParameterDictionary([object], initial, 'root');
  assert.deepEqual(writer.appendReference(object, 'root'), createParameterReference(object, expected, 'root'));
  assert.deepEqual(writer.snapshot(), expected);
  assert.deepEqual(writer.appendReference({ value: [-0, 0] }, 'root'), [[0, 0], [0, 1]]);
  assert.equal(Object.is(writer.dictionary.values[0][0], -0), true);
  assert.equal(Object.is(writer.dictionary.values[0][1], 0), true);
});

test('input dictionaries and snapshots have independent ownership', () => {
  const initial = { schemaVersion: 2, datasetId: 'owned', keys: ['known'], values: [['a']] };
  const writer = new IndexedParameterDictionary(initial);
  initial.keys[0] = 'changed';
  initial.values[0][0] = 'changed';
  initial.values.push(['new']);
  assert.deepEqual(writer.snapshot(), { schemaVersion: 2, datasetId: 'owned', keys: ['known'], values: [['a']] });
  const snapshot = writer.snapshot();
  writer.appendReference({ known: 'b', added: 2 });
  assert.deepEqual(snapshot, { schemaVersion: 2, datasetId: 'owned', keys: ['known'], values: [['a']] });
  snapshot.keys.push('outside');
  snapshot.values[0].push('outside');
  assert.deepEqual(writer.snapshot(), {
    schemaVersion: 2, datasetId: 'owned', keys: ['known', 'added'], values: [['a', 'b'], [2]],
  });
});

test('invalid initial dictionaries and nonfinite new values reject without partial append', () => {
  for (const invalid of [
    { keys: ['a'], values: [] }, { keys: ['a', 'a'], values: [[], []] },
    { keys: ['a'], values: [[Infinity]] }, { keys: ['a'], values: [[{}]] },
  ]) assert.throws(() => new IndexedParameterDictionary(invalid));
  const writer = new IndexedParameterDictionary();
  writer.appendReference({ before: 1 });
  const snapshot = writer.snapshot();
  for (const invalid of [NaN, Infinity, -Infinity]) {
    assert.throws(() => writer.appendReference({ added: 2, nested: [1, { bad: invalid }] }), /finite number/);
    assert.throws(() => writer.appendReference({ frameCount: invalid }), /finite number/);
    assert.deepEqual(writer.snapshot(), snapshot);
  }
});

test('appending uses cached indices without rereading input or scanning accumulated tables', () => {
  const initial = { keys: ['number'], values: [Array.from({ length: 10000 }, (_, index) => index)] };
  const writer = new IndexedParameterDictionary(initial);
  Object.defineProperty(initial, 'keys', { get() { throw new Error('input rescanned'); } });
  Object.defineProperty(initial, 'values', { get() { throw new Error('input rescanned'); } });
  const forbid = () => { throw new Error('accumulated dictionary scanned'); };
  const arrays = [writer.dictionary.keys, writer.dictionary.values, ...writer.dictionary.values];
  for (const array of arrays) {
    for (const method of ['indexOf', 'findIndex', 'some', 'every', 'forEach', 'map']) {
      Object.defineProperty(array, method, { value: forbid, configurable: true });
    }
    Object.defineProperty(array, Symbol.iterator, { value: forbid, configurable: true });
  }
  for (let index = 0; index < 1000; index++) {
    assert.deepEqual(writer.appendReference({ number: [9999, 10000 + index], fresh: true }),
      [[0, 9999], [0, 10000 + index], [1, 0]]);
  }
  assert.equal(writer.dictionary.values[0].length, 11000);
});

function sample(index) {
  return {
    cinematographyPrompts: [{ movement: { type: 'static', speed: 'constant' }, observedMotionText: `clip-${index}` }],
    simulationInstructions: [{ frameCount: 1, subjectIndex: 0, setup: {
      kind: 'init', config: { focalLength: 24 + index / 100, aspectRatio: 16 / 9 },
    } }],
    subjectsInfo: [{ subject: { id: 'subject', class: 'human', dimensions: { width: .5, height: 1.7, depth: .3 } },
      frames: [{ position: new Vector3(1, 2, 3), rotation: new Euler() }], movementType: 'static' }],
    cameraFrames: [{ position: new Vector3(4, 5, 6), rotation: new Euler(),
      focalLength: 24 + index / 100, aspectRatio: 16 / 9 }],
  };
}

test('optional formatter writer preserves exact four-section data and final dictionary', () => {
  let legacy = createParameterDictionary('formatter-equivalence');
  const initial = structuredClone(legacy);
  const writer = new IndexedParameterDictionary(initial);
  for (let index = 0; index < 128; index++) {
    const data = sample(index);
    const before = JSON.stringify(data);
    const oldResult = formatSimulationData(data, legacy);
    const indexedResult = formatSimulationData(data, writer.dictionary, writer);
    legacy = oldResult.parameterDictionary;
    assert.deepEqual(indexedResult.formattedData, oldResult.formattedData);
    assert.equal(indexedResult.parameterDictionary, writer.dictionary);
    assert.deepEqual(writer.snapshot(), legacy);
    assert.equal(JSON.stringify(data), before);
    assert.equal(reconstructFromReference(indexedResult.formattedData[0], legacy).cinematography.observedMotionText, `clip-${index}`);
  }
  assert.deepEqual(initial, createParameterDictionary('formatter-equivalence'));
});

test('legacy formatter remains immutable and writer does not bypass sample validation', () => {
  const initial = createParameterDictionary('immutable');
  const result = formatSimulationData(sample(0), initial);
  assert.deepEqual(initial, createParameterDictionary('immutable'));
  assert.notEqual(result.parameterDictionary, initial);
  const writer = new IndexedParameterDictionary();
  const invalid = sample(0);
  invalid.cameraFrames = [];
  assert.throws(() => formatSimulationData(invalid, writer.dictionary, writer), /frame counts disagree/);
  assert.deepEqual(writer.snapshot(), createParameterDictionary());
});
