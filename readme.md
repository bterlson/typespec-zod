# TypeSpec Zod

Emit Zod types from TypeSpec types. Supports all data types in TypeSpec:
scalars, literals, unions, models, arrays, records, enums, tuples, and
intrinsics. Supports all built-in metadata about these including documentation,
value constraints, scalar constructors, discriminated unions, and so forth.

This package also exports TypeSpec Emitter Framework components for placing Zod
schemas within other emitter projects.

## Getting Started

### TypeSpec Emitter

1. `> tsp install typespec-zod`
2. `> tsp compile . --emit typespec-zod`

### Component Library

1. `> npm install typespec-zod`

Note: requires peer dependencies for `@typespec/compiler`,
`@typespec/emitter-framework`, `@alloy-js/core`, and `@alloy-js/typescript`.

## Emitter Example

Input TypeSpec:

```tsp
model PetBase {
  kind: string;
  age: uint8;

  @maxLength(20)
  name: string
}

model Dog extends PetBase {
  @maxValue(10);
  walksPerDay: uint8;
}

model Cat extends PetBase {
  belongingsShredded: uint64;
}

@discriminated
union Pet { Dog, Cat }
```

Compiles to:

```ts
import { z } from "zod";

export const petBase = z.object({
  age: z.number().int().nonnegative().lte(255),
  name: z.string().max(20),
});

export const dog = z.petBase.merge(
  z.object({
    walksPerDay: z.number().int().safe(),
  }),
);

export const cat = z.petBase.merge(
  z.object({
    belongingsShredded: z.bigint().nonnegative().lte(18446744073709551615),
  }),
);

export const pet = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("dog"),
    value: dog,
  }),
  z.object({
    kind: z.literal("cat"),
    value: cat,
  }),
]);
```

## Library Example

```tsx
import {
  zod, // symbol definitions for the Zod library
  ZodSchemaDeclaration, // component to declare a Zod schema
} from "typespec-zod";
import { For, Output } from "@alloy-js/core";
import { SourceFile } from "@alloy-js/typescript";
import { writeOutput } from "@typespec/emitter-framework";

export async function $onEmit(context: EmitContext) {
  // get the types you're interested in
  const models = getAllModels(context);

  await writeOutput(
    <Output externals={[zod]}>
      <SourceFile path="zod-types.ts">
        <For each={models}>
          {(model) => <ZodSchemaDeclaration export type={model} />}
        </For>
      </SourceFile>
    </Output>,
    context.emitterOutputDir,
  );
}
```

## Emitter Documentation

The emitter will emit Zod schemas for all user-defined types and types which are
reachable from user-defined types with the exception of types in the TypeSpec
namespace. So in particular:

- User-defined types which reference built-in scalars or models will emit the
  Zod schema for the referenced scalar inline rather than create a declaration
- User-defined types which reference models from the standard library will emit
  the Zod schema for the referenced model inline rather than create a
  declaration
- User-defined types which reference types in third party libraries will emit a
  declaration for the referenced type and reference that declaration.
- Non-user-defined types that are not referenced by user-defined types will not
  be emitted.

## Library Documentation

### `<ZodSchemaDeclaration>` component

Declares a Zod schema in a variable binding (let, const, or var).

#### Props

| prop        | type               | description                                               |
| ----------- | ------------------ | --------------------------------------------------------- |
| **type**    | Type               | The TypeSpec type to create a zod schema for.             |
| **name**    | string (optional)  | The name of the declaration, defaults to the Type's name. |
| **const**   | boolean (optional) | Emit a const declaration.                                 |
| **let**     | boolean (optional) | Emit a let declaration.                                   |
| **var**     | boolean (optional) | Emit a var declaration.                                   |
| **export**  | boolean (optional) | Export the declaration.                                   |
| **default** | boolean (optional) | Default export the declaration.                           |
| **refkeys** | Refkey[]           | Refkeys for the symbol created by this declaration.       |

### `<ZodSchema>` Component

Convert the given type to a Zod schema expression.

#### Props

| prop     | type | description                                   |
| -------- | ---- | --------------------------------------------- |
| **type** | Type | the TypeSpec type to create a zod schema for. |
