// Exercises the actual POST handler against an isolated in-memory database.
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const assert = require('node:assert/strict');
const ts = require('typescript');
const Database = require('better-sqlite3');
const db = new Database(':memory:');
db.exec(`CREATE TABLE stations(id TEXT PRIMARY KEY,name TEXT,is_enabled INTEGER DEFAULT 1);
CREATE TABLE vehicles(id TEXT PRIMARY KEY,user_id TEXT);
CREATE TABLE chargers(id TEXT PRIMARY KEY,station_id TEXT,status TEXT,power_kw REAL,price_per_kwh REAL,session_fee REAL,connector_type TEXT);
CREATE TABLE bookings(id TEXT PRIMARY KEY,user_id TEXT,station_id TEXT,charger_id TEXT,vehicle_id TEXT,booking_date TEXT,start_time TEXT,end_time TEXT,duration_minutes INTEGER,estimated_cost REAL,status TEXT DEFAULT 'confirmed');
INSERT INTO stations VALUES('station-1','Test Station',1);
INSERT INTO vehicles VALUES('own-car','test-user'),('other-car','other-user');
INSERT INTO chargers VALUES('charger-1','station-1','available',50,18,0,'CCS2');`);
let counter = 0;
const exportsObject = {};
const source = fs.readFileSync(path.join(__dirname,'../app/api/bookings/route.ts'),'utf8');
const compiled = ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
vm.runInNewContext(compiled,{
  exports:exportsObject,
  require(name){
    if(name==='@/lib/db') return {getDb:()=>db};
    if(name==='@/lib/auth') return {requireAuth:()=>({userId:'test-user'})};
    if(name==='@/lib/init') return {ensureInit:()=>{}};
    if(name==='uuid') return {v4:()=>`booking-${++counter}`};
    return require(name);
  },Date,Number,String,Math,console,
});
const base={station_id:'station-1',charger_id:'charger-1',booking_date:'2099-10-23',start_time:'10:00',duration_minutes:30};
const cases=[
  ['Past booking date',{booking_date:'2000-01-01'},400],
  ['Impossible calendar date',{booking_date:'2099-02-30'},400],
  ['Invalid hour',{start_time:'25:00'},400],
  ['Duration supplied as text',{duration_minutes:'30'},400],
  ['Fractional duration',{duration_minutes:10.5},400],
  ['Booking crossing midnight',{start_time:'23:30',duration_minutes:60},400],
  ['Valid minimum duration',{duration_minutes:10},201],
  ['Valid maximum duration',{duration_minutes:120},201],
  ['Duration below minimum',{duration_minutes:9},400],
  ['Existing overlapping reservation',{},409,true],
  ['Disabled charging station',{},400,false,'disabled'],
  ['Another user vehicle',{vehicle_id:'other-car'},404],
  ['Own vehicle allowed',{vehicle_id:'own-car'},201],
  ['Unknown vehicle rejected',{vehicle_id:'missing-car'},404],
  ['Station identifier supplied as object',{station_id:{id:'station-1'}},400],
  ['Malformed JSON',{},400,false,'malformed'],
  ['Null JSON body',{},400,false,'null'],
];
(async()=>{
  let passed=0;
  for(const [name,patch,expected,overlap,mode] of cases){
    db.prepare('DELETE FROM bookings').run();
    db.prepare('UPDATE stations SET is_enabled = ?').run(mode==='disabled'?0:1);
    if(overlap) db.prepare("INSERT INTO bookings(id,user_id,station_id,charger_id,booking_date,start_time,end_time,duration_minutes) VALUES('existing','other-user','station-1','charger-1','2099-10-23','10:00','11:00',60)").run();
    const response=await exportsObject.POST({json:async()=>{
      if(mode==='malformed')throw new SyntaxError('Invalid JSON');
      return mode==='null'?null:{...base,...patch};
    }});
    const ok=response.status===expected;
    if(ok)passed++;
    console.log(`${ok?'PASS':'FAIL'} ${name}: HTTP ${response.status}; expected ${expected}`);
    if(process.env.BOOKING_TEST_BASELINE!=='1')assert.equal(response.status,expected,name);
  }
  console.log(`${passed}/${cases.length} checks passed`);
  db.close();
})().catch(error=>{console.error(error.message);db.close();process.exitCode=1;});
