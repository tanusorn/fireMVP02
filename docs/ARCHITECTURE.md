# 🔥 FireWatch System Architecture - Deep Dive Documentation

> เอกสารนี้อธิบายโครงสร้างระบบ FireWatch อย่างละเอียด เพื่อให้สามารถพัฒนาต่อได้โดยไม่ทำให้ระบบเดิมเสียหาย

---

## 📁 โครงสร้างโปรเจกต์

```
firewatch/
├── src/                          # 🎨 Frontend (React + Vite + TypeScript)
│   ├── api/                      # API clients & mock data
│   │   ├── auth.ts               # Authentication API
│   │   ├── fire.ts               # Fire simulation API (FastAPI)
│   │   ├── incidents.ts          # ⚠️ MOCK DATA - Incidents
│   │   ├── math.ts               # Math optimization API (FastAPI)
│   │   ├── notifications.ts      # ⚠️ MOCK DATA - Notifications
│   │   └── zones.ts              # Zone management API (FastAPI)
│   ├── assets/                   # Static assets (images, maps)
│   ├── components/               # Reusable UI components
│   │   ├── layout/               # Layout components (MainLayout)
│   │   └── ui/                   # shadcn/ui components
│   ├── contexts/                 # React contexts
│   │   └── AuthContext.tsx       # 🔐 Auth state management
│   ├── hooks/                    # Custom React hooks
│   │   ├── useOperationCenters.ts # Dynamic centers fetching
│   │   └── useUserRole.ts        # Role checking hook
│   ├── integrations/supabase/    # 🔒 AUTO-GENERATED - DO NOT EDIT
│   │   ├── client.ts             # Supabase client
│   │   └── types.ts              # Database types
│   ├── pages/                    # Page components
│   ├── types/                    # TypeScript type definitions
│   └── lib/                      # Utility functions
├── supabase/                     # ☁️ Backend (Lovable Cloud)
│   ├── config.toml               # 🔒 AUTO-GENERATED
│   ├── functions/                # Edge functions (empty currently)
│   └── migrations/               # SQL migration history
├── public/                       # Static public files
└── .env                          # 🔒 AUTO-GENERATED environment vars
```

---

## 1. 📊 โครงสร้าง Database

### 1.1 ตารางหลักทั้งหมด

| ตาราง | หน้าที่ | ใช้ในหน้า |
|-------|--------|----------|
| `profiles` | ข้อมูลส่วนตัวผู้ใช้ (private - เห็นเฉพาะตัวเอง) | Settings, DailyReport |
| `public_profiles` | ข้อมูลสาธารณะผู้ใช้ (ทุกคนเห็น) | OperationCenters |
| `operation_centers` | ศูนย์ปฏิบัติการ | OperationCenters, Register |
| `equipment` | อุปกรณ์ของแต่ละศูนย์ | Resources, OperationCenters |
| `daily_status_history` | ประวัติสถานะรายวัน | DailyReport, OperationCenters |
| `user_roles` | สิทธิ์ผู้ใช้ (admin/user) | RBAC ทั้งระบบ |
| `fire_reports` | รายงานจำลองไฟ | FireSimulation |
| `report_zones` | โซนในรายงาน | FireSimulation |
| `notifications` | การแจ้งเตือน (มีตารางจริง) | Notifications |

### 1.2 ความสัมพันธ์ระหว่างตาราง (Foreign Keys)

```
┌──────────────────┐     ┌────────────────────┐
│   auth.users     │◄────│      profiles      │
│   (Supabase)     │     │  id = auth.uid()   │
└──────────────────┘     └─────────┬──────────┘
                                   │
                                   ▼ sync trigger
                         ┌────────────────────┐
                         │  public_profiles   │
                         └─────────┬──────────┘
                                   │
         ┌─────────────────────────┼─────────────────────────┐
         │                         │                         │
         ▼                         ▼                         ▼
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│ operation_centers│◄─────│    equipment    │      │daily_status_    │
│    (code PK)    │      │(operation_center)│      │   history       │
└────────┬────────┘      └─────────────────┘      └─────────────────┘
         │
         ▼
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│  fire_reports   │◄─────│  report_zones   │      │    user_roles   │
│  (created_by)   │      │   (report_id)   │      │    (user_id)    │
└────────┬────────┘      └─────────────────┘      └─────────────────┘
         │
         ▼
┌─────────────────┐
│  notifications  │
│   (report_id,   │
│    sender_id,   │
│    user_id)     │
└─────────────────┘
```

### 1.3 ตารางที่ใช้ในแต่ละหน้า

| หน้า | ตารางที่ใช้ | Query Type |
|------|------------|------------|
| **Dashboard** | ❌ ไม่ใช้ DB จริง - ใช้ `mockIncidents` จาก `src/api/incidents.ts` | Mock |
| **ศูนย์ปฏิบัติการ** | `operation_centers`, `public_profiles`, `equipment` | Real Supabase |
| **ทรัพยากร** | `equipment`, `profiles`, `operation_centers` | Real Supabase |
| **รายงานประจำวัน** | `daily_status_history`, `profiles` | Real Supabase |
| **Fire Simulation** | `fire_reports`, `report_zones` | Real Supabase |
| **Notifications** | ⚠️ Mixed: ตาราง `notifications` มีอยู่จริง แต่หน้าใช้ mock | Mock + Real |

### 1.4 Demo vs Real Data

| ส่วน | สถานะ | ไฟล์ที่เกี่ยวข้อง |
|------|-------|------------------|
| 🔴 Incidents | **MOCK** | `src/api/incidents.ts` (line 91-209) |
| 🔴 Dashboard Charts | **MOCK** | `src/pages/Dashboard.tsx` (line 71-79 `weeklyData`) |
| 🔴 Dashboard Stats | **HARDCODED** | `src/pages/Dashboard.tsx` (line 49-50) |
| 🔴 Notifications API | **MOCK** | `src/api/notifications.ts` (line 61-94) |
| 🟢 Operation Centers | **REAL** | Supabase `operation_centers` |
| 🟢 Equipment | **REAL** | Supabase `equipment` |
| 🟢 Daily Status | **REAL** | Supabase `daily_status_history` |
| 🟢 User Profiles | **REAL** | Supabase `profiles` / `public_profiles` |
| 🟢 Fire Reports | **REAL** | Supabase `fire_reports` |
| 🟢 Auth | **REAL** | Supabase Auth |

---

## 2. 🔗 การเชื่อมโยง Database → Frontend

### 2.1 หน้า "ศูนย์ปฏิบัติการ" (`/operation-centers`)

**ไฟล์:** `src/pages/OperationCenters.tsx`

**ตารางที่ query:**
```typescript
// 1. ดึงรายชื่อศูนย์
const { data: centersData } = await supabase
  .from("operation_centers")
  .select("code, name, location, description");

// 2. ดึงจำนวนเจ้าหน้าที่แต่ละศูนย์
const { data: profilesData } = await supabase
  .from("public_profiles")
  .select("operation_center, current_status");

// 3. ดึงอุปกรณ์แต่ละศูนย์
const { data: equipmentData } = await supabase
  .from("equipment")
  .select("operation_center, equipment_type, quantity");
```

### 2.2 การอัปเดตอุปกรณ์

**ไฟล์:** `src/pages/Resources.tsx`

```typescript
// Upsert equipment (line 108-117)
await supabase
  .from("equipment")
  .upsert(
    {
      operation_center: centerCode,
      equipment_type: type,
      quantity: equipment[centerCode][type],
    },
    { onConflict: "operation_center,equipment_type" }
  );
```

### 2.3 การนับจำนวนเจ้าหน้าที่พร้อมปฏิบัติงาน

**คำนวณจาก:** `public_profiles.current_status`

```typescript
// ใน OperationCenters.tsx
profilesData.forEach((profile) => {
  if (profilesByCenter[profile.operation_center]) {
    profilesByCenter[profile.operation_center].total++;
    if (profile.current_status === "available") {
      profilesByCenter[profile.operation_center].available++;
    }
  }
});
```

### 2.4 Query Type: Fetch ปกติ (ไม่ใช่ Realtime)

ระบบใช้ **fetch ปกติ** ทุกหน้า (ไม่มี Supabase Realtime Subscription)

```typescript
// ใช้ useEffect + supabase.from().select()
useEffect(() => {
  fetchData();
}, []);
```

---

## 3. 📝 ตอนเจ้าหน้าที่สมัคร (Register)

### 3.1 ไฟล์ที่เกี่ยวข้อง

| ไฟล์ | หน้าที่ |
|------|--------|
| `src/pages/Register.tsx` | UI ฟอร์มลงทะเบียน |
| `src/contexts/AuthContext.tsx` | ฟังก์ชัน `register()` |
| `src/hooks/useOperationCenters.ts` | ดึงรายชื่อศูนย์ |

### 3.2 Flow การสมัคร

```
1. User กรอกฟอร์ม (name, email, password, operation_center)
       │
       ▼
2. เรียก AuthContext.register()
       │
       ▼
3. supabase.auth.signUp() with metadata:
   {
     name: "ชื่อผู้ใช้",
     operation_center: "K1"  // รหัสศูนย์
   }
       │
       ▼
4. 🔥 TRIGGER: handle_new_user() ทำงานอัตโนมัติ
       │
       ├──► INSERT INTO profiles (id, name, email, operation_center)
       │
       └──► INSERT INTO public_profiles (id, name, operation_center)
       │
       ▼
5. User ถูกสร้างพร้อม profile ทั้งสองตาราง
```

### 3.3 Trigger ที่ใช้

```sql
-- Database Function: handle_new_user()
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $function$
BEGIN
  INSERT INTO public.profiles (id, name, email, operation_center)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'name', 'New User'),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'operation_center', 'K1')
  );

  INSERT INTO public.public_profiles (id, name, operation_center)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'name', 'New User'),
    COALESCE(NEW.raw_user_meta_data ->> 'operation_center', 'K1')
  );

  RETURN NEW;
END;
$function$
```

### 3.4 user ผูกกับ operation_center

- **Column:** `profiles.operation_center` (TEXT, FK → `operation_centers.code`)
- **Sync:** เมื่อ update `profiles` จะ sync ไป `public_profiles` ผ่าน trigger `sync_public_profile()`

---

## 4. 📅 การอัปเดตสถานะการทำงานรายวัน

### 4.1 ไฟล์หลัก

**`src/pages/DailyReport.tsx`**

### 4.2 ตารางที่ใช้

| ตาราง | หน้าที่ |
|-------|--------|
| `daily_status_history` | เก็บประวัติสถานะรายวัน (user_id, status, date) |
| `profiles` | อัปเดต `current_status` ปัจจุบัน |

### 4.3 Flow การบันทึกสถานะ

```typescript
// 1. Upsert daily_status_history
await supabase
  .from("daily_status_history")
  .upsert(
    { user_id: user.id, status: selectedStatus, date: today },
    { onConflict: "user_id,date" }
  );

// 2. Update current status in profiles
await supabase
  .from("profiles")
  .update({ current_status: selectedStatus })
  .eq("id", user.id);

// 3. Trigger syncs to public_profiles automatically
```

### 4.4 การนับคนออนไลน์ของแต่ละศูนย์

```typescript
// Query public_profiles แล้ว filter by current_status
const { data } = await supabase
  .from("public_profiles")
  .select("operation_center, current_status");

// นับ: profiles ที่ current_status === "available"
```

### 4.5 ถ้าไม่กดอัปเดตวันนี้

- **สถานะ:** ยังคงเป็นค่าล่าสุดจาก `profiles.current_status`
- **Logic:** อยู่ฝั่ง Frontend (ไม่มี cron job reset สถานะ)
- **พฤติกรรม:** ถ้าไม่กดบันทึก ระบบถือว่าสถานะไม่เปลี่ยน

---

## 5. 🔔 ระบบ Notification

### 5.1 สถานะปัจจุบัน: **MIXED (Demo + Real)**

| ส่วน | สถานะ |
|------|-------|
| ตาราง `notifications` ใน Database | ✅ **มีอยู่จริง** |
| API ใน `src/api/notifications.ts` | ❌ **ใช้ Mock Data** |
| หน้า Notifications | ❌ **เรียก Mock API** |

### 5.2 ไฟล์ Mock Data

**`src/api/notifications.ts` (line 61-94)**

```typescript
const mockNotifications: Notification[] = [
  {
    id: "notif-001",
    title: "High Priority Alert",
    message: "New wildfire detected in Zone A...",
    type: "alert",
    read: false,
    created_at: "2024-12-20T16:30:00Z",
  },
  // ... more mock data
];
```

### 5.3 วิธีลบ Demo → ใช้ Database จริง

**แก้ไขไฟล์:** `src/api/notifications.ts`

```typescript
// เปลี่ยนจาก:
export async function getNotifications(): Promise<Notification[]> {
  await new Promise((resolve) => setTimeout(resolve, 500));
  return mockNotifications;
}

// เป็น:
export async function getNotifications(): Promise<Notification[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
    
  if (error) throw error;
  return data || [];
}
```

### 5.4 การสร้าง Notification ในระบบจริง

ปัจจุบันมี logic สร้าง notification หลังบันทึก Fire Report:

```typescript
// ใน FireSimulation.tsx
await supabase.from("notifications").insert({
  title: "รายงานไฟป่าใหม่",
  message: `รายงาน ${reportCode} ถูกสร้างขึ้น`,
  type: "info",
  sender_id: user.id,
  user_id: targetUserId, // ส่งให้ใคร
  report_id: reportId,
});
```

---

## 6. 🧹 การลบข้อมูล Demo

### 6.1 สรุปไฟล์ที่มี Mock Data

| ไฟล์ | ตำแหน่ง Mock | วิธีแก้ |
|------|-------------|--------|
| `src/api/incidents.ts` | line 91-209 `mockIncidents` | สร้างตาราง `incidents` แล้ว query จริง |
| `src/api/notifications.ts` | line 61-94 `mockNotifications` | เปลี่ยนเป็น query จาก `notifications` table |
| `src/pages/Dashboard.tsx` | line 49-50 hardcoded stats | Query aggregation จาก DB |
| `src/pages/Dashboard.tsx` | line 71-79 `weeklyData` | Query จาก `fire_reports` group by date |

### 6.2 ขั้นตอนเปลี่ยนเป็น Real Data ทั้งหมด

#### Step 1: สร้างตาราง `incidents` (ยังไม่มี)

```sql
CREATE TABLE public.incidents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  zone TEXT NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lon DOUBLE PRECISION NOT NULL,
  severity TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  fire_status TEXT NOT NULL DEFAULT 'burning',
  cell_status JSONB,
  ros_statistics JSONB,
  starting_point JSONB,
  status_history JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES auth.users
);

ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view incidents" 
  ON public.incidents FOR SELECT USING (true);
  
CREATE POLICY "Users can create incidents" 
  ON public.incidents FOR INSERT WITH CHECK (auth.uid() = created_by);
```

#### Step 2: แก้ไข `src/api/incidents.ts`

```typescript
import { supabase } from "@/integrations/supabase/client";

export async function getIncidents(): Promise<Incident[]> {
  const { data, error } = await supabase
    .from("incidents")
    .select("*")
    .order("created_at", { ascending: false });
    
  if (error) throw error;
  return data || [];
}
```

#### Step 3: แก้ไข Dashboard ให้ query real data

```typescript
// แทนที่ hardcoded weeklyData ด้วย query:
const { data: weeklyIncidents } = await supabase
  .from("incidents")
  .select("created_at, status")
  .gte("created_at", sevenDaysAgo);

// คำนวณ weekly aggregation จาก data จริง
```

---

## 7. 🔄 การ Clone โปรเจกต์

### 7.1 ข้อจำกัดสำคัญ

⚠️ **โปรเจกต์นี้ใช้ Lovable Cloud** - ไม่สามารถ clone ไป run ที่อื่นแบบ standalone ได้โดยตรง

### 7.2 วิธี Clone ที่ปลอดภัย

#### Option A: Remix ใน Lovable (แนะนำ)
1. กดปุ่ม "Remix" ใน Lovable
2. ได้โปรเจกต์ใหม่พร้อม Supabase ใหม่
3. ต้อง run migrations ใหม่ทั้งหมด

#### Option B: Export ไป GitHub
1. Connect GitHub ใน Lovable Settings
2. Clone จาก GitHub
3. ต้องเชื่อม Supabase project ของตัวเอง

### 7.3 Environment Variables ที่ต้องตั้ง

```bash
# .env (Auto-generated by Lovable - ไม่ต้องแก้ถ้าใช้ใน Lovable)
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGci...
VITE_SUPABASE_PROJECT_ID=xxx

# ถ้าใช้ FastAPI backend
VITE_API_URL=http://localhost:8000
```

### 7.4 Critical Files - ห้ามแก้

| ไฟล์ | เหตุผล |
|------|--------|
| `src/integrations/supabase/client.ts` | Auto-generated |
| `src/integrations/supabase/types.ts` | Auto-generated from DB schema |
| `supabase/config.toml` | Auto-generated |
| `.env` | Auto-generated |
| `supabase/migrations/*` | Migration history |

---

## 8. 🔀 การใช้ Supabase ของตัวเอง

### 8.1 สามารถเปลี่ยนได้หรือไม่?

**ใน Lovable:** ❌ ไม่ได้ - Lovable Cloud ผูกกับโปรเจกต์

**ถ้า Export ไป run เอง:** ✅ ได้ - แก้ `.env` ให้ชี้ไป Supabase ใหม่

### 8.2 ตารางที่ต้องสร้าง (Schema Reference)

ดู migrations ใน `supabase/migrations/` หรือใช้ SQL นี้:

```sql
-- 1. operation_centers
CREATE TABLE public.operation_centers (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  location TEXT,
  description TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID
);

-- 2. profiles (private)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  operation_center TEXT REFERENCES operation_centers(code) DEFAULT 'K1',
  current_status user_status DEFAULT 'available',
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. public_profiles (public mirror)
CREATE TABLE public.public_profiles (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  operation_center TEXT REFERENCES operation_centers(code) DEFAULT 'K1',
  current_status user_status DEFAULT 'available',
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. equipment
CREATE TABLE public.equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_center TEXT NOT NULL REFERENCES operation_centers(code),
  equipment_type TEXT NOT NULL,
  quantity INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(operation_center, equipment_type)
);

-- 5. daily_status_history
CREATE TABLE public.daily_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users,
  status user_status NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, date)
);

-- 6. user_roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. fire_reports
CREATE TABLE public.fire_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_code TEXT NOT NULL,
  report_name TEXT,
  lat DOUBLE PRECISION NOT NULL,
  lon DOUBLE PRECISION NOT NULL,
  simulation_params JSONB,
  simulation_result JSONB,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 8. report_zones
CREATE TABLE public.report_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID REFERENCES fire_reports(id),
  zone_name TEXT NOT NULL,
  firebreak_area_m2 DOUBLE PRECISION NOT NULL,
  allocation_result JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 9. notifications
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  sender_id UUID,
  report_id UUID REFERENCES fire_reports(id),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info',
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ENUMS
CREATE TYPE user_status AS ENUM ('available', 'unavailable');
CREATE TYPE app_role AS ENUM ('admin', 'user');
```

### 8.3 RLS Policies ที่จำเป็น (Critical)

```sql
-- profiles: เห็นเฉพาะตัวเอง
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- public_profiles: ทุกคนเห็น
ALTER TABLE public_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view" ON public_profiles
  FOR SELECT USING (true);
CREATE POLICY "Users can update own" ON public_profiles
  FOR UPDATE USING (auth.uid() = id);

-- operation_centers: ทุกคนเห็น, admin เท่านั้นที่แก้ได้
ALTER TABLE operation_centers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view" ON operation_centers
  FOR SELECT USING (true);
CREATE POLICY "Admins can modify" ON operation_centers
  FOR ALL USING (has_role(auth.uid(), 'admin'));

-- equipment: ทุกคนเห็น, แก้ได้เฉพาะศูนย์ตัวเอง
ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view" ON equipment
  FOR SELECT USING (true);
CREATE POLICY "Users can manage their center" ON equipment
  FOR ALL USING (
    operation_center = (
      SELECT operation_center FROM profiles WHERE id = auth.uid()
    )
  );
```

### 8.4 Database Functions ที่ต้องมี

```sql
-- has_role function (สำหรับ RBAC)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- handle_new_user trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, operation_center)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', 'New User'),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'operation_center', 'K1')
  );
  INSERT INTO public.public_profiles (id, name, operation_center)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', 'New User'),
    COALESCE(NEW.raw_user_meta_data->>'operation_center', 'K1')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- sync_public_profile trigger
CREATE OR REPLACE FUNCTION public.sync_public_profile()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.public_profiles SET
    name = NEW.name,
    avatar_url = NEW.avatar_url,
    operation_center = NEW.operation_center,
    current_status = NEW.current_status,
    updated_at = NEW.updated_at
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_profile_updated
  AFTER UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.sync_public_profile();
```

---

## 9. 📚 ไฟล์สำคัญของระบบ

### 9.1 Authentication & Session

| ไฟล์ | หน้าที่ |
|------|--------|
| `src/contexts/AuthContext.tsx` | Auth state, login/register/logout functions |
| `src/integrations/supabase/client.ts` | Supabase client instance |
| `src/api/auth.ts` | Auth API wrapper |
| `src/hooks/useUserRole.ts` | Role checking (admin/user) |

### 9.2 Database Client

| ไฟล์ | หน้าที่ |
|------|--------|
| `src/integrations/supabase/client.ts` | 🔒 Auto-generated Supabase client |
| `src/integrations/supabase/types.ts` | 🔒 Auto-generated TypeScript types |

### 9.3 API / Service Layer

| ไฟล์ | หน้าที่ | สถานะ |
|------|--------|-------|
| `src/api/auth.ts` | Authentication | ✅ Real |
| `src/api/fire.ts` | Fire simulation → FastAPI | ✅ Real |
| `src/api/zones.ts` | Zone management → FastAPI | ✅ Real |
| `src/api/math.ts` | Optimization → FastAPI | ✅ Real |
| `src/api/incidents.ts` | Incidents | ❌ Mock |
| `src/api/notifications.ts` | Notifications | ❌ Mock |

### 9.4 State Management

| ไฟล์ | หน้าที่ |
|------|--------|
| `src/contexts/AuthContext.tsx` | Global auth state |
| `src/hooks/useOperationCenters.ts` | Dynamic centers list |
| `src/hooks/useUserRole.ts` | User role state |

### 9.5 Realtime / Subscription

**สถานะ:** ❌ ไม่มี Realtime ในปัจจุบัน

ทุกหน้าใช้ fetch ปกติ (useEffect + supabase.from().select())

---

## 🎯 สรุป Quick Reference

### ต้องการเพิ่มฟีเจอร์ใหม่?

1. ✅ สร้างตารางใหม่ผ่าน Migration Tool
2. ✅ เพิ่ม RLS policies
3. ✅ สร้าง API ใน `src/api/`
4. ✅ สร้างหน้าใน `src/pages/`
5. ✅ เพิ่ม route ใน `src/App.tsx`

### ต้องการลบ Demo?

1. แก้ `src/api/incidents.ts` → query จาก DB จริง (ต้องสร้างตาราง)
2. แก้ `src/api/notifications.ts` → query จาก `notifications` table
3. แก้ `src/pages/Dashboard.tsx` → query aggregation แทน hardcoded

### ต้องการใช้ Supabase ของตัวเอง?

1. Export โปรเจกต์ไป GitHub
2. สร้าง Supabase project ใหม่
3. Run SQL schema ทั้งหมดจากส่วน 8.2
4. สร้าง RLS policies จากส่วน 8.3
5. สร้าง Functions & Triggers จากส่วน 8.4
6. เปลี่ยน `.env` ให้ชี้ไป project ใหม่

---

*เอกสารนี้ถูกสร้างเมื่อ: 2026-01-15*
*สำหรับโปรเจกต์: FireWatch MVP*
