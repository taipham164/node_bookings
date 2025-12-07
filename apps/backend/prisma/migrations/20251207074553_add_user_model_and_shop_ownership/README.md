# User Model and Shop Ownership Migration

This migration adds user authentication and shop ownership to the Tyler Platform.

## What This Migration Does

1. **Creates Users Table**: Adds authentication system with email/password
2. **Adds Shop Ownership**: Links each shop to a user owner via `ownerId` foreign key
3. **Safe Migration**: Handles existing shop data without causing failures

## Migration Strategy

This migration uses a **safe, backwards-compatible approach** to avoid data loss:

### Step 1: Add Nullable Column
- Adds `ownerId` as nullable to avoid "column cannot be null" errors
- Existing shops can temporarily have no owner during migration

### Step 2: Create System User
- Creates a default system user (`system@tyler-platform.local`) 
- Uses UUID `00000000-0000-0000-0000-000000000000` for predictable reference
- System user has a placeholder password hash (not for actual login)

### Step 3: Backfill Existing Data
- Updates all shops with `ownerId = NULL` to use the system user
- Preserves all existing shop data
- No data loss or migration failures

### Step 4: Enforce Constraints
- Makes `ownerId` NOT NULL after backfill is complete
- Adds foreign key constraint to ensure referential integrity

## Post-Migration Requirements

### For Fresh Installations
If this is a fresh database with no existing shops:
- Migration will run cleanly
- System user created but not used
- New shops must be created with proper ownership

### For Existing Installations
After migration completes:

1. **Update Shop Ownership**: Assign existing shops to real users
   ```sql
   -- Example: Transfer system-owned shops to a real user
   UPDATE shops 
   SET "ownerId" = 'real-user-uuid-here'
   WHERE "ownerId" = '00000000-0000-0000-0000-000000000000';
   ```

2. **Create User Accounts**: Set up proper user accounts via:
   - Registration API: `POST /api/auth/register`
   - Direct database insertion with proper password hashing

3. **Optional Cleanup**: Remove system user if not needed
   ```sql
   -- Only after transferring all shops to real users
   DELETE FROM users WHERE id = '00000000-0000-0000-0000-000000000000';
   ```

## Security Considerations

- **System User Password**: Uses placeholder hash, not for actual authentication
- **Shop Access Control**: After migration, shops require proper ownership
- **Authentication Required**: All shop operations now require user authentication

## Rollback Information

To rollback this migration:
```sql
-- Remove foreign key constraint
ALTER TABLE "shops" DROP CONSTRAINT "shops_ownerId_fkey";

-- Remove ownership column
ALTER TABLE "shops" DROP COLUMN "ownerId";

-- Drop users table
DROP TABLE "users";
```

## Environment Requirements

Ensure these environment variables are set:
- `JWT_SECRET`: Cryptographically secure random string (32+ characters)
- `DATABASE_URL`: Valid PostgreSQL connection string

## Testing the Migration

After running the migration, verify:
1. All existing shops have `ownerId` set (not NULL)
2. Users table exists with system user
3. Foreign key constraint is active
4. Authentication endpoints work correctly

## Support

For issues with this migration:
1. Check the migration logs for specific error messages
2. Ensure database user has proper permissions (CREATE, ALTER, INSERT, UPDATE)
3. Verify existing shops table structure matches expectations
4. Check that PostgreSQL version supports the SQL syntax used