import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { getDb } from "./db";
import { attachSession, signToken } from "./auth";
import { ensureInit } from "./init";
import { isStationOperator } from "./planner-stations";
import { parseVehicle } from "./vehicle-input";
export async function accountRequest(req: NextRequest, register: boolean) {
  try {
    ensureInit();
    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Enter valid account details." },
        { status: 400 },
      );
    }
    const email =
      typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = body?.password;
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const stationId =
      register && body?.account_type === "operator"
        ? typeof body?.station_id === "string"
          ? body.station_id
          : ""
        : null;
    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      email.length > 200 ||
      typeof password !== "string" ||
      !password ||
      Buffer.byteLength(password, "utf8") > 72
    )
      return NextResponse.json(
        { error: "Enter a valid email and a password of up to 72 bytes." },
        { status: 400 },
      );
    if (register && (!name || name.length > 100 || password.length < 8))
      return NextResponse.json(
        { error: "Enter your name and a password with at least 8 characters." },
        { status: 400 },
      );
    // Drivers add their car right after signing up; a car sent with sign-up is saved too.
    const vehicle = register && stationId === null && body?.vehicle ? parseVehicle(body.vehicle) : null;
    if (vehicle && "error" in vehicle)
      return NextResponse.json({ error: vehicle.error }, { status: 400 });
    const db = getDb();
    if (
      stationId !== null &&
      !db.prepare("SELECT id FROM stations WHERE id = ?").get(stationId)
    )
      return NextResponse.json(
        { error: "Choose the charging station you manage." },
        { status: 400 },
      );
    const existing = db
      .prepare("SELECT * FROM users WHERE lower(email) = ?")
      .get(email) as any;
    if (register && existing)
      return NextResponse.json(
        { error: "Email already registered. Please log in." },
        { status: 409 },
      );
    if (
      !register &&
      (!existing || !(await bcrypt.compare(password, existing.password_hash)))
    )
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 },
      );
    let user;
    if (register) {
      const id = randomUUID();
      const hash = await bcrypt.hash(password, 12);
      try {
        db.transaction(() => {
          db.prepare(
            "INSERT INTO users (id,name,email,password_hash) VALUES (?,?,?,?)",
          ).run(id, name, email, hash);
          if (stationId)
            db.prepare(
              "INSERT INTO station_managers (user_id, station_id) VALUES (?, ?)",
            ).run(id, stationId);
          if (vehicle && !("error" in vehicle))
            db.prepare(
              `INSERT INTO vehicles (id, user_id, make, model, battery_capacity_kwh, connector_types, max_charging_power_kw, current_range_km)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            ).run(
              randomUUID(),
              id,
              vehicle.make,
              vehicle.model,
              vehicle.battery_capacity_kwh,
              JSON.stringify(vehicle.connector_types),
              vehicle.max_charging_power_kw,
              vehicle.current_range_km,
            );
        })();
      } catch (error: any) {
        if (error.code?.startsWith("SQLITE_CONSTRAINT"))
          return NextResponse.json(
            { error: "Email already registered. Please log in." },
            { status: 409 },
          );
        throw error;
      }
      user = { id, name, email, role: "user", phone: null };
    } else {
      user = {
        id: existing.id,
        name: existing.name,
        email: existing.email,
        role: existing.role,
        phone: existing.phone,
      };
    }
    const token = signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });
    return attachSession(
      NextResponse.json(
        { user: { ...user, is_operator: isStationOperator(user.id, user.role) }, token },
        { status: register ? 201 : 200 },
      ),
      token,
    );
  } catch (error) {
    console.error("Account request failed", error);
    return NextResponse.json(
      { error: "Unable to access your account. Please try again." },
      { status: 500 },
    );
  }
}
