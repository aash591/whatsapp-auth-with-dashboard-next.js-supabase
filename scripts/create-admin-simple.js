#!/usr/bin/env node

/**
 * Simple Admin Creation Script
 * Creates admin users with secure password hashing
 */

import readline from 'readline';
import bcrypt from 'bcryptjs';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Missing Supabase configuration');
  console.error('Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Simple question function
const askQuestion = (question) => {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
};

// Main function
async function main() {
  console.log('\n🔐 Simple Admin Creation Script');
  console.log('================================\n');

  try {
    // Test database connection
    console.log('🔍 Testing database connection...');
    const { error: testError } = await supabase
      .from('admin_users')
      .select('id')
      .limit(1);

    if (testError) {
      console.error('❌ Database connection failed:', testError.message);
      process.exit(1);
    } else {
      console.log('✅ Database connection successful\n');
    }

    // Get admin details
    const name = await askQuestion('👤 Enter admin full name: ');
    const username = await askQuestion('👤 Enter username: ');
    const email = await askQuestion('📧 Enter email address: ');
    const password = await askQuestion('🔒 Enter password: ');
    
    console.log('\n📋 Available roles:');
    console.log('1. super_admin - Full system access');
    console.log('2. admin - Standard admin access');
    
    const roleChoice = await askQuestion('🎭 Select role (1-2): ');
    
    let role;
    if (roleChoice.trim() === '1') {
      role = 'super_admin';
    } else if (roleChoice.trim() === '2') {
      role = 'admin';
    } else {
      console.log('❌ Invalid choice, defaulting to admin');
      role = 'admin';
    }

    console.log(`\n⏳ Creating admin user with role: ${role}...`);

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create admin user
    const { data, error } = await supabase
      .from('admin_users')
      .insert({
        name: name.trim(),
        username: username.trim(),
        email: email.trim(),
        password_hash: passwordHash,
        role: role,
        is_active: true
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Error creating admin user:');
      console.error('Error details:', error);
      process.exit(1);
    }

    // Success message
    console.log('\n✅ Admin user created successfully!');
    console.log('=====================================');
    console.log(`👤 Name: ${data.name}`);
    console.log(`👤 Username: ${data.username}`);
    console.log(`📧 Email: ${data.email}`);
    console.log(`🎭 Role: ${data.role}`);
    console.log(`🆔 ID: ${data.id}`);
    console.log('=====================================');
    console.log('\n🔐 You can now login with these credentials');

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Run the script
main();
