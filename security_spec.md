# Security Specification for Quiz 3T Mastery

## 1. Data Invariants
- Users can register their own accounts which default to role `user` and status `pending`.
- Standard users cannot promote themselves to `admin` or `approver` or self-approve their `status` to `approved`.
- Approvers (Trưởng Bộ Phận) can only approve or manage users who share the exact same department.
- Only Admin (Lê Nhật Trường) can define and update global security parameters and roles.
- Questions can only be created, modified, or deleted by administrators.
- Attempts can only be recorded for authenticated, approved users and must be immutable.

## 2. The "Dirty Dozen" Payloads (Attacks Restricted by Rules)
1. User registration attempting to set role to `admin`.
2. Pending user attempting to change their own status to `approved`.
3. Standard user trying to read other users' metrics or personal info.
4. User self-submitting a mock quiz score where `userId` doesn't match their authenticated UID.
5. Standard user trying to modify existing quiz questions.
6. Approver trying to approve a user belonging to a different department.
7. Unauthenticated client trying to query the list of questions.
8. Rejected user trying to record quiz attempts.
9. An attacker trying to poison the question list with an overly large explanation payload (>10MB).
10. Sibling document edit trying to bypass transaction lock.
11. Admin role self-escalation through spoofing client parameters.
12. Modify a sealed result attempt history after submission.

## 3. Production Hardening Ruleset
We write standard Firestore security rules enforcing attribute-based access control (ABAC).
