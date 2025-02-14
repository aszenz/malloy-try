/*
 * THIS SOURCE CODE IS DERIVED FROM malloy vscode extension AND IS SUBJECT TO IT'S COPYRIGHT NOTICE AND LICENSE TERMS
 * REPO: https://github.com/malloydata/malloy-vscode-extension
 * FILE: https://github.com/malloydata/malloy-vscode-extension/blob/cde23d2459f4d7d4240d609b454cb9e8d47757e9/src/extension/webviews/components/SchemaRenderer.tsx
 */
import * as React from "react";
import { Explore, Field, NamedQuery, QueryField } from "@malloydata/malloy";

import {
  exploreSubtype,
  fieldType,
  getTypeLabel,
  isFieldAggregate,
  isFieldHidden,
} from "./schema";
import ArrayIcon from "../img/data-type-array.svg?react";
import BooleanIcon from "../img/boolean.svg?react";
import ChevronRightIcon from "../img/chevron_right.svg?react";
import ChevronDownIcon from "../img/chevron_down.svg?react";
import ManyToOneIcon from "../img/many_to_one.svg?react";
import NumberIcon from "../img/number.svg?react";
import NumberAggregateIcon from "../img/number-aggregate.svg?react";
import OneToManyIcon from "../img/one_to_many.svg?react";
import OneToOneIcon from "../img/one_to_one.svg?react";
import QueryIcon from "../img/turtle.svg?react";
import RecordIcon from "../img/data-type-json.svg?react";
import SqlNativeIcon from "../img/sql-database.svg?react";
import StringIcon from "../img/string.svg?react";
import TimeIcon from "../img/time.svg?react";
import UnknownIcon from "../img/unknown.svg?react";

export { SchemaRenderer };
export type { SchemaRendererProps };

type SchemaRendererProps = {
  explores: Explore[];
  queries: NamedQuery[];
  onFieldClick?: (field: Field) => void;
  onQueryClick?: (query: NamedQuery | QueryField) => void;
  onPreviewClick?: (explore: Explore) => void;
  defaultShow: boolean;
};

function SchemaRenderer({
  explores,
  queries,
  onFieldClick,
  onQueryClick,
  onPreviewClick,
  defaultShow,
}: SchemaRendererProps) {
  const hidden = !defaultShow;

  return (
    <div className="schema">
      <ul>
        <li>
          <div className="field_list">
            {queries.sort(sortByName).map((query) => (
              <QueryItem
                key={query.name}
                query={query}
                path={query.name}
                onQueryClick={onQueryClick}
              />
            ))}
          </div>
        </li>
        {explores.sort(sortByName).map((explore) => (
          <StructItem
            key={explore.name}
            explore={explore}
            path=""
            onFieldClick={onFieldClick}
            onPreviewClick={onPreviewClick}
            onQueryClick={onQueryClick}
            startHidden={hidden}
          />
        ))}
      </ul>
    </div>
  );
}

type FieldItemProps = {
  field: Field;
  path: string;
  onFieldClick?: (field: Field) => void;
};

function FieldItem({ field, path, onFieldClick }: FieldItemProps) {
  const context = {
    webviewSection: "malloySchemaField",
    ...fieldContext(field),
  };

  const onClick = () => {
    onFieldClick?.(field);
  };

  const clickable = onFieldClick ? "clickable" : "";

  return (
    <div
      className={`field ${clickable}`}
      title={buildTitle(field, path)}
      onClick={onClick}
      data-vscode-context={JSON.stringify(context)}
    >
      {getIconElement(fieldType(field), isFieldAggregate(field))}
      <span className="field_name">{field.name}</span>
    </div>
  );
}

type QueryItemProps = {
  query: NamedQuery | QueryField;
  path: string;
  onQueryClick?: (query: NamedQuery | QueryField) => void;
};

const QueryItem = ({ query, path, onQueryClick }: QueryItemProps) => {
  const onClick = () => {
    onQueryClick?.(query);
  };

  const clickable = onQueryClick ? "clickable" : "";
  let context: Record<string, unknown> = {};

  if ("parentExplore" in query) {
    context = {
      webviewSection: "malloySchemaQuery",
      ...fieldContext(query),
    };
  } else {
    context = {
      webviewSection: "malloySchemaNamedQuery",
      name: query.name,
      location: query.location,
      preventDefaultContextMenuItems: true,
    };
  }

  const title = `${query.name}\nPath: ${path}${path ? "." : ""}${query.name}`;

  return (
    <div
      className={`field ${clickable}`}
      onClick={onClick}
      data-vscode-context={JSON.stringify(context)}
    >
      {getIconElement("query", false)}
      <span title={title} className="field_name">
        {query.name}
      </span>
    </div>
  );
};

type StructItemProps = {
  explore: Explore;
  path: string;
  onFieldClick?: (field: Field) => void;
  onQueryClick?: (query: NamedQuery | QueryField) => void;
  onPreviewClick?: (explore: Explore) => void;
  startHidden: boolean;
};

function StructItem({
  explore,
  path,
  onFieldClick,
  onQueryClick,
  onPreviewClick,
  startHidden,
}: StructItemProps) {
  const [hidden, setHidden] = React.useState(startHidden);

  const toggleHidden = () => {
    setHidden(!hidden);
  };

  const onClick = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    onPreviewClick?.(explore);
  };

  function fieldList(fields: Field[], path: string) {
    return (
      <div className="field_list">
        {fields.map((field) =>
          field.isQueryField() ? (
            <QueryItem
              key={field.name}
              query={field}
              path={path}
              onQueryClick={onQueryClick}
            />
          ) : (
            <FieldItem
              key={field.name}
              field={field}
              path={path}
              onFieldClick={onFieldClick}
            />
          ),
        )}
      </div>
    );
  }

  const subtype = exploreSubtype(explore);
  const { queries, dimensions, measures, explores } = bucketFields(
    explore.allFields,
  );

  const buildPath = (explore: Explore, path: string): string => {
    if (path) {
      return `${path}.${explore.name}`;
    } else {
      return explore.name;
    }
  };

  const classes = `schema ${hidden ? "hidden" : ""}`;

  return (
    <li className={classes}>
      <div onClick={toggleHidden}>
        <span className="chevron">
          {hidden ? (
            <ChevronRightIcon width={22} height={22} />
          ) : (
            <ChevronDownIcon width={22} height={22} />
          )}
        </span>
        {getIconElement(`struct_${subtype}`, false)}
        <b className="explore_name">{getExploreName(explore, path)}</b>
        {onPreviewClick ? (
          <span className="preview" onClick={onClick}>
            {" "}
            Preview{" "}
          </span>
        ) : null}
      </div>
      <ul>
        {queries.length ? (
          <li className="fields">
            <label>Views</label>
            {fieldList(queries, path)}
          </li>
        ) : null}
        {dimensions.length ? (
          <li className="fields">
            <label>Dimensions</label>
            {fieldList(dimensions, path)}
          </li>
        ) : null}
        {measures.length ? (
          <li className="fields">
            <label>Measures</label>
            {fieldList(measures, path)}
          </li>
        ) : null}
        {explores.length
          ? explores.map((explore) => (
              <StructItem
                key={explore.name}
                explore={explore}
                path={buildPath(explore, path)}
                onFieldClick={onFieldClick}
                onPreviewClick={onPreviewClick}
                onQueryClick={onQueryClick}
                startHidden={true}
              />
            ))
          : null}
      </ul>
    </li>
  );
}

const sortByName = (a: { name: string }, b: { name: string }) =>
  a.name.localeCompare(b.name);

const fieldContext = (field: Field) => {
  const { fieldPath: accessPath, location, name } = field;
  const topLevelExplore = accessPath.shift();

  return {
    accessPath,
    location,
    name,
    topLevelExplore,
    preventDefaultContextMenuItems: true,
  };
};
/**
 * Bucket fields by type and sort by name.
 *
 * @param fields Source fields
 * @returns An objects with four arrays, one for each of queries, dimensions,
 *   measures and explores/sources, sorted by name
 */

function bucketFields(fields: Field[]) {
  const queries: Field[] = [];
  const dimensions: Field[] = [];
  const measures: Field[] = [];
  const explores: Explore[] = [];

  for (const field of fields) {
    const type = fieldType(field);

    if (!isFieldHidden(field)) {
      if (isFieldAggregate(field)) {
        measures.push(field);
      } else if (field.isExploreField()) {
        if (field.isArray) {
          dimensions.push(field);
        } else {
          explores.push(field);
        }
      } else if (type === "query") {
        queries.push(field);
      } else {
        dimensions.push(field); // && !isFieldHidden(field);
      }
    }
  }

  return {
    queries: queries.sort(sortByName),
    dimensions: dimensions.sort(sortByName),
    measures: measures.sort(sortByName),
    explores: explores.sort(sortByName),
  };
}

/**
 * Returns the corresponding icon for fields and relationships.
 *
 * @param fieldType Field type and returned by fieldType()
 * @param isAggregate Field aggregate status as returned from isFieldAggregate()
 * @returns A React wrapped svg of the icon.
 */
function getIconElement(fieldType: string, isAggregate: boolean) {
  let imageElement: React.JSX.Element | null;
  if (isAggregate) {
    imageElement = <NumberAggregateIcon />;
  } else {
    switch (fieldType) {
      case "array":
        imageElement = <ArrayIcon />;
        break;
      case "struct_record":
        imageElement = <RecordIcon />;
        break;
      case "number":
        imageElement = <NumberIcon />;
        break;
      case "string":
        imageElement = <StringIcon />;
        break;
      case "date":
      case "timestamp":
        imageElement = <TimeIcon />;
        break;
      case "struct_base":
        imageElement = null;
        break;
      case "struct_one_to_many":
        imageElement = <OneToManyIcon />;
        break;
      case "struct_one_to_one":
        imageElement = <OneToOneIcon />;
        break;
      case "struct_many_to_one":
        imageElement = <ManyToOneIcon />;
        break;
      case "boolean":
        imageElement = <BooleanIcon />;
        break;
      case "query":
        imageElement = <QueryIcon />;
        break;
      case "sql native":
        imageElement = <SqlNativeIcon />;
        break;
      default:
        imageElement = <UnknownIcon />;
    }
  }

  return imageElement;
}

/**
 * Preview schema have non-friendly names like '__stage0', give them
 * something friendlier.
 */
function getExploreName(explore: Explore, path: string) {
  if (explore.name.startsWith("__stage")) {
    if (explore.parentExplore) {
      return explore.parentExplore.name;
    }
    return "Preview";
  }
  return path ? path : explore.name;
}

/**
 * Generate some information for the tooltip over Field components.
 * Typically includes name, type and path
 *
 * @param field Field or explore to generate tooltip for
 * @param path Path to this field
 * @returns Tooltip text
 */
function buildTitle(field: Field, path: string) {
  const typeLabel = getTypeLabel(field);
  const fieldName = field.name;
  return `${fieldName}
Path: ${path}${path ? "." : ""}${fieldName}
Type: ${typeLabel}`;
}
