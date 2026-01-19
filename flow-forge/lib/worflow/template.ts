export function resolveTemplate(
  template: any,
  variables: Record<string, any>
) {
  // Recursively replace variables in the template object
  function replaceVariables(obj: any): any {
    if (typeof obj === "string") {
      let result = obj;
      for (const key in variables) {
        const value = variables[key];
        const replacement =
          typeof value === "string" ? value : JSON.stringify(value);
        result = result.replaceAll(`{{${key}}}`, replacement);
      }
      return result;
    }

    if (Array.isArray(obj)) {
      return obj.map(replaceVariables);
    }

    if (typeof obj === "object" && obj !== null) {
      const newObj: any = {};
      for (const key in obj) {
        newObj[key] = replaceVariables(obj[key]);
      }
      return newObj;
    }

    return obj;
  }

  return replaceVariables(template);
}
