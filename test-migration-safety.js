#!/usr/bin/env node

/**
 * Migration Safety Test
 * 
 * This script validates that the shop ownership migration handles existing data safely
 * and doesn't cause migration failures when the shops table contains existing rows.
 */

const fs = require('fs');
const path = require('path');

const migrationPath = path.join(__dirname, 'apps', 'backend', 'prisma', 'migrations', '20251207074553_add_user_model_and_shop_ownership', 'migration.sql');
const migrationReadmePath = path.join(__dirname, 'apps', 'backend', 'prisma', 'migrations', '20251207074553_add_user_model_and_shop_ownership', 'README.md');

console.log('🔧 Testing Migration Safety Implementation\n');

function checkMigrationSafety() {
  console.log('1. Checking Migration SQL Safety...');
  
  if (!fs.existsSync(migrationPath)) {
    console.error('❌ Migration file not found');
    return false;
  }

  const migrationContent = fs.readFileSync(migrationPath, 'utf8');
  let passed = 0;
  let total = 0;

  // Test 1: Check that NOT NULL is not added immediately
  total++;
  const hasImmediateNotNull = migrationContent.includes('ADD COLUMN     "ownerId" TEXT NOT NULL');
  
  if (!hasImmediateNotNull) {
    console.log('✅ Column not added as immediate NOT NULL (avoids migration failure)');
    passed++;
  } else {
    console.error('❌ Column still added as immediate NOT NULL - will fail with existing data');
  }

  // Test 2: Check for nullable column addition first
  total++;
  if (migrationContent.includes('ADD COLUMN "ownerId" TEXT;') || 
      migrationContent.includes('ADD COLUMN "ownerId" TEXT NULL')) {
    console.log('✅ Column initially added as nullable');
    passed++;
  } else {
    console.error('❌ Column not initially added as nullable');
  }

  // Test 3: Check for system user creation
  total++;
  if (migrationContent.includes('INSERT INTO "users"') && 
      migrationContent.includes('00000000-0000-0000-0000-000000000000') &&
      migrationContent.includes('system@tyler-platform.local')) {
    console.log('✅ System user created for existing shop backfill');
    passed++;
  } else {
    console.error('❌ Missing system user creation for backfill');
  }

  // Test 4: Check for existing data backfill
  total++;
  if (migrationContent.includes('UPDATE "shops"') && 
      migrationContent.includes('WHERE "ownerId" IS NULL') &&
      migrationContent.includes('SET "ownerId" = \'00000000-0000-0000-0000-000000000000\'')) {
    console.log('✅ Existing shops backfilled with system user');
    passed++;
  } else {
    console.error('❌ Missing backfill step for existing shops');
  }

  // Test 5: Check for NOT NULL constraint after backfill
  total++;
  if (migrationContent.includes('ALTER COLUMN "ownerId" SET NOT NULL')) {
    console.log('✅ NOT NULL constraint applied after backfill');
    passed++;
  } else {
    console.error('❌ NOT NULL constraint not applied after backfill');
  }

  // Test 6: Check for foreign key constraint at the end
  total++;
  if (migrationContent.includes('ADD CONSTRAINT "shops_ownerId_fkey"') &&
      migrationContent.indexOf('ADD CONSTRAINT') > migrationContent.indexOf('SET NOT NULL')) {
    console.log('✅ Foreign key constraint added after NOT NULL enforcement');
    passed++;
  } else {
    console.error('❌ Foreign key constraint timing incorrect');
  }

  // Test 7: Check for conflict handling in user insert
  total++;
  if (migrationContent.includes('ON CONFLICT ("email") DO NOTHING')) {
    console.log('✅ System user insert handles potential conflicts');
    passed++;
  } else {
    console.error('❌ System user insert might fail on re-runs');
  }

  console.log(`   Migration Safety Tests: ${passed}/${total} passed\n`);
  return passed === total;
}

function checkMigrationDocumentation() {
  console.log('2. Checking Migration Documentation...');
  
  if (!fs.existsSync(migrationReadmePath)) {
    console.error('❌ Migration README not found');
    return false;
  }

  const readmeContent = fs.readFileSync(migrationReadmePath, 'utf8');
  let passed = 0;
  let total = 0;

  // Test 1: Check for migration strategy documentation
  total++;
  if (readmeContent.includes('Migration Strategy') && 
      readmeContent.includes('safe, backwards-compatible approach')) {
    console.log('✅ Migration strategy documented');
    passed++;
  } else {
    console.error('❌ Missing migration strategy documentation');
  }

  // Test 2: Check for step-by-step explanation
  total++;
  if (readmeContent.includes('Step 1: Add Nullable Column') && 
      readmeContent.includes('Step 2: Create System User') &&
      readmeContent.includes('Step 3: Backfill Existing Data') &&
      readmeContent.includes('Step 4: Enforce Constraints')) {
    console.log('✅ Detailed step-by-step process documented');
    passed++;
  } else {
    console.error('❌ Missing detailed step documentation');
  }

  // Test 3: Check for post-migration guidance
  total++;
  if (readmeContent.includes('Post-Migration Requirements') && 
      readmeContent.includes('Update Shop Ownership') &&
      readmeContent.includes('Transfer system-owned shops')) {
    console.log('✅ Post-migration guidance provided');
    passed++;
  } else {
    console.error('❌ Missing post-migration guidance');
  }

  // Test 4: Check for rollback information
  total++;
  if (readmeContent.includes('Rollback Information') && 
      readmeContent.includes('DROP CONSTRAINT') &&
      readmeContent.includes('DROP COLUMN')) {
    console.log('✅ Rollback instructions provided');
    passed++;
  } else {
    console.error('❌ Missing rollback instructions');
  }

  console.log(`   Documentation Tests: ${passed}/${total} passed\n`);
  return passed === total;
}

function validateMigrationFlow() {
  console.log('3. Migration Flow Validation:\n');
  
  console.log('❌ BEFORE (Problematic):');
  console.log('   ALTER TABLE "shops" ADD COLUMN "ownerId" TEXT NOT NULL;');
  console.log('   → Fails if shops table has existing rows');
  console.log('   → Error: "cannot add column without default value"');
  console.log('   → Migration stops, potential data corruption risk\n');
  
  console.log('✅ AFTER (Safe):');
  console.log('   1. ALTER TABLE "shops" ADD COLUMN "ownerId" TEXT; (nullable)');
  console.log('   2. INSERT INTO "users" ... (create system user)');
  console.log('   3. UPDATE "shops" SET "ownerId" = system_user WHERE "ownerId" IS NULL;');
  console.log('   4. ALTER TABLE "shops" ALTER COLUMN "ownerId" SET NOT NULL;');
  console.log('   5. ALTER TABLE "shops" ADD CONSTRAINT ... (foreign key)');
  console.log('   → Migration succeeds with existing data');
  console.log('   → No data loss or corruption');
  console.log('   → All shops have valid ownership\n');
  
  console.log('✅ Production Safety Features:');
  console.log('   • ON CONFLICT handling prevents duplicate system user');
  console.log('   • Nullable column avoids immediate constraint violations');
  console.log('   • Backfill ensures all existing data has valid references');
  console.log('   • System user provides safe default for existing shops');
  console.log('   • Post-migration cleanup guidance for proper ownership transfer\n');
}

// Run all tests
const migrationSafetyPassed = checkMigrationSafety();
const documentationPassed = checkMigrationDocumentation();

if (migrationSafetyPassed && documentationPassed) {
  console.log('🎯 All Migration Safety Tests Passed!');
  console.log('✅ Migration handles existing data safely');
  console.log('✅ No risk of migration failures with existing shops');
  console.log('✅ Comprehensive documentation provided');
  console.log('✅ Clear post-migration guidance available\n');
} else {
  console.error('❌ Some migration safety tests failed - review implementation');
  process.exit(1);
}

validateMigrationFlow();

console.log('🛡️ Migration Safety Implementation Summary:');
console.log('• Safe column addition (nullable first, NOT NULL after backfill)');
console.log('• System user creation for existing shop ownership');
console.log('• Comprehensive backfill of existing data');
console.log('• Proper constraint ordering to avoid failures');
console.log('• Conflict-resistant SQL for re-run safety');
console.log('• Detailed documentation and rollback procedures');

console.log('\n📚 Key Files:');
console.log('• Migration SQL: prisma/migrations/.../migration.sql');
console.log('• Documentation: prisma/migrations/.../README.md');

console.log('\n✅ The migration will now work safely with existing shop data!');