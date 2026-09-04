export const PARAMETER_DICTIONARY_SCHEMA_VERSION = 2;

export type ParameterValue = string | number | boolean;

export type ParameterDictionary = {
  schemaVersion?: number;
  datasetId?: string;
  keys: string[];
  values: ParameterValue[][];
};

const NON_SEMANTIC_FIELDS = new Set(["frameCount", "subjectIndex"]);

export function createParameterDictionary(
  datasetId?: string
): ParameterDictionary {
  return {
    schemaVersion: PARAMETER_DICTIONARY_SCHEMA_VERSION,
    ...(datasetId ? { datasetId } : {}),
    keys: [],
    values: [],
  };
}

function shouldSerializePath(path: string): boolean {
  const leaf = path.split("__").at(-1);
  return leaf !== undefined && !NON_SEMANTIC_FIELDS.has(leaf);
}

function isParameterValue(value: unknown): value is ParameterValue {
  return (
    typeof value === "string" ||
    typeof value === "boolean" ||
    (typeof value === "number" && Number.isFinite(value))
  );
}

export function assertValidParameterDictionary(
  dictionary: ParameterDictionary
): void {
  if (dictionary.keys.length !== dictionary.values.length) {
    throw new Error(
      "Parameter dictionary must have one value table for every key."
    );
  }
  if (new Set(dictionary.keys).size !== dictionary.keys.length) {
    throw new Error("Parameter dictionary keys must be unique.");
  }

  dictionary.values.forEach((values, keyIndex) => {
    if (!Array.isArray(values) || !values.every(isParameterValue)) {
      throw new Error(
        `Parameter dictionary contains an unsupported value for key ${dictionary.keys[keyIndex]}.`
      );
    }
  });
}

export function createParameterReference(
  obj: any,
  dictionary: ParameterDictionary,
  path: string = ""
): number[][] {
  assertValidParameterDictionary(dictionary);
  const references: number[][] = [];

  const processValue = (value: any, path: string) => {
    if (typeof value === "number" && !Number.isFinite(value)) {
      throw new Error(`Parameter ${path} must be a finite number.`);
    }
    if (isParameterValue(value) && shouldSerializePath(path)) {
      const keyIndex = dictionary.keys.indexOf(path);
      if (keyIndex === -1) {
        throw new Error(`Parameter dictionary is missing key ${path}.`);
      }

      const valueIndex = dictionary.values[keyIndex].findIndex(
        (candidate) => Object.is(candidate, value)
      );
      if (valueIndex === -1) {
        throw new Error(`Parameter dictionary is missing a value for ${path}.`);
      }

      references.push([keyIndex, valueIndex]);
    } else if (Array.isArray(value)) {
      value.forEach((item) => processValue(item, path));
    } else if (
      value &&
      typeof value === "object" &&
      !(value as any).isVector3 &&
      !(value as any).isEuler
    ) {
      for (const [key, val] of Object.entries(value)) {
        const newPath = path ? `${path}__${key}` : key;
        processValue(val, newPath);
      }
    }
  };

  processValue(obj, path);
  return references;
}

export function updateParameterDictionary(
  objects: any[],
  existingDictionary: ParameterDictionary = createParameterDictionary(),
  path: string = ""
): ParameterDictionary {
  assertValidParameterDictionary(existingDictionary);
  const dictionary: ParameterDictionary = {
    schemaVersion:
      existingDictionary.schemaVersion ?? PARAMETER_DICTIONARY_SCHEMA_VERSION,
    ...(existingDictionary.datasetId
      ? { datasetId: existingDictionary.datasetId }
      : {}),
    keys: [...existingDictionary.keys],
    values: existingDictionary.values.map((values) => [...values]),
  };

  const addValue = (valuePath: string, value: ParameterValue) => {
    let keyIndex = dictionary.keys.indexOf(valuePath);

    if (keyIndex === -1) {
      keyIndex = dictionary.keys.length;
      dictionary.keys.push(valuePath);
      dictionary.values.push([]);
    }

    if (
      !dictionary.values[keyIndex].some((candidate) =>
        Object.is(candidate, value)
      )
    ) {
      dictionary.values[keyIndex].push(value);
    }
  };

  const extractValue = (value: any, currentPath: string) => {
    if (typeof value === "number" && !Number.isFinite(value)) {
      throw new Error(`Parameter ${currentPath} must be a finite number.`);
    }
    if (isParameterValue(value) && shouldSerializePath(currentPath)) {
      addValue(currentPath, value);
    } else if (Array.isArray(value)) {
      value.forEach((item) => extractValue(item, currentPath));
    } else if (
      value &&
      typeof value === "object" &&
      !(value as any).isVector3 &&
      !(value as any).isEuler
    ) {
      for (const [key, childValue] of Object.entries(value)) {
        const childPath = currentPath ? `${currentPath}__${key}` : key;
        extractValue(childValue, childPath);
      }
    }
  };

  objects.forEach((object) => extractValue(object, path));

  assertValidParameterDictionary(dictionary);
  return dictionary;
}

export function reconstructFromReference(
  reference: number[][] | string,
  dictionary: ParameterDictionary
): any {
  assertValidParameterDictionary(dictionary);
  const result: any = {};

  // number[][] is the canonical MessagePack representation.  Keep accepting
  // the old comma-separated debug representation for local tooling.
  const refs =
    typeof reference === "string"
      ? reference
          .split(",")
          .filter(Boolean)
          .map((entry) => entry.split(":").map(Number))
      : reference;

  for (const ref of refs) {
    if (
      ref.length !== 2 ||
      !Number.isInteger(ref[0]) ||
      !Number.isInteger(ref[1])
    ) {
      throw new Error(`Invalid parameter reference ${JSON.stringify(ref)}.`);
    }
    const [keyIndex, valueIndex] = ref;
    if (keyIndex < 0 || keyIndex >= dictionary.keys.length) {
      throw new Error(`Parameter key index ${keyIndex} is out of range.`);
    }
    if (valueIndex < 0 || valueIndex >= dictionary.values[keyIndex].length) {
      throw new Error(`Parameter value index ${valueIndex} is out of range.`);
    }

    const path = dictionary.keys[keyIndex];
    const value = dictionary.values[keyIndex][valueIndex];

    let current = result;
    const parts = path.split("__");

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!current[part]) current[part] = {};
      current = current[part];
    }

    current[parts[parts.length - 1]] = value;
  }

  return result;
}
