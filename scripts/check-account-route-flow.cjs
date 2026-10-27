const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const { mkdtempSync, rmSync, readFileSync } = require("node:fs");
const ts = require("typescript");
const vm = require("node:vm");
const destinations = {};
vm.runInNewContext(ts.transpileModule(readFileSync("lib/auth-destination.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports: destinations });
const { authDestination } = destinations;
const { tmpdir } = require("node:os");
const path = require("node:path");
const Database = require("better-sqlite3");
const work = mkdtempSync(path.join(tmpdir(), "voltroute-account-")),
  dbPath = path.join(work, "accounts.db");
let child,
  cookie = "";
const port = Number(process.env.TEST_PORT || 3197),
  base = `http://127.0.0.1:${port}`;
async function request(url, body, method) {
  const response = await fetch(base + url, {
    redirect: "manual",
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { Cookie: cookie } : {}),
    },
    ...(body !== undefined
      ? {
          method: method || "POST",
          body: typeof body === "string" ? body : JSON.stringify(body),
        }
      : {}),
  });
  return { response, data: await response.json().catch(() => null) };
}
async function start() {
  child = spawn(
    process.execPath,
    ["node_modules/next/dist/bin/next", "start", "--port", String(port)],
    {
      env: { ...process.env, DB_PATH: dbPath },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  let output = "";
  child.stdout.on("data", (c) => (output += c));
  child.stderr.on("data", (c) => (output += c));
  for (let i = 0; i < 150; i++) {
    if (child.exitCode !== null) throw Error(output);
    try {
      if ((await fetch(base + "/login")).ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  throw Error(output);
}
async function stop() {
  if (!child || child.exitCode !== null) return;
  const end = new Promise((r) => child.once("exit", r));
  child.kill("SIGTERM");
  await end;
}
(async () => {
  await start();
  const entry = await request("/");
  assert.equal(entry.response.status, 200);
  assert.equal(entry.response.headers.get("location"), null);
  for (const page of ["/login", "/register", "/profile", "/planner"])
    assert.equal((await request(page)).response.status, 200);
  assert.equal((await request("/api/profile")).response.status, 401);
  assert.equal(
    (
      await request("/api/auth/register", {
        name: " ",
        email: "bad",
        password: "123",
      })
    ).response.status,
    400,
  );
  assert.equal((await request("/api/auth/register", "{")).response.status, 400);
  const registered = await request("/api/auth/register", {
    name: "Test Driver",
    email: " DRIVER@example.com ",
    password: "correct horse battery",
    vehicle: { make: "Tata", model: "Nexon EV", battery_capacity_kwh: 45, current_range_km: 350, max_charging_power_kw: 60, connector_types: ["CCS2"] },
  });
  assert.equal(registered.response.status, 201);
  const userId = registered.data.user.id;
  assert.equal(registered.data.user.email, "driver@example.com");
  assert.ok(!registered.data.user.password_hash);
  const setCookie = registered.response.headers.get("set-cookie");
  assert.match(setCookie, /HttpOnly/i);
  assert.match(setCookie, /SameSite=lax/i);
  cookie = setCookie.split(";")[0];
  assert.equal((await request("/")).response.status, 200);
  assert.equal((await request("/api/auth/me")).data.user.name, "Test Driver");
  assert.equal((await request("/api/vehicles")).data.vehicles.length, 1, "Car is saved during driver signup");
  assert.equal(authDestination(registered.data.user), "/planner");
  assert.equal(authDestination(registered.data.user, "//external.example"), "/planner");
  assert.equal(authDestination(registered.data.user, "/operator"), "/planner");
  assert.equal(authDestination(registered.data.user, "/profile#bookings"), "/profile#bookings");
  assert.equal(
    (
      await request("/api/auth/register", {
        name: "Again",
        email: "DRIVER@example.com",
        password: "another password",
      })
    ).response.status,
    409,
  );
  assert.equal(
    (
      await request("/api/auth/login", {
        email: "driver@example.com",
        password: "wrong",
      })
    ).response.status,
    401,
  );
  assert.equal((await request("/api/auth/login", "{")).response.status, 400);
  const profile = await request("/api/profile");
  assert.equal(profile.response.status, 200);
  assert.equal(profile.data.user.id, userId);
  assert.equal(profile.data.stats.total_bookings, 0);
  assert.equal(
    (await request("/api/profile", { name: " " }, "PUT")).response.status,
    400,
  );
  assert.equal(
    (await request("/api/profile", { phone: { bad: true } }, "PUT")).response
      .status,
    400,
  );
  const updated = await request(
    "/api/profile",
    { name: "Updated Driver", phone: "9876543210" },
    "PUT",
  );
  assert.equal(updated.response.status, 200);
  assert.equal(updated.data.user.name, "Updated Driver");
  assert.equal(updated.data.user.phone, "9876543210");
  const cleared = await request(
    "/api/profile",
    { name: "Updated Driver", phone: "" },
    "PUT",
  );
  assert.equal(cleared.response.status, 200);
  assert.equal(cleared.data.user.phone, null);
  await stop();
  const db = new Database(dbPath);
  const saved = db
    .prepare("SELECT name,email,password_hash FROM users WHERE id=?")
    .get(userId);
  assert.equal(saved.name, "Updated Driver");
  assert.equal(saved.email, "driver@example.com");
  assert.ok(saved.password_hash.startsWith("$2"));
  assert.notEqual(saved.password_hash, "correct horse battery");
  db.close();
  await start();
  assert.equal(
    (await request("/api/auth/me")).data.user.name,
    "Updated Driver",
  );
  assert.equal((await request("/api/profile")).data.user.phone, null);
  const login = await request("/api/auth/login", {
    email: "DRIVER@EXAMPLE.COM",
    password: "correct horse battery",
  });
  assert.equal(login.response.status, 200);
  cookie = login.response.headers.get("set-cookie").split(";")[0];
  const logout = await request("/api/auth/logout", {});
  assert.match(logout.response.headers.get("set-cookie"), /Max-Age=0/);
  cookie = "";
  assert.equal((await request("/api/auth/me")).response.status, 401);
  assert.equal((await request("/api/profile")).response.status, 401);
  const operator = await request("/api/auth/login", { email: "khalapur.admin@voltroute.app", password: "operator123" });
  assert.equal(operator.response.status, 200);
  assert.equal(operator.data.user.is_operator, true);
  assert.equal(authDestination(operator.data.user, "/planner"), "/operator");
  const providerSignup = await request("/api/auth/register", { name: "Test Provider", email: "provider@example.com", password: "provider-test-password", account_type: "operator", station_id: "khalapur" });
  assert.equal(providerSignup.response.status, 201);
  assert.equal(providerSignup.data.user.is_operator, true);
  assert.equal(authDestination(providerSignup.data.user), "/operator");
  assert.equal(authDestination({ role: "admin" }), "/operator");
  console.log(
    "PASS: public landing, direct driver/provider workspace routing, signup with saved car, login/account/planner pages, persistent signup and profile updates, hashed passwords, duplicate and invalid login, cookie restore across restart, input validation, phone clearing, and logout.",
  );
})()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await stop();
    rmSync(work, { recursive: true, force: true });
  });
