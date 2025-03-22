import { ModelProperty } from "@typespec/compiler";
import { describe, it } from "vitest";
import { ZodType } from "../src/components/ZodType.jsx";
import { createTestRunner, expectRender } from "./utils.jsx";

describe("scalars", () => {
  it("works with boolean", async () => {
    const runner = await createTestRunner();
    const { booleanProp } = (await runner.compile(`
      model Test {
        @test
        booleanProp: boolean,
      }
    `)) as Record<string, ModelProperty>;

    expectRender(<ZodType type={booleanProp.type} />, "z.boolean()");
  });

  it("works with string", async () => {
    const runner = await createTestRunner();
    const { stringProp, shortStringProp, urlProp, uuidProp, patternProp } = (await runner.compile(`
      @maxLength(10)
      @minLength(5)
      scalar shortString extends string;

      @test
      @format("uuid")
      scalar uuidProp extends string;

      @test
      @pattern("[0-9]+")
      scalar patternProp extends string;
      

      model Test {
        @test stringProp: string,
        @test shortStringProp: shortString,
        @test urlProp: url
      }
    `)) as Record<string, ModelProperty>;

    expectRender(<ZodType type={stringProp.type} />, "z.string()");
    expectRender(<ZodType type={shortStringProp.type} />, "z.string().min(5).max(10)");
    expectRender(<ZodType type={urlProp.type} />, "z.string().url()");
    expectRender(<ZodType type={uuidProp} />, "z.string().uuid()");
    expectRender(<ZodType type={patternProp} />, "z.string().regex(/[0-9]+/)");
  });

  describe("numerics", () => {
    it("handles numeric constraints", async () => {
      const runner = await createTestRunner();
      const { int8WithMin, int8WithMinMax, int8WithMinExclusive, int8WithMinMaxExclusive } =
        (await runner.compile(`
      @test @minValue(-20) scalar int8WithMin extends int8;
      @test @minValue(-20) @maxValue(20) scalar int8WithMinMax extends int8;
      @test @minValueExclusive(2) scalar int8WithMinExclusive extends int8; 
      @test @minValueExclusive(2) @maxValueExclusive(20) scalar int8WithMinMaxExclusive extends int8;
    `)) as Record<string, ModelProperty>;
      expectRender(<ZodType type={int8WithMin} />, "z.number().int().gte(-20).lte(127)");
      expectRender(<ZodType type={int8WithMinMax} />, "z.number().int().gte(-20).lte(20)");
      expectRender(<ZodType type={int8WithMinExclusive} />, "z.number().int().gt(2).lte(127)");
      expectRender(<ZodType type={int8WithMinMaxExclusive} />, "z.number().int().gt(2).lt(20)");
    });

    it("works with integers", async () => {
      const runner = await createTestRunner();
      const { int8Prop, int16Prop, int32Prop, int64Prop } = (await runner.compile(`
        model Test {
          @test int8Prop: int8,
          @test int16Prop: int16,
          @test int32Prop: int32,
          @test int64Prop: int64,
        }
      `)) as Record<string, ModelProperty>;

      expectRender(<ZodType type={int8Prop.type} />, "z.number().int().gte(-128).lte(127)");
      expectRender(<ZodType type={int16Prop.type} />, "z.number().int().gte(-32768).lte(32767)");
      expectRender(
        <ZodType type={int32Prop.type} />,
        "z.number().int().gte(-2147483648).lte(2147483647)",
      );
      expectRender(
        <ZodType type={int64Prop.type} />,
        "z.bigint().gte(-9223372036854775808n).lte(9223372036854775807n)",
      );
    });

    it("works with unsigned integers", async () => {
      const runner = await createTestRunner();
      const { uint8Prop, uint16Prop, uint32Prop, uint64Prop, safeintProp } = (await runner.compile(`
      model Test {
        @test uint8Prop: uint8,
        @test uint16Prop: uint16,
        @test uint32Prop: uint32,
        @test uint64Prop: uint64,
        @test safeintProp: safeint,
      }
    `)) as Record<string, ModelProperty>;

      expectRender(<ZodType type={uint8Prop.type} />, "z.number().int().nonnegative().lte(255)");
      expectRender(<ZodType type={uint16Prop.type} />, "z.number().int().nonnegative().lte(65535)");
      expectRender(
        <ZodType type={uint32Prop.type} />,
        "z.number().int().nonnegative().lte(4294967295)",
      );
      expectRender(
        <ZodType type={uint64Prop.type} />,
        "z.number().int().nonnegative().lte(18446744073709551615)",
      );
      expectRender(<ZodType type={safeintProp.type} />, "z.number().int().safe()");
    });

    it("works with floats", async () => {
      const runner = await createTestRunner();
      const { float32Prop, float64Prop, floatProp } = (await runner.compile(`
        model Test {
          @test float32Prop: float32,
          @test float64Prop: float64,
          @test floatProp: float,
        }
      `)) as Record<string, ModelProperty>;

      expectRender(
        <ZodType type={float32Prop.type} />,
        "z.number().gte(-3.4028235e+38).lte(3.4028235e+38)",
      );
      expectRender(<ZodType type={float64Prop.type} />, "z.number()");
      expectRender(<ZodType type={floatProp.type} />, "z.number()");
    });

    it("works with decimals", async () => {
      const runner = await createTestRunner();
      const { decimalProp, decimal128Prop } = (await runner.compile(`
        model Test {
          @test decimalProp: decimal,
          @test decimal128Prop: decimal128,
        }
      `)) as Record<string, ModelProperty>;

      expectRender(<ZodType type={decimalProp.type} />, "z.number()");
      expectRender(<ZodType type={decimal128Prop.type} />, "z.number()");
    });
  });

  it("works with bytes", async () => {
    const runner = await createTestRunner();
    const { bytesProp } = (await runner.compile(`
      model Test {
        @test bytesProp: bytes,
      }
    `)) as Record<string, ModelProperty>;

    expectRender(<ZodType type={bytesProp.type} />, "z.any()");
  });

  it("works with date things", async () => {
    const runner = await createTestRunner();
    const { plainDateProp, plainTimeProp, utcDateTimeProp, offsetDateTimeProp, durationProp } =
      (await runner.compile(`
      model Test {
        @test plainDateProp: plainDate,
        @test plainTimeProp: plainTime,
        @test utcDateTimeProp: utcDateTime,
        @test offsetDateTimeProp: offsetDateTime
      }
    `)) as Record<string, ModelProperty>;

    expectRender(<ZodType type={plainDateProp.type} />, "z.coerce.date()");
    expectRender(<ZodType type={plainTimeProp.type} />, "z.string().time()");
    expectRender(<ZodType type={utcDateTimeProp.type} />, "z.coerce.date()");
    expectRender(<ZodType type={offsetDateTimeProp.type} />, "z.coerce.date()");
  });

  it("works with dates and encodings", async () => {
    const runner = await createTestRunner();
    const {
      int32Date,
      int64Date,
      rfc3339DateUtc,
      rfc3339DateOffset,
      rfc7231DateUtc,
      rfc7231DateOffset,
    } = await runner.compile(`
      @test
      @encode(DateTimeKnownEncoding.unixTimestamp, int32)
      scalar int32Date extends utcDateTime;
      
      @test
      @encode(DateTimeKnownEncoding.unixTimestamp, int64)
      scalar int64Date extends utcDateTime;

      @test
      @encode(DateTimeKnownEncoding.rfc3339)
      scalar rfc3339DateUtc extends utcDateTime;

      @test
      @encode(DateTimeKnownEncoding.rfc3339)
      scalar rfc3339DateOffset extends offsetDateTime;
      
      @test
      @encode(DateTimeKnownEncoding.rfc7231)
      scalar rfc7231DateUtc extends utcDateTime;

      @test
      @encode(DateTimeKnownEncoding.rfc7231)
      scalar rfc7231DateOffset extends offsetDateTime;
    `);

    expectRender(<ZodType type={int32Date} />, "z.number().int().gte(-2147483648).lte(2147483647)");
    expectRender(
      <ZodType type={int64Date} />,
      "z.bigint().gte(-9223372036854775808n).lte(9223372036854775807n)",
    );
    expectRender(<ZodType type={rfc3339DateUtc} />, "z.string().datetime()");
    expectRender(<ZodType type={rfc3339DateOffset} />, "z.string().datetime()");
    expectRender(<ZodType type={rfc7231DateUtc} />, "z.string()");
    expectRender(<ZodType type={rfc7231DateOffset} />, "z.string()");
  });

  it("works with durations and encodings", async () => {
    const runner = await createTestRunner();
    const { myDuration, isoDuration, secondsDuration, int64SecondsDuration } =
      await runner.compile(`
      @test
      @encode(DurationKnownEncoding.ISO8601)
      scalar isoDuration extends duration;

      @test
      @encode(DurationKnownEncoding.seconds, int32)
      scalar secondsDuration extends duration;
      
      @test
      @encode(DurationKnownEncoding.seconds, int64)
      scalar int64SecondsDuration extends duration;

      @test
      scalar myDuration extends duration;
    `);

    expectRender(<ZodType type={myDuration} />, "z.string().duration()");
    expectRender(<ZodType type={isoDuration} />, "z.string().duration()");
    expectRender(
      <ZodType type={secondsDuration} />,
      "z.number().int().gte(-2147483648).lte(2147483647)",
    );
    expectRender(
      <ZodType type={int64SecondsDuration} />,
      "z.bigint().gte(-9223372036854775808n).lte(9223372036854775807n)",
    );
  });

  it("works with unknown scalars", async () => {
    const runner = await createTestRunner();
    const { unknownScalar } = (await runner.compile(`
      @test scalar unknownScalar;
    `)) as Record<string, ModelProperty>;

    expectRender(<ZodType type={unknownScalar} />, "z.any()");
  });

  it("emits docs", async () => {
    const runner = await createTestRunner();
    const { unknownScalar } = (await runner.compile(`
      /** An unknown scalar */
      @test scalar unknownScalar;
    `)) as Record<string, ModelProperty>;

    expectRender(<ZodType type={unknownScalar} />, 'z.any().describe("An unknown scalar")');
  });
});
