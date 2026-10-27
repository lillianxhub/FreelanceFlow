# Admin และ Premium API

ทุก endpoint ใช้ `ApiResult` และ `/api` ผ่าน Next.js proxy

| Method | Path | สิทธิ์ | Data |
| --- | --- | --- | --- |
| GET | `/api/admin/summary` | ADMIN | `total`, `activeFree`, `activePremium`, `newThisMonth`, `signups: [{month,count}]` ย้อนหลัง 6 เดือนตาม Asia/Bangkok |
| GET | `/api/admin/users?search=&plan=&status=&page=1&limit=20` | ADMIN | Array ของ `id`, `displayName`, `email`, `createdAt`, `active`, `role`, `plan`, `version` และ pagination ใน `meta` |
| PATCH | `/api/admin/users/{id}/plan` | ADMIN | Request `{ "plan": "PREMIUM", "version": 0 }`; คืนบัญชีที่อัปเดต หรือ 409 เมื่อ version เก่า |
| GET | `/api/users/me/features` | authenticated | `{ "plan": "FREE", "finance": true, "premiumEnforced": false }` ตามค่ากลางและบัญชีล่าสุด |
| GET | `/api/admin/features` | ADMIN | `{ "premiumEnforced": false, "version": 0 }` |
| PATCH | `/api/admin/features` | ADMIN | `{ "premiumEnforced": true, "version": 0 }`; คืนค่าที่บันทึกและ version ใหม่ หรือ 409 เมื่อมีผู้ดูแลแก้ก่อน |

`GET /api/users/me` และผล login/refresh มี `role` และ `plan` เพิ่มเติม Admin API ไม่ส่งข้อมูลโปรไฟล์ละเอียดหรือข้อมูล workspace ของผู้ใช้อื่น บัญชีที่มี `deleted_at` จะไม่อยู่ในสถิติและรายชื่อ

The promotion command uses a separate non-web configuration. It loads the same datasource/environment properties but does not scan HTTP controllers/security or execute normal application startup components. A successful promotion still requires an already registered, active, non-deleted account; the command exits after its database operation.

## Global Finance access

V24 creates one persisted `app_feature_settings` row, initially `premium_enforced=false`. It never rewrites account plans. Disabled enforcement grants Finance to every authenticated active, non-deleted account. Enabled enforcement requires Premium or Admin. Admin workspace access remains owner-scoped. FeatureAccessService is the shared policy for `/users/me/features` and every Finance action; settings are read per request without an instance-local entitlement cache. Changes apply to the next request across instances, without a restart. Existing documents are retained when access is denied.

The Admin switch confirms the effect before saving. The workspace refreshes entitlements on navigation, window focus, a local settings change and Premium-denial responses. An already open idle tab updates on its next interaction/focus, not by a push notification. This prepares the existing plan gate for future billing; it does not collect subscription payments.
