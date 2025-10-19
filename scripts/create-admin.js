#!/usr/bin/env node

/**
 * Interactive Admin Creation Script
 * Creates admin users with secure password hashing
 */

import readline from 'readline';
import bcrypt from 'bcryptjs';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🔍 Checking Supabase configuration...');
console.log('Supabase URL:', supabaseUrl ? '✅ Set' : '❌ Missing');
console.log('Supabase Key:', supabaseKey ? '✅ Set' : '❌ Missing');

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Missing Supabase configuration');
  console.error('Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Utility functions
const question = (query) => new Promise((resolve) => rl.question(query, resolve));
const hiddenQuestion = (query) => new Promise((resolve) => {
  process.stdout.write(query);
  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.setEncoding('utf8');
  
  let password = '';
  process.stdin.on('data', function(char) {
    char = char + '';
    switch (char) {
      case '\n':
      case '\r':
      case '\u0004':
        process.stdin.setRawMode(false);
        process.stdin.pause();
        process.stdout.write('\n');
        resolve(password);
        break;
      case '\u0003':
        process.exit();
        break;
      case '\u007f': // Backspace
        if (password.length > 0) {
          password = password.slice(0, -1);
          process.stdout.write('\b \b');
        }
        break;
      default:
        password += char;
        process.stdout.write('*');
        break;
    }
  });
});

// Validation functions
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validatePassword = (password) => {
  if (password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters long' };
  }
  if (!/(?=.*[a-z])/.test(password)) {
    return { valid: false, message: 'Password must contain at least one lowercase letter' };
  }
  if (!/(?=.*[A-Z])/.test(password)) {
    return { valid: false, message: 'Password must contain at least one uppercase letter' };
  }
  if (!/(?=.*\d)/.test(password)) {
    return { valid: false, message: 'Password must contain at least one number' };
  }
  if (!/(?=.*[@$!%*?&])/.test(password)) {
    return { valid: false, message: 'Password must contain at least one special character (@$!%*?&)' };
  }
  return { valid: true };
};

const validateUsername = (username) => {
  if (username.length < 3) {
    return { valid: false, message: 'Username must be at least 3 characters long' };
  }
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return { valid: false, message: 'Username can only contain letters, numbers, and underscores' };
  }
  return { valid: true };
};

// Main admin creation function
async function createAdmin() {
  console.log('\n🔐 Interactive Admin Creation Script');
  console.log('=====================================\n');

  // Test database connection
  console.log('🔍 Testing database connection...');
  const { data: testData, error: testError } = await supabase
    .from('admin_users')
    .select('count')
    .limit(1);

  if (testError) {
    console.error('❌ Database connection failed:', testError.message);
    process.exit(1);
  } else {
    console.log('✅ Database connection successful\n');
  }

  try {
    // Get admin details
    let name, username, email, password, confirmPassword, role;

    // Get name
    do {
      name = await question('👤 Enter admin full name: ');
      if (!name.trim()) {
        console.log('❌ Name is required');
      }
    } while (!name.trim());

    // Get username
    do {
      username = await question('👤 Enter username: ');
      const validation = validateUsername(username);
      if (!validation.valid) {
        console.log(`❌ ${validation.message}`);
        username = '';
      }
    } while (!username);

    // Check if username already exists
    const { data: existingUser } = await supabase
      .from('admin_users')
      .select('username')
      .eq('username', username)
      .single();

    if (existingUser) {
      console.log('❌ Username already exists. Please choose a different username.');
      process.exit(1);
    }

    // Get email
    do {
      email = await question('📧 Enter email address: ');
      if (!validateEmail(email)) {
        console.log('❌ Please enter a valid email address');
        email = '';
      }
    } while (!email);

    // Check if email already exists
    const { data: existingEmail } = await supabase
      .from('admin_users')
      .select('email')
      .eq('email', email)
      .single();

    if (existingEmail) {
      console.log('❌ Email already exists. Please choose a different email.');
      process.exit(1);
    }

    // Get password
    do {
      password = await hiddenQuestion('🔒 Enter password: ');
      const validation = validatePassword(password);
      if (!validation.valid) {
        console.log(`❌ ${validation.message}`);
        password = '';
      }
    } while (!password);

    // Confirm password
    do {
      confirmPassword = await hiddenQuestion('🔒 Confirm password: ');
      if (password !== confirmPassword) {
        console.log('❌ Passwords do not match');
        confirmPassword = '';
      }
    } while (password !== confirmPassword);

    // Get role
    console.log('\n📋 Available roles:');
    console.log('1. super_admin - Full system access');
    console.log('2. admin - Standard admin access');
    
    let roleChoice = '';
    while (roleChoice !== '1' && roleChoice !== '2') {
      roleChoice = await question('🎭 Select role (1-2): ');
      roleChoice = roleChoice.trim();
      console.log(`Debug: roleChoice = "${roleChoice}"`);
      
      if (roleChoice === '1') {
        role = 'super_admin';
        console.log('✅ Selected: super_admin');
      } else if (roleChoice === '2') {
        role = 'admin';
        console.log('✅ Selected: admin');
      } else {
        console.log('❌ Please select 1 or 2');
        roleChoice = '';
      }
    }

    // Hash password
    console.log('\n⏳ Hashing password...');
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create admin user
    console.log('⏳ Creating admin user...');
    console.log('📝 Admin data:', {
      name: name.trim(),
      username: username.trim(),
      email: email.trim(),
      role: role,
      is_active: true
    });
    
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
      console.error('Error message:', error.message);
      console.error('Error code:', error.code);
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
    console.log('⚠️  Please keep these credentials secure!');

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Run the script
createAdmin();
