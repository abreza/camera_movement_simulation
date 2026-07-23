export type ParameterDictionary = {
  keys: string[];
  values: string[][];
};

export function createParameterReference(
  obj: any,
  dictionary: ParameterDictionary,
  path: string = ""
): number[][] {
  const references: number[][] = [];

  const processValue = (value: any, path: string) => {
    if (typeof value === "string") {
      const keyIndex = dictionary.keys.indexOf(path);
      if (keyIndex === -1) return;

      const valueIndex = dictionary.values[keyIndex].indexOf(value);
      if (valueIndex === -1) return;

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
  existingDictionary: ParameterDictionary = { keys: [], values: [] },
  path: string = ""
): ParameterDictionary {
  const dictionary: ParameterDictionary = {
    keys: [...existingDictionary.keys],
    values: existingDictionary.values.map((values) => [...values]),
  };

  const addValue = (valuePath: string, value: string) => {
    let keyIndex = dictionary.keys.indexOf(valuePath);

    if (keyIndex === -1) {
      keyIndex = dictionary.keys.length;
      dictionary.keys.push(valuePath);
      dictionary.values.push([]);
    }

    if (!dictionary.values[keyIndex].includes(value)) {
      dictionary.values[keyIndex].push(value);
    }
  };

  const extractValue = (value: any, currentPath: string) => {
    if (typeof value === "string") {
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

  return dictionary;
}

export function reconstructFromReference(
  reference: string,
  dictionary: ParameterDictionary
): any {
  const result: any = {};

  const refs = reference.split(",");
  for (const ref of refs) {
    const [keyIndex, valueIndex] = ref.split(":").map(Number);
    if (keyIndex < 0 || keyIndex >= dictionary.keys.length) continue;

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
