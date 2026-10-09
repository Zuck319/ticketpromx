# Security Specification & Test Matrix

## 1. Data Invariants

1. **Event Invariants**:
   - Only authenticated administrators can create, update, or delete events.
   - Public users can read event listings.
   - Available seats cannot be negative and cannot exceed total seats.
   - Event titles and venue names must have bounded string lengths (<= 200 and <= 150 characters respectively).

2. **Order Invariants**:
   - An order can only be created by an authenticated user where `request.auth.uid == incoming().userId`.
   - Users can only read their own orders (`resource.data.userId == request.auth.uid`), while administrators can read all orders.
   - Orders cannot be modified by users after creation (status updates like refunds are restricted to admins).
   - Order IDs must be valid alphanumeric strings.
   - Total amount must be positive.

3. **Notification Invariants**:
   - Notifications belong to `/users/{userId}/notifications/{notificationId}`.
   - A user can only read and update (e.g., mark as read) their own notifications.
   - System/Admin can write notifications for users.

4. **Admin Invariants**:
   - Admin records in `/admins/{adminId}` can only be read and managed by existing admins.
   - Standard users cannot promote themselves to admin.
   - Bootstrapped admin is `angel.solis.hdz.mxn@gmail.com`.

---

## 2. The "Dirty Dozen" Payloads

1. **Payload 1 (Ghost Field / Shadow Field in Order)**:
   ```json
   {
     "id": "ord_101",
     "userId": "user_abc",
     "eventId": "evt_1",
     "eventTitle": "Coldplay",
     "venue": "Estadio GNP",
     "totalAmount": 1200,
     "status": "completed",
     "paymentMethodMasked": "Visa 4242",
     "paymentRef": "ref_999",
     "ghost_admin_override": true
   }
   ```
   *Expected Result*: Rejected (Strict key enforcement).

2. **Payload 2 (User ID Spoofing in Order Creation)**:
   ```json
   {
     "id": "ord_102",
     "userId": "victim_uid_888",
     "eventId": "evt_1",
     "eventTitle": "Coldplay",
     "venue": "Estadio GNP",
     "totalAmount": 1200,
     "status": "completed",
     "paymentMethodMasked": "Visa 4242",
     "paymentRef": "ref_999"
   }
   ```
   *Expected Result*: Rejected (`request.auth.uid != incoming().userId`).

3. **Payload 3 (Unauthenticated User Creating Order)**:
   ```json
   {
     "id": "ord_103",
     "userId": "anon",
     "eventId": "evt_1",
     "eventTitle": "Coldplay",
     "venue": "Estadio GNP",
     "totalAmount": 1200,
     "status": "completed",
     "paymentMethodMasked": "Visa 4242",
     "paymentRef": "ref_999"
   }
   ```
   *Expected Result*: Rejected (Auth required).

4. **Payload 4 (Non-Admin Creating Event)**:
   *Caller*: Regular user `user_123`.
   ```json
   {
     "id": "evt_999",
     "title": "Hacked Concert",
     "artist": "Anonymous",
     "venue": "Hacked Arena",
     "city": "CDMX",
     "date": "2026-12-01",
     "time": "20:00",
     "category": "Conciertos",
     "basePrice": 0,
     "totalSeats": 100,
     "availableSeats": 100
   }
   ```
   *Expected Result*: Rejected (Admin role required).

5. **Payload 5 (Negative Price in Event)**:
   *Caller*: Admin attempting invalid price: `basePrice: -500`.
   *Expected Result*: Rejected (Schema validation failed).

6. **Payload 6 (Oversized Document ID Injection / ID Poisoning)**:
   *Target*: `/events/very_long_string_over_128_chars_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa`
   *Expected Result*: Rejected (`isValidId()` constraint).

7. **Payload 7 (Denial-of-Wallet Long String Injection)**:
   *Target*: Event description with 10MB string.
   *Expected Result*: Rejected (`description.size() <= 2000`).

8. **Payload 8 (Unauthorized Order Modification by Customer)**:
   *Caller*: Customer attempts updating `status` from `completed` to `refunded`.
   *Expected Result*: Rejected (Only admin can modify orders).

9. **Payload 9 (Cross-User Notification Reading)**:
   *Caller*: `user_A` reads `/users/user_B/notifications/notif_1`.
   *Expected Result*: Rejected (`request.auth.uid != userId`).

10. **Payload 10 (Self-Promotion to Admin Collection)**:
    *Caller*: Regular user writes to `/admins/user_123`.
    ```json
    {
      "id": "user_123",
      "email": "hacker@test.com",
      "role": "admin"
    }
    ```
    *Expected Result*: Rejected (Only existing admin can write to `/admins`).

11. **Payload 11 (Blanket Read Bypass on Orders Collection)**:
    *Caller*: Unauthenticated query for `orders`.
    *Expected Result*: Rejected (List rule requires `resource.data.userId == request.auth.uid` or admin).

12. **Payload 12 (Invalid Enum in Category or Status)**:
    *Target*: Order with `status: "free_pass_bypass"`.
    *Expected Result*: Rejected (`enum` check failed).
