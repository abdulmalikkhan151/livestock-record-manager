import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("project is independent from ChatGPT Sites runtime", async () => {
  const packageJson = JSON.parse(await read("package.json"));
  const page = await read("app/page.tsx");
  assert.equal(packageJson.scripts.build, "next build");
  assert.ok(packageJson.dependencies["@supabase/ssr"]);
  assert.doesNotMatch(page, /chatgpt-auth|signout-with-chatgpt/i);
});

test("owner and staff permissions are enforced in server routes", async () => {
  const animals = await read("app/api/animals/route.ts");
  const records = await read("app/api/animals/[id]/records/route.ts");
  const team = await read("app/api/team/route.ts");
  assert.match(animals, /user\.role !== "owner"/);
  assert.match(records, /user\.role !== "owner"/);
  assert.match(team, /currentUser\.role !== "owner"/);
});

test("database includes every requested animal and history table", async () => {
  const migration = await read("supabase/migrations/0001_initial.sql");
  for (const name of ["animals", "weight_records", "health_records", "expense_records", "sale_records", "attachments", "staff_invitations", "activity_logs"]) {
    assert.match(migration, new RegExp(`create table public\\.${name}`));
  }
  assert.match(migration, /'Cow', 'Buffalo', 'Goat', 'Camel'/);
  assert.match(migration, /enable row level security/);
});

test("existing databases can be upgraded with camel support", async () => {
  const migration = await read("supabase/migrations/0002_add_camel.sql");
  assert.match(migration, /alter type public\.animal_species add value if not exists 'Camel'/);
});

test("PWA does not cache authenticated pages or API responses", async () => {
  const worker = await read("public/sw.js");
  assert.doesNotMatch(worker, /SHELL = \["\/"/);
  assert.match(worker, /pathname\.startsWith\("\/api\/"\)/);
  assert.match(worker, /caches\.match\("\/offline"\)/);
});
