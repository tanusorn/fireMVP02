# FireWatch System Testing Checklist

คู่มือทดสอบระบบ FireWatch แบบละเอียด พร้อมขั้นตอนการตรวจสอบ API และฟังก์ชันต่างๆ

---

## 📋 สารบัญ

1. [ข้อกำหนดเบื้องต้น](#1-ข้อกำหนดเบื้องต้น)
2. [ทดสอบ Backend API (FastAPI)](#2-ทดสอบ-backend-api-fastapi)
3. [ทดสอบ Database (Supabase)](#3-ทดสอบ-database-supabase)
4. [ทดสอบ Authentication](#4-ทดสอบ-authentication)
5. [ทดสอบ Fire Simulation Flow](#5-ทดสอบ-fire-simulation-flow)
6. [ทดสอบ Resource Allocation](#6-ทดสอบ-resource-allocation)
7. [ทดสอบ Notification System](#7-ทดสอบ-notification-system)
8. [End-to-End Testing](#8-end-to-end-testing)
9. [Troubleshooting](#9-troubleshooting)

---

## 1. ข้อกำหนดเบื้องต้น

### 1.1 Environment Variables

| ✅ | รายการตรวจสอบ | วิธีตรวจสอบ |
|---|--------------|------------|
| ☐ | `VITE_API_URL` ถูกตั้งค่า | ตรวจสอบไฟล์ `.env` หรือ environment |
| ☐ | `VITE_SUPABASE_URL` ถูกตั้งค่า | ตรวจสอบไฟล์ `.env` |
| ☐ | `VITE_SUPABASE_PUBLISHABLE_KEY` ถูกตั้งค่า | ตรวจสอบไฟล์ `.env` |

**วิธีตรวจสอบ Environment ใน Browser Console:**
```javascript
// เปิด DevTools → Console แล้วพิมพ์:
console.log('API URL:', import.meta.env.VITE_API_URL || 'http://localhost:8000');
console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL);
```

### 1.2 FastAPI Server

| ✅ | รายการตรวจสอบ | วิธีตรวจสอบ |
|---|--------------|------------|
| ☐ | FastAPI server กำลังทำงาน | เปิด Terminal รัน server |
| ☐ | สามารถเข้าถึง API docs ได้ | เปิด browser ไปที่ `/docs` |

**วิธีรัน FastAPI Server:**
```bash
# ไปที่โฟลเดอร์ backend
cd backend  # หรือโฟลเดอร์ที่เก็บ FastAPI

# รัน server
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# หรือถ้าใช้ poetry
poetry run uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

**ตรวจสอบว่า Server ทำงาน:**
```bash
# ใช้ curl
curl http://localhost:8000/

# หรือเปิด browser ไปที่:
# http://localhost:8000/docs  (Swagger UI)
# http://localhost:8000/redoc (ReDoc)
```

---

## 2. ทดสอบ Backend API (FastAPI)

### 2.1 Health Check

| ✅ | Endpoint | Expected Result |
|---|----------|-----------------|
| ☐ | `GET /` หรือ `GET /health` | Status 200, response มี status |

**วิธีทดสอบ (Browser Console):**
```javascript
const API_URL = 'http://localhost:8000';

// Health Check
fetch(`${API_URL}/`)
  .then(r => r.json())
  .then(data => console.log('✅ Health Check:', data))
  .catch(err => console.error('❌ Health Check Failed:', err));
```

### 2.2 Fire Simulation API

| ✅ | Endpoint | Method | Expected Result |
|---|----------|--------|-----------------|
| ☐ | `/fire/fire/simulate` | POST | Status 200, simulation result |

**วิธีทดสอบ:**
```javascript
const API_URL = 'http://localhost:8000';

// Test Fire Simulation
const fireRequest = {
  lat: 18.7883,
  lon: 98.9853,
  date: new Date().toISOString().split('T')[0],
  grid_size: 50,
  simulation_hours: 24,
  cell_size: 30
};

fetch(`${API_URL}/fire/fire/simulate`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(fireRequest)
})
  .then(r => {
    console.log('Status:', r.status);
    return r.json();
  })
  .then(data => {
    console.log('✅ Fire Simulation Result:');
    console.log('- Unburned cells:', data.unburned);
    console.log('- Burning cells:', data.burning);
    console.log('- Burned cells:', data.burned);
    console.log('- Firebreak area (m²):', data.firebreak_area_m2);
  })
  .catch(err => console.error('❌ Fire Simulation Failed:', err));
```

**Expected Response Structure:**
```json
{
  "unburned": 1250,
  "burning": 45,
  "burned": 180,
  "firebreak_area_m2": 54000
}
```

### 2.3 Zone Management API

| ✅ | Endpoint | Method | Expected Result |
|---|----------|--------|-----------------|
| ☐ | `/zone/zone/save` | POST | Status 200, zone saved |
| ☐ | `/zone/zone/clear` | POST | Status 200, zones cleared |

**วิธีทดสอบ:**
```javascript
const API_URL = 'http://localhost:8000';

// Test Zone Save
const zoneRequest = {
  zone: 'Zone A',
  firebreak_area_m2: 54000
};

fetch(`${API_URL}/zone/zone/save`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(zoneRequest)
})
  .then(r => r.json())
  .then(data => console.log('✅ Zone Save:', data))
  .catch(err => console.error('❌ Zone Save Failed:', err));

// Test Zone Clear
fetch(`${API_URL}/zone/zone/clear`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' }
})
  .then(r => r.json())
  .then(data => console.log('✅ Zone Clear:', data))
  .catch(err => console.error('❌ Zone Clear Failed:', err));
```

### 2.4 Math Optimization API

| ✅ | Endpoint | Method | Expected Result |
|---|----------|--------|-----------------|
| ☐ | `/math/optimize` | POST | Status 200, optimization result |

**วิธีทดสอบ:**
```javascript
const API_URL = 'http://localhost:8000';

// Test Math Optimization
const optimizeRequest = {
  centers: [
    {
      code: 'K1',
      name: 'ศูนย์ดอยสุเทพ',
      latitude: 18.8048,
      longitude: 98.9212,
      available_officers: 5,
      equipment: {
        machete: 10,
        rake: 8,
        blower: 3,
        flashlight: 15
      }
    },
    {
      code: 'K2',
      name: 'ศูนย์แม่ริม',
      latitude: 18.9167,
      longitude: 98.9500,
      available_officers: 3,
      equipment: {
        machete: 5,
        rake: 4,
        blower: 2,
        flashlight: 8
      }
    }
  ]
};

fetch(`${API_URL}/math/optimize`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(optimizeRequest)
})
  .then(r => {
    console.log('Status:', r.status);
    return r.json();
  })
  .then(data => {
    console.log('✅ Optimization Result:');
    console.log('- Status:', data.status);
    console.log('- Total Travel Time:', data.total_travel_time);
    console.log('- Total Work Time:', data.total_work_time);
    console.log('- Allocations:', data.allocations);
  })
  .catch(err => console.error('❌ Optimization Failed:', err));
```

**Expected Response Structure:**
```json
{
  "status": "optimal",
  "total_travel_time": 45.5,
  "total_work_time": 120.0,
  "unfinished_area": 0,
  "allocations": [
    {
      "center_code": "K1",
      "officers_assigned": 3,
      "equipment_used": { "machete": 5, "rake": 4 }
    }
  ]
}
```

---

## 3. ทดสอบ Database (Supabase)

### 3.1 Connection Test

| ✅ | รายการตรวจสอบ | วิธีตรวจสอบ |
|---|--------------|------------|
| ☐ | เชื่อมต่อ Supabase ได้ | Query ข้อมูลจากตาราง |
| ☐ | RLS Policies ทำงาน | Login แล้ว query ข้อมูล |

**วิธีทดสอบ (Browser Console หลัง Login):**
```javascript
// Import supabase client (ถ้าอยู่ใน app context)
// หรือใช้ใน React component

// Test: Query Operation Centers
const { data: centers, error: centersError } = await supabase
  .from('operation_centers')
  .select('*');
  
if (centersError) {
  console.error('❌ Operation Centers Query Failed:', centersError);
} else {
  console.log('✅ Operation Centers:', centers);
}

// Test: Query Equipment
const { data: equipment, error: equipError } = await supabase
  .from('equipment')
  .select('*');
  
if (equipError) {
  console.error('❌ Equipment Query Failed:', equipError);
} else {
  console.log('✅ Equipment:', equipment);
}

// Test: Query Profiles
const { data: profiles, error: profilesError } = await supabase
  .from('profiles')
  .select('*');
  
if (profilesError) {
  console.error('❌ Profiles Query Failed:', profilesError);
} else {
  console.log('✅ Profiles:', profiles);
}
```

### 3.2 Table Existence Check

| ✅ | ตาราง | ใช้ในหน้า |
|---|-------|---------|
| ☐ | `profiles` | Settings, Daily Report |
| ☐ | `operation_centers` | Operation Centers |
| ☐ | `equipment` | Resources |
| ☐ | `daily_status_history` | Daily Report |
| ☐ | `fire_reports` | Fire Simulation |
| ☐ | `report_zones` | Resource Allocation |
| ☐ | `notifications` | Notifications |
| ☐ | `user_roles` | Admin functions |

---

## 4. ทดสอบ Authentication

### 4.1 Login Flow

| ✅ | รายการตรวจสอบ | วิธีตรวจสอบ |
|---|--------------|------------|
| ☐ | Login ด้วย email/password ได้ | ใช้ form login |
| ☐ | Session ถูกเก็บหลัง login | ตรวจสอบ localStorage |
| ☐ | Logout ทำงานถูกต้อง | กดปุ่ม logout |
| ☐ | Protected routes ทำงาน | เข้าหน้าที่ต้อง login |

**วิธีทดสอบ Session:**
```javascript
// ตรวจสอบ session หลัง login
const { data: { session } } = await supabase.auth.getSession();

if (session) {
  console.log('✅ Session exists');
  console.log('- User ID:', session.user.id);
  console.log('- Email:', session.user.email);
  console.log('- Token expires:', new Date(session.expires_at * 1000));
} else {
  console.log('❌ No session - User not logged in');
}
```

### 4.2 Registration Flow

| ✅ | รายการตรวจสอบ | วิธีตรวจสอบ |
|---|--------------|------------|
| ☐ | Register สร้าง user ใน auth.users | ลองสมัคร user ใหม่ |
| ☐ | Trigger สร้าง profile อัตโนมัติ | ตรวจสอบตาราง profiles |
| ☐ | Operation center ถูกบันทึก | ตรวจสอบ profile.operation_center |

**วิธีตรวจสอบหลังสมัคร:**
```javascript
// หลังจาก register และ login
const { data: { user } } = await supabase.auth.getUser();

// ตรวจสอบ profile
const { data: profile } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', user.id)
  .single();

console.log('User ID:', user.id);
console.log('Profile:', profile);
console.log('Operation Center:', profile?.operation_center);
```

---

## 5. ทดสอบ Fire Simulation Flow

### 5.1 Step-by-Step Testing

| ✅ | ขั้นตอน | สิ่งที่ต้องตรวจสอบ |
|---|--------|------------------|
| ☐ | เปิดหน้า Fire Simulation | หน้าโหลดไม่มี error |
| ☐ | กด "ตรวจจับตำแหน่ง" | ได้ค่า lat/lon |
| ☐ | เลือก Zone (A/B/C) | แสดงรูป map ของ zone |
| ☐ | กด "เริ่มจำลอง" | เรียก API สำเร็จ |
| ☐ | แสดงผลลัพธ์ | แสดงค่า burned/unburned |
| ☐ | บันทึกลง Database | ตรวจสอบ fire_reports |

**วิธีตรวจสอบ Network Request:**
1. เปิด DevTools → Network tab
2. Filter: "fire" หรือ "simulate"
3. กด "เริ่มจำลอง"
4. ตรวจสอบ request:
   - URL: `/fire/fire/simulate`
   - Method: POST
   - Status: 200
   - Response: มีข้อมูล unburned, burning, burned

### 5.2 Database Verification

```javascript
// ตรวจสอบ fire_reports หลังจำลอง
const { data: reports } = await supabase
  .from('fire_reports')
  .select('*')
  .order('created_at', { ascending: false })
  .limit(5);

console.log('Recent Fire Reports:', reports);
```

---

## 6. ทดสอบ Resource Allocation

### 6.1 Prerequisites

| ✅ | รายการตรวจสอบ | วิธีตรวจสอบ |
|---|--------------|------------|
| ☐ | มี Operation Centers ในระบบ | Query operation_centers |
| ☐ | มี Equipment data | Query equipment |
| ☐ | มี Available Officers | Query daily_status_history |

### 6.2 Data Flow Test

```javascript
// 1. ดึงข้อมูล Operation Centers
const { data: centers } = await supabase
  .from('operation_centers')
  .select('*');
console.log('1. Operation Centers:', centers);

// 2. ดึงข้อมูล Equipment
const { data: equipment } = await supabase
  .from('equipment')
  .select('*');
console.log('2. Equipment:', equipment);

// 3. ดึงข้อมูลเจ้าหน้าที่พร้อมปฏิบัติงานวันนี้
const today = new Date().toISOString().split('T')[0];
const { data: availableStaff } = await supabase
  .from('daily_status_history')
  .select('user_id, status')
  .eq('date', today)
  .eq('status', 'available');
console.log('3. Available Staff Today:', availableStaff);

// 4. รวมข้อมูลตาม center
const { data: profiles } = await supabase
  .from('public_profiles')
  .select('id, name, operation_center, current_status')
  .eq('current_status', 'available');
console.log('4. Available Profiles:', profiles);
```

### 6.3 Optimization API Test

| ✅ | ขั้นตอน | สิ่งที่ต้องตรวจสอบ |
|---|--------|------------------|
| ☐ | เปิดหน้า Resource Allocation | หน้าโหลดสำเร็จ |
| ☐ | แสดงข้อมูลศูนย์ทั้งหมด | มีข้อมูล officers/equipment |
| ☐ | กด "คำนวณการจัดสรร" | เรียก `/math/optimize` |
| ☐ | แสดงผลการจัดสรร | แสดง allocations |

---

## 7. ทดสอบ Notification System

### 7.1 Real Notifications Test

| ✅ | รายการตรวจสอบ | วิธีตรวจสอบ |
|---|--------------|------------|
| ☐ | Query notifications ได้ | ดู Network/Console |
| ☐ | แสดง notifications ในหน้า | เปิดหน้า Notifications |
| ☐ | Mark as read ทำงาน | กดอ่าน notification |

**วิธีทดสอบ:**
```javascript
// ดึง notifications ของ user ปัจจุบัน
const { data: { user } } = await supabase.auth.getUser();

const { data: notifications } = await supabase
  .from('notifications')
  .select('*')
  .eq('user_id', user.id)
  .order('created_at', { ascending: false });

console.log('User Notifications:', notifications);
```

### 7.2 Create Test Notification

```javascript
// สร้าง notification ทดสอบ
const { data: { user } } = await supabase.auth.getUser();

const { data, error } = await supabase
  .from('notifications')
  .insert({
    user_id: user.id,
    sender_id: user.id,
    title: 'ทดสอบแจ้งเตือน',
    message: 'นี่คือข้อความทดสอบ',
    type: 'info',
    read: false
  })
  .select()
  .single();

if (error) {
  console.error('❌ Create Notification Failed:', error);
} else {
  console.log('✅ Notification Created:', data);
}
```

---

## 8. End-to-End Testing

### 8.1 Complete Workflow Test

ทดสอบ flow ทั้งหมดตั้งแต่ต้นจนจบ:

| ✅ | ขั้นตอน | Expected Result |
|---|--------|-----------------|
| ☐ | 1. Login เข้าระบบ | เข้าสู่หน้า Home |
| ☐ | 2. อัปเดตสถานะประจำวัน | บันทึกสถานะสำเร็จ |
| ☐ | 3. เข้าหน้า Resources | แสดงข้อมูลอุปกรณ์ |
| ☐ | 4. แก้ไขจำนวนอุปกรณ์ | บันทึกสำเร็จ |
| ☐ | 5. เข้าหน้า Fire Simulation | หน้าโหลดสำเร็จ |
| ☐ | 6. รันการจำลอง | ได้ผลลัพธ์ |
| ☐ | 7. ไปหน้า Resource Allocation | แสดงข้อมูลศูนย์ |
| ☐ | 8. รัน Optimization | ได้ผลการจัดสรร |
| ☐ | 9. ส่ง Notification | แจ้งเตือนถูกสร้าง |

### 8.2 Quick Health Check Script

Copy/paste ใน Console เพื่อตรวจสอบทุกอย่างพร้อมกัน:

```javascript
async function runHealthCheck() {
  console.log('🔍 Starting FireWatch Health Check...\n');
  
  const results = {
    passed: [],
    failed: []
  };
  
  // 1. Check Supabase Connection
  try {
    const { data, error } = await supabase.from('operation_centers').select('count');
    if (error) throw error;
    results.passed.push('✅ Supabase Connection');
  } catch (e) {
    results.failed.push('❌ Supabase Connection: ' + e.message);
  }
  
  // 2. Check Auth Session
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      results.passed.push('✅ Auth Session Active');
    } else {
      results.failed.push('⚠️ No Auth Session (not logged in)');
    }
  } catch (e) {
    results.failed.push('❌ Auth Check: ' + e.message);
  }
  
  // 3. Check FastAPI (if URL is set)
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  try {
    const response = await fetch(`${API_URL}/`, { 
      method: 'GET',
      signal: AbortSignal.timeout(5000)
    });
    if (response.ok) {
      results.passed.push('✅ FastAPI Server');
    } else {
      results.failed.push('⚠️ FastAPI returned status: ' + response.status);
    }
  } catch (e) {
    results.failed.push('❌ FastAPI Connection: ' + e.message);
  }
  
  // 4. Check Tables Exist
  const tables = ['profiles', 'operation_centers', 'equipment', 'fire_reports'];
  for (const table of tables) {
    try {
      const { error } = await supabase.from(table).select('count').limit(1);
      if (error) throw error;
      results.passed.push(`✅ Table: ${table}`);
    } catch (e) {
      results.failed.push(`❌ Table ${table}: ${e.message}`);
    }
  }
  
  // Print Results
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 HEALTH CHECK RESULTS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  if (results.passed.length > 0) {
    console.log('PASSED:');
    results.passed.forEach(r => console.log('  ' + r));
  }
  
  if (results.failed.length > 0) {
    console.log('\nFAILED/WARNINGS:');
    results.failed.forEach(r => console.log('  ' + r));
  }
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Summary: ${results.passed.length} passed, ${results.failed.length} failed/warnings`);
  
  return results;
}

// Run the check
runHealthCheck();
```

---

## 9. Troubleshooting

### 9.1 Common Issues

| ปัญหา | สาเหตุ | วิธีแก้ |
|-------|--------|--------|
| `Failed to fetch` | FastAPI ไม่ทำงาน | รัน `uvicorn main:app --reload` |
| `CORS error` | FastAPI ไม่อนุญาต origin | เพิ่ม CORS middleware ใน FastAPI |
| `401 Unauthorized` | Token หมดอายุ | Login ใหม่ |
| `PGRST116` | ไม่พบข้อมูล (single row) | ตรวจสอบ query conditions |
| `RLS policy violation` | ไม่มีสิทธิ์ | ตรวจสอบ RLS policies |

### 9.2 Debug Commands

```javascript
// ดู current user
const { data: { user } } = await supabase.auth.getUser();
console.log('Current User:', user);

// ดู session token
const { data: { session } } = await supabase.auth.getSession();
console.log('Access Token:', session?.access_token?.substring(0, 50) + '...');

// ตรวจสอบ role
const { data: roles } = await supabase
  .from('user_roles')
  .select('role')
  .eq('user_id', user.id);
console.log('User Roles:', roles);
```

### 9.3 FastAPI CORS Setup

ถ้าเจอ CORS error ให้ตรวจสอบ FastAPI มี middleware นี้:

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # หรือระบุ origin ที่อนุญาต
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## 📝 Notes

- ทดสอบใน Development mode ก่อน Production เสมอ
- เก็บ log ทุกครั้งที่เจอ error
- ถ้า FastAPI ไม่ทำงาน ให้ตรวจสอบ:
  1. Port 8000 ว่างหรือไม่
  2. Dependencies ติดตั้งครบหรือไม่
  3. Environment variables ถูกต้องหรือไม่

---

*Last Updated: 2026-01-16*
