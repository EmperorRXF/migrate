import { parseSettings, ParsedSettings } from "../src/settings";
import * as path from "path";

function sanitise(parsedSettings: ParsedSettings) {
  parsedSettings.migrationsFolder =
    "./" + path.relative(process.cwd(), parsedSettings.migrationsFolder);
}

const exampleConnectionString = "postgres://localhost:5432/dbname?ssl=1";
it("parses basic config", async () => {
  await parseSettings({
    connectionString: exampleConnectionString,
  });
});

it("throws error for missing connection string", async () => {
  await expect(parseSettings({})).rejects.toMatchInlineSnapshot(`
          [Error: Errors occurred during settings validation:
          - Setting 'connectionString': Expected a string, or for DATABASE_URL envvar to be set]
        `);
});

it("throws if shadow attempted but no shadow DB", async () => {
  await expect(
    parseSettings(
      {
        connectionString: exampleConnectionString,
      },
      true
    )
  ).rejects.toMatchInlineSnapshot(`
          [Error: Errors occurred during settings validation:
          - Setting 'shadowConnectionString': Expected a string, or for TEST_DATABASE_URL to be set
          - Could not determine the shadow database name, please ensure shadowConnectionString includes the database name.]
        `);
});

describe("actions", () => {
  it("parses string values into SQL actions", async () => {
    const parsedSettings = await parseSettings({
      connectionString: exampleConnectionString,
      afterReset: "foo.sql",
      afterAllMigrations: ["bar.sql", "baz.sql"],
    });
    expect(parsedSettings.afterReset).toEqual([{ _: "sql", file: "foo.sql" }]);
    expect(parsedSettings.afterAllMigrations).toEqual([
      { _: "sql", file: "bar.sql" },
      { _: "sql", file: "baz.sql" },
    ]);
    sanitise(parsedSettings);
    expect(parsedSettings).toMatchSnapshot();
  });

  it("parses SQL actions", async () => {
    const parsedSettings = await parseSettings({
      connectionString: exampleConnectionString,
      afterReset: "foo.sql",
      afterAllMigrations: [
        { _: "sql", file: "bar.sql" },
        { _: "sql", file: "baz.sql" },
      ],
    });
    expect(parsedSettings.afterReset).toEqual([{ _: "sql", file: "foo.sql" }]);
    expect(parsedSettings.afterAllMigrations).toEqual([
      { _: "sql", file: "bar.sql" },
      { _: "sql", file: "baz.sql" },
    ]);
    sanitise(parsedSettings);
    expect(parsedSettings).toMatchSnapshot();
  });

  it("parses command actions", async () => {
    const parsedSettings = await parseSettings({
      connectionString: exampleConnectionString,
      afterAllMigrations: [
        { _: "command", command: "pg_dump --schema-only" },
        { _: "command", command: "graphile-worker --once" },
      ],
    });
    expect(parsedSettings.afterReset).toEqual([]);
    expect(parsedSettings.afterAllMigrations).toEqual([
      { _: "command", command: "pg_dump --schema-only" },
      { _: "command", command: "graphile-worker --once" },
    ]);
    sanitise(parsedSettings);
    expect(parsedSettings).toMatchSnapshot();
  });

  it("parses mixed actions", async () => {
    const parsedSettings = await parseSettings({
      connectionString: exampleConnectionString,
      afterAllMigrations: [
        "foo.sql",
        { _: "sql", file: "bar.sql" },
        { _: "command", command: "pg_dump --schema-only" },
        { _: "command", command: "graphile-worker --once" },
      ],
    });
    expect(parsedSettings.afterReset).toEqual([]);
    expect(parsedSettings.afterAllMigrations).toEqual([
      { _: "sql", file: "foo.sql" },
      { _: "sql", file: "bar.sql" },
      { _: "command", command: "pg_dump --schema-only" },
      { _: "command", command: "graphile-worker --once" },
    ]);
    sanitise(parsedSettings);
    expect(parsedSettings).toMatchSnapshot();
  });
});
