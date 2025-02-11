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
  const seenValues: Map<string, Set<string>> = new Map();

  existingDictionary.keys.forEach((key, index) => {
    seenValues.set(key, new Set(existingDictionary.values[index]));
  });

  for (const obj of objects) {
    const extractFromObject = (currentObj: any, currentPath: string) => {
      if (!currentObj || typeof currentObj !== "object") return;

      for (const [key, value] of Object.entries(currentObj)) {
        const newPath = currentPath ? `${currentPath}__${key}` : key;

        if (typeof value === "string") {
          if (!seenValues.has(newPath)) {
            seenValues.set(newPath, new Set());
          }
          seenValues.get(newPath)!.add(value);
        } else if (Array.isArray(value)) {
          value.forEach((item) => extractFromObject(item, newPath));
        } else if (
          value &&
          typeof value === "object" &&
          !(value as any).isVector3 &&
          !(value as any).isEuler
        ) {
          extractFromObject(value, newPath);
        }
      }
    };

    extractFromObject(obj, path);
  }

  const dictionary: ParameterDictionary = {
    keys: [],
    values: [],
  };

  for (const [path, values] of seenValues.entries()) {
    if (values.size > 0) {
      dictionary.keys.push(path);
      dictionary.values.push(Array.from(values).sort());
    }
  }

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
