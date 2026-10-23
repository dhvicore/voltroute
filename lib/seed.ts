/**
 * Seed data for VoltRoute EV Charging Station database.
 *
 * IMPORTANT: This is DEMONSTRATION DATA for development and testing.
 * Station names, locations, and prices are based on publicly known EV charging
 * networks operating in Mumbai, India, but exact coordinates, availability,
 * and pricing are approximate/simulated and should NOT be treated as verified
 * real-time information. In production, integrate a real station data provider.
 */

import { getDb } from "./db";
import bcryptjs from "bcryptjs";
import { v4 as uuid } from "uuid";

export function seedDatabase() {
  const db = getDb();

  // Check if already seeded
  const count = db.prepare("SELECT COUNT(*) as c FROM stations").get() as any;
  if (count.c > 0) return;

  const tx = db.transaction(() => {
    // =================== USERS ===================
    const adminId = uuid();
    const userId = uuid();
    const adminHash = bcryptjs.hashSync("admin123", 10);
    const userHash = bcryptjs.hashSync("user123", 10);

    db.prepare(`INSERT INTO users (id, name, email, phone, password_hash, role) VALUES (?, ?, ?, ?, ?, ?)`)
      .run(adminId, "Admin", "admin@voltroute.app", "9876543210", adminHash, "admin");
    db.prepare(`INSERT INTO users (id, name, email, phone, password_hash, role) VALUES (?, ?, ?, ?, ?, ?)`)
      .run(userId, "Riya Agarwal", "riya@voltroute.app", "9876543211", userHash, "user");

    // =================== STATIONS ===================
    // Demonstration data based on known EV charging networks in Mumbai.
    // Coordinates are approximate public locations; prices are typical ranges.
    const stations = [
      {
        id: uuid(), name: "Tata Power EV Station - Bandra",
        operator: "Tata Power", address: "Hill Road, Bandra West",
        city: "Mumbai", state: "Maharashtra", postal_code: "400050",
        latitude: 19.0596, longitude: 72.8295,
        amenities: JSON.stringify(["Café","Restroom","Wi-Fi","Parking"]),
        opening_hours: "24/7", contact_phone: "1800-209-8282",
        image_url: null, rating: 4.6, rating_count: 124
      },
      {
        id: uuid(), name: "ChargeZone Hub - Andheri",
        operator: "ChargeZone", address: "Andheri-Kurla Road, Andheri East",
        city: "Mumbai", state: "Maharashtra", postal_code: "400069",
        latitude: 19.1136, longitude: 72.8697,
        amenities: JSON.stringify(["Food Court","Wi-Fi","Parking"]),
        opening_hours: "06:00–23:00", contact_phone: "1800-123-4567",
        image_url: null, rating: 4.2, rating_count: 87
      },
      {
        id: uuid(), name: "Statiq Charging Point - Powai",
        operator: "Statiq", address: "Hiranandani Gardens, Powai",
        city: "Mumbai", state: "Maharashtra", postal_code: "400076",
        latitude: 19.1197, longitude: 72.9051,
        amenities: JSON.stringify(["Café","Restroom","Shopping","Wi-Fi"]),
        opening_hours: "24/7", contact_phone: "1800-572-1122",
        image_url: null, rating: 4.8, rating_count: 201
      },
      {
        id: uuid(), name: "Ather Grid Station - Worli",
        operator: "Ather Energy", address: "Dr Annie Besant Road, Worli",
        city: "Mumbai", state: "Maharashtra", postal_code: "400018",
        latitude: 19.0176, longitude: 72.8150,
        amenities: JSON.stringify(["Restroom"]),
        opening_hours: "08:00–22:00", contact_phone: "080-4610-3400",
        image_url: null, rating: 4.0, rating_count: 45
      },
      {
        id: uuid(), name: "Fortum Charge & Drive - BKC",
        operator: "Fortum", address: "Bandra Kurla Complex, Bandra East",
        city: "Mumbai", state: "Maharashtra", postal_code: "400051",
        latitude: 19.0660, longitude: 72.8691,
        amenities: JSON.stringify(["Café","Food Court","Wi-Fi","Restroom","Parking"]),
        opening_hours: "24/7", contact_phone: "1800-309-9009",
        image_url: null, rating: 4.7, rating_count: 156
      },
      {
        id: uuid(), name: "Volttic Express - Dadar",
        operator: "Volttic", address: "Senapati Bapat Marg, Dadar West",
        city: "Mumbai", state: "Maharashtra", postal_code: "400028",
        latitude: 19.0235, longitude: 72.8430,
        amenities: JSON.stringify(["Café","Parking"]),
        opening_hours: "07:00–23:00", contact_phone: null,
        image_url: null, rating: 4.1, rating_count: 63
      },
      {
        id: uuid(), name: "EESL Charging Station - Nariman Point",
        operator: "EESL", address: "Nariman Point, Marine Drive",
        city: "Mumbai", state: "Maharashtra", postal_code: "400021",
        latitude: 18.9256, longitude: 72.8242,
        amenities: JSON.stringify(["Restroom","Parking"]),
        opening_hours: "24/7", contact_phone: null,
        image_url: null, rating: 3.9, rating_count: 32
      },
      {
        id: uuid(), name: "Tata Power EV - Thane Station",
        operator: "Tata Power", address: "Ghodbunder Road, Thane West",
        city: "Thane", state: "Maharashtra", postal_code: "400607",
        latitude: 19.2183, longitude: 72.9781,
        amenities: JSON.stringify(["Food Court","Restroom","Wi-Fi","Parking"]),
        opening_hours: "24/7", contact_phone: "1800-209-8282",
        image_url: null, rating: 4.4, rating_count: 98
      },
      {
        id: uuid(), name: "ChargeZone - Navi Mumbai",
        operator: "ChargeZone", address: "Vashi, Navi Mumbai",
        city: "Navi Mumbai", state: "Maharashtra", postal_code: "400703",
        latitude: 19.0771, longitude: 72.9986,
        amenities: JSON.stringify(["Café","Wi-Fi","Parking"]),
        opening_hours: "06:00–23:00", contact_phone: "1800-123-4567",
        image_url: null, rating: 4.3, rating_count: 76
      },
      {
        id: uuid(), name: "Statiq - Lonavala Highway",
        operator: "Statiq", address: "Mumbai-Pune Expressway, Lonavala",
        city: "Lonavala", state: "Maharashtra", postal_code: "410401",
        latitude: 18.7546, longitude: 73.4062,
        amenities: JSON.stringify(["Café","Food Court","Restroom","Wi-Fi","Parking"]),
        opening_hours: "24/7", contact_phone: "1800-572-1122",
        image_url: null, rating: 4.5, rating_count: 143
      },
      {
        id: uuid(), name: "Tata Power EV - Hinjewadi Pune",
        operator: "Tata Power", address: "Hinjewadi IT Park, Pune",
        city: "Pune", state: "Maharashtra", postal_code: "411057",
        latitude: 18.5912, longitude: 73.7389,
        amenities: JSON.stringify(["Café","Food Court","Restroom","Wi-Fi","Parking"]),
        opening_hours: "24/7", contact_phone: "1800-209-8282",
        image_url: null, rating: 4.6, rating_count: 167
      },
      {
        id: uuid(), name: "JOLT Charging - Juhu",
        operator: "JOLT", address: "Juhu Tara Road, Juhu",
        city: "Mumbai", state: "Maharashtra", postal_code: "400049",
        latitude: 19.0883, longitude: 72.8264,
        amenities: JSON.stringify(["Café","Restroom","Wi-Fi"]),
        opening_hours: "24/7", contact_phone: null,
        image_url: null, rating: 4.3, rating_count: 54
      },
      // ===== Karnataka =====
      {
        id: uuid(), name: "Tata Power EV - MG Road Bangalore",
        operator: "Tata Power", address: "MG Road, Bangalore",
        city: "Bangalore", state: "Karnataka", postal_code: "560001",
        latitude: 12.9716, longitude: 77.5946,
        amenities: JSON.stringify(["Café","Restroom","Wi-Fi","Parking"]),
        opening_hours: "24/7", contact_phone: "1800-209-8282",
        image_url: null, rating: 4.5, rating_count: 189
      },
      {
        id: uuid(), name: "ChargeZone - Electronic City",
        operator: "ChargeZone", address: "Electronic City Phase 1, Bangalore",
        city: "Bangalore", state: "Karnataka", postal_code: "560100",
        latitude: 12.8399, longitude: 77.6770,
        amenities: JSON.stringify(["Food Court","Wi-Fi","Parking"]),
        opening_hours: "24/7", contact_phone: "1800-123-4567",
        image_url: null, rating: 4.3, rating_count: 112
      },
      {
        id: uuid(), name: "Statiq Charging - Mysore Road",
        operator: "Statiq", address: "Mysore Road, Bangalore",
        city: "Bangalore", state: "Karnataka", postal_code: "560039",
        latitude: 12.9352, longitude: 77.5087,
        amenities: JSON.stringify(["Café","Parking"]),
        opening_hours: "06:00–23:00", contact_phone: null,
        image_url: null, rating: 4.1, rating_count: 67
      },
      {
        id: uuid(), name: "Ather Grid - Hubli",
        operator: "Ather Energy", address: "Lamington Road, Hubli",
        city: "Hubli", state: "Karnataka", postal_code: "580020",
        latitude: 15.3647, longitude: 75.1240,
        amenities: JSON.stringify(["Restroom","Parking"]),
        opening_hours: "08:00–22:00", contact_phone: null,
        image_url: null, rating: 4.0, rating_count: 34
      },
      // ===== Tamil Nadu =====
      {
        id: uuid(), name: "Tata Power EV - Anna Salai Chennai",
        operator: "Tata Power", address: "Anna Salai, Chennai",
        city: "Chennai", state: "Tamil Nadu", postal_code: "600002",
        latitude: 13.0604, longitude: 80.2496,
        amenities: JSON.stringify(["Café","Restroom","Wi-Fi","Parking"]),
        opening_hours: "24/7", contact_phone: "1800-209-8282",
        image_url: null, rating: 4.6, rating_count: 156
      },
      {
        id: uuid(), name: "ChargeZone - OMR Chennai",
        operator: "ChargeZone", address: "Old Mahabalipuram Road, Sholinganallur",
        city: "Chennai", state: "Tamil Nadu", postal_code: "600119",
        latitude: 12.9010, longitude: 80.2279,
        amenities: JSON.stringify(["Food Court","Wi-Fi","Parking"]),
        opening_hours: "24/7", contact_phone: null,
        image_url: null, rating: 4.4, rating_count: 98
      },
      {
        id: uuid(), name: "Statiq - Coimbatore",
        operator: "Statiq", address: "Avinashi Road, Coimbatore",
        city: "Coimbatore", state: "Tamil Nadu", postal_code: "641018",
        latitude: 11.0168, longitude: 76.9558,
        amenities: JSON.stringify(["Café","Restroom","Wi-Fi","Parking"]),
        opening_hours: "24/7", contact_phone: null,
        image_url: null, rating: 4.3, rating_count: 72
      },
      {
        id: uuid(), name: "Tata Power EV - Madurai",
        operator: "Tata Power", address: "Bypass Road, Madurai",
        city: "Madurai", state: "Tamil Nadu", postal_code: "625010",
        latitude: 9.9252, longitude: 78.1198,
        amenities: JSON.stringify(["Restroom","Parking"]),
        opening_hours: "24/7", contact_phone: null,
        image_url: null, rating: 4.2, rating_count: 45
      },
      {
        id: uuid(), name: "EESL Charging - Salem",
        operator: "EESL", address: "NH44, Salem",
        city: "Salem", state: "Tamil Nadu", postal_code: "636007",
        latitude: 11.6643, longitude: 78.1460,
        amenities: JSON.stringify(["Restroom","Parking"]),
        opening_hours: "24/7", contact_phone: null,
        image_url: null, rating: 3.9, rating_count: 28
      },
      // ===== Kerala =====
      {
        id: uuid(), name: "KSEB EV Station - Kochi",
        operator: "KSEB", address: "MG Road, Ernakulam",
        city: "Kochi", state: "Kerala", postal_code: "682011",
        latitude: 9.9312, longitude: 76.2673,
        amenities: JSON.stringify(["Café","Restroom","Wi-Fi","Parking"]),
        opening_hours: "24/7", contact_phone: null,
        image_url: null, rating: 4.5, rating_count: 134
      },
      {
        id: uuid(), name: "Tata Power EV - Trivandrum",
        operator: "Tata Power", address: "NH66, Kazhakkoottam",
        city: "Thiruvananthapuram", state: "Kerala", postal_code: "695582",
        latitude: 8.5568, longitude: 76.8769,
        amenities: JSON.stringify(["Café","Restroom","Parking"]),
        opening_hours: "24/7", contact_phone: "1800-209-8282",
        image_url: null, rating: 4.4, rating_count: 89
      },
      {
        id: uuid(), name: "ChargeZone - Kozhikode",
        operator: "ChargeZone", address: "Mavoor Road, Kozhikode",
        city: "Kozhikode", state: "Kerala", postal_code: "673004",
        latitude: 11.2588, longitude: 75.7804,
        amenities: JSON.stringify(["Café","Restroom","Wi-Fi"]),
        opening_hours: "06:00–23:00", contact_phone: null,
        image_url: null, rating: 4.2, rating_count: 56
      },
      {
        id: uuid(), name: "KSEB EV Station - Thrissur",
        operator: "KSEB", address: "Shoranur Road, Thrissur",
        city: "Thrissur", state: "Kerala", postal_code: "680001",
        latitude: 10.5276, longitude: 76.2144,
        amenities: JSON.stringify(["Restroom","Parking"]),
        opening_hours: "24/7", contact_phone: null,
        image_url: null, rating: 4.1, rating_count: 43
      },
      // ===== Goa =====
      {
        id: uuid(), name: "Tata Power EV - Panaji Goa",
        operator: "Tata Power", address: "18th June Road, Panaji",
        city: "Panaji", state: "Goa", postal_code: "403001",
        latitude: 15.4989, longitude: 73.8278,
        amenities: JSON.stringify(["Café","Restroom","Wi-Fi","Parking"]),
        opening_hours: "24/7", contact_phone: "1800-209-8282",
        image_url: null, rating: 4.3, rating_count: 78
      },
      // ===== Telangana =====
      {
        id: uuid(), name: "Tata Power EV - HITEC City Hyderabad",
        operator: "Tata Power", address: "HITEC City Main Road, Hyderabad",
        city: "Hyderabad", state: "Telangana", postal_code: "500081",
        latitude: 17.4435, longitude: 78.3772,
        amenities: JSON.stringify(["Café","Food Court","Restroom","Wi-Fi","Parking"]),
        opening_hours: "24/7", contact_phone: "1800-209-8282",
        image_url: null, rating: 4.7, rating_count: 210
      },
      {
        id: uuid(), name: "ChargeZone - Secunderabad",
        operator: "ChargeZone", address: "MG Road, Secunderabad",
        city: "Hyderabad", state: "Telangana", postal_code: "500003",
        latitude: 17.4399, longitude: 78.4983,
        amenities: JSON.stringify(["Restroom","Wi-Fi","Parking"]),
        opening_hours: "24/7", contact_phone: null,
        image_url: null, rating: 4.2, rating_count: 87
      },
      // ===== Highway stations (NH48 Mumbai-Bangalore corridor) =====
      {
        id: uuid(), name: "Statiq - Kolhapur Highway",
        operator: "Statiq", address: "NH48, Kolhapur",
        city: "Kolhapur", state: "Maharashtra", postal_code: "416003",
        latitude: 16.7050, longitude: 74.2433,
        amenities: JSON.stringify(["Café","Restroom","Parking"]),
        opening_hours: "24/7", contact_phone: null,
        image_url: null, rating: 4.0, rating_count: 52
      },
      {
        id: uuid(), name: "Tata Power EV - Belgaum",
        operator: "Tata Power", address: "NH48, Belgaum",
        city: "Belgaum", state: "Karnataka", postal_code: "590001",
        latitude: 15.8497, longitude: 74.4977,
        amenities: JSON.stringify(["Café","Restroom","Parking"]),
        opening_hours: "24/7", contact_phone: null,
        image_url: null, rating: 4.1, rating_count: 41
      },
      {
        id: uuid(), name: "ChargeZone - Davangere",
        operator: "ChargeZone", address: "NH48, Davangere",
        city: "Davangere", state: "Karnataka", postal_code: "577002",
        latitude: 14.4644, longitude: 75.9218,
        amenities: JSON.stringify(["Restroom","Parking"]),
        opening_hours: "24/7", contact_phone: null,
        image_url: null, rating: 3.8, rating_count: 23
      },
      // ===== NH44 (Chennai-Bangalore corridor) =====
      {
        id: uuid(), name: "Statiq - Vellore Highway",
        operator: "Statiq", address: "NH44, Vellore",
        city: "Vellore", state: "Tamil Nadu", postal_code: "632001",
        latitude: 12.9165, longitude: 79.1325,
        amenities: JSON.stringify(["Café","Restroom","Parking"]),
        opening_hours: "24/7", contact_phone: null,
        image_url: null, rating: 4.0, rating_count: 38
      },
      {
        id: uuid(), name: "Tata Power EV - Krishnagiri",
        operator: "Tata Power", address: "NH44, Krishnagiri",
        city: "Krishnagiri", state: "Tamil Nadu", postal_code: "635001",
        latitude: 12.5186, longitude: 78.2137,
        amenities: JSON.stringify(["Restroom","Parking"]),
        opening_hours: "24/7", contact_phone: null,
        image_url: null, rating: 3.9, rating_count: 29
      },
      // ===== NH66 Kerala coast =====
      {
        id: uuid(), name: "KSEB EV Station - Alappuzha",
        operator: "KSEB", address: "NH66, Alappuzha",
        city: "Alappuzha", state: "Kerala", postal_code: "688001",
        latitude: 9.4981, longitude: 76.3388,
        amenities: JSON.stringify(["Restroom","Parking"]),
        opening_hours: "24/7", contact_phone: null,
        image_url: null, rating: 4.0, rating_count: 31
      },
      {
        id: uuid(), name: "Tata Power EV - Kannur",
        operator: "Tata Power", address: "NH66, Kannur",
        city: "Kannur", state: "Kerala", postal_code: "670001",
        latitude: 11.8745, longitude: 75.3704,
        amenities: JSON.stringify(["Café","Restroom","Parking"]),
        opening_hours: "24/7", contact_phone: null,
        image_url: null, rating: 4.2, rating_count: 47
      },
      // ===== Delhi NCR =====
      {
        id: uuid(), name: "Tata Power EV - Connaught Place Delhi",
        operator: "Tata Power", address: "Connaught Place, New Delhi",
        city: "New Delhi", state: "Delhi", postal_code: "110001",
        latitude: 28.6315, longitude: 77.2167,
        amenities: JSON.stringify(["Café","Food Court","Restroom","Wi-Fi","Parking"]),
        opening_hours: "24/7", contact_phone: "1800-209-8282",
        image_url: null, rating: 4.6, rating_count: 234
      },
      {
        id: uuid(), name: "ChargeZone - Gurugram",
        operator: "ChargeZone", address: "Cyber City, Gurugram",
        city: "Gurugram", state: "Haryana", postal_code: "122002",
        latitude: 28.4595, longitude: 77.0266,
        amenities: JSON.stringify(["Food Court","Wi-Fi","Parking"]),
        opening_hours: "24/7", contact_phone: null,
        image_url: null, rating: 4.4, rating_count: 167
      },
      // ===== Rajasthan =====
      {
        id: uuid(), name: "Tata Power EV - Jaipur",
        operator: "Tata Power", address: "MI Road, Jaipur",
        city: "Jaipur", state: "Rajasthan", postal_code: "302001",
        latitude: 26.9124, longitude: 75.7873,
        amenities: JSON.stringify(["Café","Restroom","Parking"]),
        opening_hours: "24/7", contact_phone: null,
        image_url: null, rating: 4.3, rating_count: 98
      },
      // ===== Gujarat =====
      {
        id: uuid(), name: "Tata Power EV - Ahmedabad",
        operator: "Tata Power", address: "SG Highway, Ahmedabad",
        city: "Ahmedabad", state: "Gujarat", postal_code: "380015",
        latitude: 23.0225, longitude: 72.5714,
        amenities: JSON.stringify(["Café","Food Court","Restroom","Wi-Fi","Parking"]),
        opening_hours: "24/7", contact_phone: "1800-209-8282",
        image_url: null, rating: 4.5, rating_count: 145
      },
      {
        id: uuid(), name: "ChargeZone - Surat",
        operator: "ChargeZone", address: "Ring Road, Surat",
        city: "Surat", state: "Gujarat", postal_code: "395007",
        latitude: 21.1702, longitude: 72.8311,
        amenities: JSON.stringify(["Restroom","Parking"]),
        opening_hours: "24/7", contact_phone: null,
        image_url: null, rating: 4.1, rating_count: 67
      },
      {
        id: uuid(), name: "Statiq - Vadodara Highway",
        operator: "Statiq", address: "NH48, Vadodara",
        city: "Vadodara", state: "Gujarat", postal_code: "390007",
        latitude: 22.3072, longitude: 73.1812,
        amenities: JSON.stringify(["Café","Restroom","Parking"]),
        opening_hours: "24/7", contact_phone: null,
        image_url: null, rating: 4.0, rating_count: 53
      },
    ];

    const stationInsert = db.prepare(`
      INSERT INTO stations (id, name, operator, address, city, state, postal_code, latitude, longitude, amenities, opening_hours, contact_phone, image_url, rating, rating_count)
      VALUES (@id, @name, @operator, @address, @city, @state, @postal_code, @latitude, @longitude, @amenities, @opening_hours, @contact_phone, @image_url, @rating, @rating_count)
    `);

    for (const s of stations) {
      stationInsert.run(s);
    }

    // =================== CHARGERS ===================
    // Each station gets 2–4 chargers with realistic specs
    const chargerInsert = db.prepare(`
      INSERT INTO chargers (id, station_id, connector_type, power_kw, charging_type, status, price_per_kwh, session_fee, idle_fee_per_min)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const chargerConfigs: [string, number, string, string, number, number, number][] = [
      // [connector_type, power_kw, charging_type, status, price_per_kwh, session_fee, idle_fee_per_min]
      ["CCS2", 120, "DC", "available", 14.5, 25, 2],
      ["CCS2", 60, "DC", "available", 14.5, 25, 2],
      ["Type2", 22, "AC", "available", 12.0, 15, 1],
      ["Type2", 7.4, "AC", "available", 10.0, 10, 0.5],
      ["CCS2", 60, "DC", "occupied", 16.0, 20, 2],
      ["CHAdeMO", 50, "DC", "available", 15.5, 20, 2],
      ["CCS2", 150, "DC", "available", 13.2, 30, 2.5],
      ["CCS2", 60, "DC", "available", 13.2, 20, 2],
      ["Type2", 22, "AC", "out_of_service", 11.0, 15, 1],
      ["CCS2", 50, "DC", "available", 15.8, 20, 2],
      ["Type2", 22, "AC", "available", 12.5, 10, 1],
      ["CCS2", 180, "DC", "available", 17.5, 35, 3],
      ["CCS2", 60, "DC", "occupied", 17.5, 25, 2.5],
      ["NACS", 120, "DC", "available", 18.0, 30, 2.5],
      ["Type2", 22, "AC", "available", 14.0, 15, 1],
      ["CCS2", 60, "DC", "available", 14.0, 20, 2],
      ["Type2", 7.4, "AC", "reserved", 11.5, 10, 0.5],
      ["CCS2", 60, "DC", "available", 12.9, 20, 2],
      ["Type2", 22, "AC", "available", 10.5, 10, 1],
      ["CCS2", 120, "DC", "available", 16.0, 25, 2],
      ["CCS2", 60, "DC", "available", 16.0, 20, 2],
      ["Type2", 22, "AC", "available", 13.5, 15, 1],
      ["CCS2", 150, "DC", "available", 15.0, 30, 2.5],
      ["CCS2", 60, "DC", "available", 15.0, 20, 2],
      ["Type2", 22, "AC", "occupied", 12.0, 15, 1],
      ["CCS2", 120, "DC", "available", 14.8, 25, 2],
      ["Type2", 22, "AC", "available", 12.0, 10, 1],
      ["CCS2", 60, "DC", "available", 14.8, 20, 2],
      ["CCS2", 120, "DC", "available", 14.2, 25, 2],
      ["CCS2", 60, "DC", "available", 14.2, 20, 2],
      ["Type2", 22, "AC", "available", 11.0, 10, 1],
    ];

    // Distribute chargers to stations (2-3 each, cycling through configs)
    for (let sIdx = 0; sIdx < stations.length; sIdx++) {
      const s = stations[sIdx];
      const numChargers = s.name.includes("Fortum") || s.name.includes("Statiq") || s.name.includes("HITEC") ? 3 : 2;
      for (let j = 0; j < numChargers; j++) {
        const c = chargerConfigs[(sIdx * 3 + j) % chargerConfigs.length];
        chargerInsert.run(uuid(), s.id, c[0], c[1], c[2], c[3], c[4], c[5], c[6]);
      }
    }

    // =================== DEMO VEHICLE for Riya ===================
    const vehicleId = uuid();
    db.prepare(`
      INSERT INTO vehicles (id, user_id, make, model, year, battery_capacity_kwh, connector_types, max_charging_power_kw, current_range_km)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(vehicleId, userId, "Tata", "Nexon EV Max", 2024, 40.5, JSON.stringify(["CCS2","Type2"]), 50, 210);

    db.prepare(`
      INSERT INTO vehicles (id, user_id, make, model, year, battery_capacity_kwh, connector_types, max_charging_power_kw, current_range_km)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(uuid(), userId, "Hyundai", "Ioniq 5", 2024, 72.6, JSON.stringify(["CCS2"]), 220, 481);

    // =================== DEMO BOOKINGS ===================
    const stationIds = stations.map(s => s.id);
    // Get first charger for station 0
    const charger0 = db.prepare("SELECT id FROM chargers WHERE station_id = ? LIMIT 1").get(stationIds[0]) as any;
    const charger2 = db.prepare("SELECT id FROM chargers WHERE station_id = ? LIMIT 1").get(stationIds[2]) as any;

    if (charger0 && charger2) {
      db.prepare(`
        INSERT INTO bookings (id, user_id, station_id, charger_id, vehicle_id, booking_date, start_time, end_time, duration_minutes, status, estimated_cost)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(uuid(), userId, stationIds[0], charger0.id, vehicleId, "2026-10-10", "09:00", "09:30", 30, "confirmed", 324);

      db.prepare(`
        INSERT INTO bookings (id, user_id, station_id, charger_id, vehicle_id, booking_date, start_time, end_time, duration_minutes, status, estimated_cost)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(uuid(), userId, stationIds[2], charger2.id, vehicleId, "2026-10-08", "18:30", "19:15", 45, "completed", 445);
    }

    // =================== DEMO CHARGING SESSION ===================
    if (charger0) {
      db.prepare(`
        INSERT INTO charging_sessions (id, user_id, station_id, charger_id, vehicle_id, start_time, end_time, energy_kwh, duration_minutes, cost, status, power_kw, battery_start_pct, battery_end_pct)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(uuid(), userId, stationIds[0], charger0.id, vehicleId,
        "2026-10-08T18:30:00", "2026-10-08T19:12:00", 18.4, 42, 184, "completed", 58.2, 32, 78);
    }

    // =================== FAVORITES ===================
    db.prepare("INSERT INTO favorites (user_id, station_id) VALUES (?, ?)").run(userId, stationIds[0]);
    db.prepare("INSERT INTO favorites (user_id, station_id) VALUES (?, ?)").run(userId, stationIds[2]);
    db.prepare("INSERT INTO favorites (user_id, station_id) VALUES (?, ?)").run(userId, stationIds[4]);

    // =================== REVIEWS ===================
    db.prepare("INSERT INTO reviews (id, user_id, station_id, rating, comment) VALUES (?, ?, ?, ?, ?)")
      .run(uuid(), userId, stationIds[0], 5, "Fast charging, great location near Bandra station.");
    db.prepare("INSERT INTO reviews (id, user_id, station_id, rating, comment) VALUES (?, ?, ?, ?, ?)")
      .run(uuid(), userId, stationIds[2], 5, "Best charger in Powai. Ultra fast and reliable.");


    // =================== REWARDS ===================
    db.prepare("INSERT INTO rewards (user_id, points, tier, total_earned) VALUES (?, ?, ?, ?)")
      .run(userId, 1860, "Silver", 2340);

    // =================== BADGES ===================
    const badgeInsert = db.prepare("INSERT INTO badges (id, user_id, name, icon, description, earned, earned_at) VALUES (?, ?, ?, ?, ?, ?, ?)");
    badgeInsert.run(uuid(), userId, "First Charge", "⚡", "Completed your first charging session", 1, "2026-09-15T10:30:00");
    badgeInsert.run(uuid(), userId, "Night Owl", "🌙", "20 off-peak charges", 1, "2026-10-01T00:00:00");
    badgeInsert.run(uuid(), userId, "500km Electrified", "🛣️", "Drove 500km on volts", 1, "2026-09-28T08:15:00");
    badgeInsert.run(uuid(), userId, "Referral Pro", "👥", "Referred 5 friends", 0, null);
    badgeInsert.run(uuid(), userId, "100 Sessions", "🏆", "Century milestone", 0, null);
    badgeInsert.run(uuid(), userId, "Battery Guardian", "🔋", "Never exceeded 90% charge", 1, "2026-10-03T16:00:00");
    badgeInsert.run(uuid(), userId, "Reporter", "📍", "Reported 5 issues", 0, null);
    badgeInsert.run(uuid(), userId, "Eco Warrior", "🌱", "Saved 100kg CO₂", 1, "2026-10-05T12:00:00");

    // =================== SUBSCRIPTION ===================
    db.prepare("INSERT INTO subscriptions (id, user_id, plan, price, started_at, expires_at, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)")
      .run(uuid(), userId, "plus", 299, "2026-10-01T00:00:00", "2026-10-31T23:59:59", 1);

    // =================== COMMUNITY REPORTS ===================
    const reportInsert = db.prepare("INSERT INTO community_reports (id, user_id, station_id, category, title, description, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
    reportInsert.run(uuid(), userId, stationIds[1], "broken", "Broken connector", "CCS2 connector on charger #2 is physically damaged, plug won't latch", "verified", "2026-10-02T14:30:00");
    reportInsert.run(uuid(), userId, stationIds[3], "icing", "ICEing — ICE vehicle parked", "Blue SUV parked in EV-only spot, blocking both chargers", "investigating", "2026-10-07T09:15:00");
    reportInsert.run(uuid(), userId, stationIds[5], "pricing", "Incorrect pricing shown", "App shows ₹12.5/kWh but charger display shows ₹14/kWh", "resolved", "2026-09-28T16:45:00");
  });

  tx();
  console.log("[VoltRoute] Database seeded with demonstration data.");
}
