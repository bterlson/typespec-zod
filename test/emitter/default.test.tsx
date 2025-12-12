import { expect, it } from "vitest";
import { createEmitterTestRunner } from "../utils.jsx";

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
