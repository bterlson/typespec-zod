import { expect, it } from "vitest";
import { createEmitterTestRunner } from "../utils.jsx";

async function emittedOrder(code: string): Promise<string[]> {
  const runner = await createEmitterTestRunner();
  await runner.compile(code);
  const { text } = await runner.program.host.readFile("typespec-zod/models.ts");
  return [...text.matchAll(/export const (\w+)/g)].map((m) => m[1]);
}

// A schema must be declared before any schema that references it (eager Zod
// `const`s can't forward-reference). Assert `dep` precedes `user`.
function expectDeclaredBefore(order: string[], dep: string, user: string) {
  expect(order).toContain(dep);
  expect(order).toContain(user);
  expect(order.indexOf(dep)).toBeLessThan(order.indexOf(user));
}

it("emits all declarations", async () => {
  const runner = await createEmitterTestRunner();
  await runner.compile(`
    model MyModel {
      id: string;
    }

    model MyModelArray is Array<MyModel> {}
    
    scalar MyScalar extends string;

    enum MyEnum {
      Value: 1
    }

    union MyFoo {
      1, 2
    }
  `);

  const { text } = await runner.program.host.readFile("typespec-zod/models.ts");

  expect(text.trim()).toMatchSnapshot();
});

it("handles references by doing a topological sort", async () => {
  const runner = await createEmitterTestRunner();
  await runner.compile(`
    union MyUnion {
      one: MyModelArray;
      two: MyModel;
    }

    model MyModelArray is Array<MyModel> {}

    model MyModel {
      id: string;
    }
  `);

  const { text } = await runner.program.host.readFile("typespec-zod/models.ts");

  expect(text.trim()).toMatchSnapshot();
});

// Each container references its dependencies only through a non-declaration
// composite (inline array, array-of-inline-union, inline union, tuple). The
// element declarations must still be ordered before the container. `Leaf` gives
// the elements their own dependency so a missed edge surfaces as a misorder.
it("orders inline-array element types before their container", async () => {
  const order = await emittedOrder(`
    model Catalogue { widgets: Widget[]; }
    model Widget { leaf: Leaf; }
    model Leaf { s: string; }
  `);
  expectDeclaredBefore(order, "widget", "catalogue");
});

it("orders elements of an array-of-inline-union before their container", async () => {
  const order = await emittedOrder(`
    model Holder { items: (A | B)[]; }
    model A { leaf: Leaf; }
    model B { leaf: Leaf; }
    model Leaf { s: string; }
  `);
  expectDeclaredBefore(order, "a", "holder");
  expectDeclaredBefore(order, "b", "holder");
});

it("orders members of an inline-union property before their container", async () => {
  const order = await emittedOrder(`
    model Holder { item: A | B; }
    model A { leaf: Leaf; }
    model B { leaf: Leaf; }
    model Leaf { s: string; }
  `);
  expectDeclaredBefore(order, "a", "holder");
  expectDeclaredBefore(order, "b", "holder");
});

it("orders members of a tuple property before their container", async () => {
  const order = await emittedOrder(`
    model Holder { pair: [A, B]; }
    model A { leaf: Leaf; }
    model B { leaf: Leaf; }
    model Leaf { s: string; }
  `);
  expectDeclaredBefore(order, "a", "holder");
  expectDeclaredBefore(order, "b", "holder");
});

it("handles the readme sample", async () => {
  const runner = await createEmitterTestRunner();
  await runner.compile(`

    model PetBase {
      age: uint8;
    
      @maxLength(20)
      name: string
    }
    
    model Dog extends PetBase {
      walksPerDay: safeint;
    }
    
    model Cat extends PetBase {
      belongingsShredded: uint64;
    }
    
    @discriminated
    union Pet {
      dog: Dog,
      cat: Cat,
    }
  `);

  const { text } = await runner.program.host.readFile("typespec-zod/models.ts");

  expect(text.trim()).toMatchSnapshot();
});

it("doesn't emit things from built-in libraries", async () => {
  const runner = await createEmitterTestRunner({}, true);
  await runner.compile(`
    model PetBase {
      age: uint8;
    
      @maxLength(20)
      name: string;
    }

    model RefHttp {
      foo: OkResponse;
    }
  `);

  const { text } = await runner.program.host.readFile("typespec-zod/models.ts");

  expect(text.trim()).toMatchSnapshot();
});
