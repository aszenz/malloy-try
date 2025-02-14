/*
 * THIS SOURCE CODE IS COPIED FROM malloy vscode extension AND IS SUBJECT TO IT'S COPYRIGHT NOTICE AND LICENSE TERMS
 * See https://github.com/malloydata/malloy-vscode-extension/blob/cde23d2459f4d7d4240d609b454cb9e8d47757e9/src/common/schema.ts
 */
import {
  AtomicFieldType,
  AtomicTypeDef,
  Explore,
  Field,
  JoinRelationship,
  ModelDef,
  RepeatedRecordTypeDef,
  StructDef,
  isSourceDef,
} from "@malloydata/malloy";

export type { ModelDef, Explore, Field };
export {
  fieldType,
  exploreSubtype,
  isFieldHidden,
  isFieldAggregate,
  getTypeLabel,
  quoteIfNecessary,
  getSourceDef,
};

type FieldType =
  | FieldSubType
  | "array"
  | keyof typeof AtomicFieldType
  | "query";

type FieldSubType = "base" | "many_to_one" | "one_to_many" | "one_to_one";

function isFieldAggregate(field: Field) {
  return field.isAtomicField() && field.isCalculation();
}

function fieldType(field: Field): FieldType {
  if (field.isExplore()) {
    if (field.isArray) {
      return "array";
    } else {
      return exploreSubtype(field);
    }
  } else {
    return field.isAtomicField()
      ? (field.type.toString() as keyof typeof AtomicFieldType)
      : "query";
  }
}

function exploreSubtype(explore: Explore): FieldSubType {
  let subtype: FieldSubType;
  if (explore.hasParentExplore()) {
    const relationship = explore.joinRelationship;
    subtype =
      relationship === JoinRelationship.ManyToOne
        ? "many_to_one"
        : relationship === JoinRelationship.OneToMany
          ? "one_to_many"
          : "one_to_one";
  } else {
    subtype = "base";
  }
  return subtype;
}

/**
 * Cache of compiled field hiding patterns so that for a given schema
 * view render, the pattern only needs to be compiled once. Uses a WeakMap
 * because the Explore object is typically re-created for each render.
 */
const hiddenFields = new WeakMap<
  Explore,
  { strings: string[]; pattern?: RegExp }
>();

/**
 * Guard created because TypeScript wasn't simply treating
 * `typeof tag === 'string` as a sufficient guard in filter()
 *
 * @param tag string | undefined
 * @returns true if tag is a string
 */
function isStringTag(tag: string | undefined): tag is string {
  return typeof tag === "string";
}

/**
 * Determine whether to hide a field in the schema viewer based on tags
 * applied to the source.
 *
 * `hidden = ["field1", "field2"]` will hide individual fields
 * `hidden.pattern = "^_"` will hide fields that match the regular expression
 * /^_/. They can be combined.
 *
 * @param field A Field object
 * @returns true if field should not be displayed in schema viewer
 */
function isFieldHidden(field: Field): boolean {
  const { name, parentExplore } = field;
  let hidden = hiddenFields.get(parentExplore);
  if (!hidden) {
    const { tag } = parentExplore.tagParse();
    const strings =
      tag
        .array("hidden")
        ?.map((tag) => tag.text())
        .filter(isStringTag) || [];

    const patternText = tag.text("hidden", "pattern");
    const pattern = patternText ? new RegExp(patternText) : undefined;

    hidden = { strings, pattern };
    hiddenFields.set(field.parentExplore, hidden);
  }
  return !!(hidden.pattern?.test(name) || hidden.strings.includes(name));
}

/**
 * Add `` around path elements that have special characters or are in
 * the list of reserved words
 * @param element A field path element
 * @returns A potentially quoted field path element
 */
function quoteIfNecessary(element: string) {
  // Quote if contains non-word characters
  if (/\W/.test(element) || RESERVED.includes(element.toUpperCase())) {
    return `\`${element}\``;
  }
  return element;
}

/**
 * Retrieve a source from a model safely
 *
 * @param modelDef Model definition
 * @param sourceName Source name
 * @returns SourceDef for given name, or throws if not a source
 */

function getSourceDef(modelDef: ModelDef, sourceName: string) {
  const result = modelDef.contents[sourceName];
  if (isSourceDef(result)) {
    return result;
  }
  throw new Error(`Not a source: ${sourceName}`);
}

/*
 * It would be nice if these types made it out of Malloy, or if this
 * functionality moved into core Malloy
 */

type NativeUnsupportedTypeDef = {
  type: "sql native";
  rawType?: string;
};

type RecordElementTypeDef = {
  type: "record_element";
};

type TypeDef =
  | RepeatedRecordTypeDef
  | AtomicTypeDef
  | NativeUnsupportedTypeDef
  | RecordElementTypeDef;

const getTypeLabelFromStructDef = (structDef: StructDef): string => {
  const getTypeLabelFromTypeDef = (typeDef: TypeDef): string => {
    if (typeDef.type === "array") {
      return `${getTypeLabelFromTypeDef(typeDef.elementTypeDef)}[]`;
    }
    if (typeDef.type === "sql native" && typeDef.rawType) {
      return `${typeDef.type} (${typeDef.rawType})`;
    }
    return typeDef.type;
  };

  if (structDef.type === "array") {
    return `${getTypeLabelFromTypeDef(structDef.elementTypeDef)}[]`;
  }
  return structDef.type;
};

const getTypeLabel = (field: Field): string => {
  if (field.isExplore()) {
    if (field.isArray) {
      return getTypeLabelFromStructDef(field.structDef);
    } else {
      return "";
    }
  }
  const type = fieldType(field);
  if (field.isAtomicField() && field.isUnsupported()) {
    return `${type} ${undefined !== field.rawType ? `(${field.rawType})` : ""}}`;
  }
  return type;
};

const RESERVED: string[] = [
  "ALL",
  "AND",
  "AS",
  "ASC",
  "AVG",
  "BOOLEAN",
  "BY",
  "CASE",
  "CAST",
  "CONDITION",
  "COUNT",
  "DATE",
  "DAY",
  "DAYS",
  "DESC",
  "DISTINCT",
  "ELSE",
  "END",
  "EXCLUDE",
  "EXTEND",
  "FALSE",
  "FULL",
  "FOR",
  "FROM",
  "FROM_SQL",
  "HAS",
  "HOUR",
  "HOURS",
  "IMPORT",
  "INNER",
  "IS",
  "JSON",
  "LAST",
  "LEFT",
  "MAX",
  "MIN",
  "MINUTE",
  "MINUTES",
  "MONTH",
  "MONTHS",
  "NOT",
  "NOW",
  "NULL",
  "NUMBER",
  "ON",
  "OR",
  "PICK",
  "QUARTER",
  "QUARTERS",
  "RIGHT",
  "SECOND",
  "SECONDS",
  "STRING",
  "SOURCE_KW",
  "SUM",
  "SQL",
  "TABLE",
  "THEN",
  "THIS",
  "TIMESTAMP",
  "TO",
  "TRUE",
  "TURTLE",
  "WEEK",
  "WEEKS",
  "WHEN",
  "WITH",
  "YEAR",
  "YEARS",
  "UNGROUPED",
] as const;
