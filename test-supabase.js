
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { performance } from 'perf_hooks'

// Configuration for colored output
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    bold: '\x1b[1m'
}

console.log(`${colors.cyan}${colors.bold}\n🚀 Supabase Connection Tester${colors.reset}\n`)

// Load environment variables
const envConfig = dotenv.config()

if (envConfig.error) {
    console.error(`${colors.red}❌ Error loading .env file:${colors.reset}`, envConfig.error)
    process.exit(1)
}

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

// 1. Environment Variable Check
console.log(`${colors.blue}📝 Checking Environment Variables...${colors.reset}`)

let hasError = false

if (!supabaseUrl) {
    console.error(`${colors.red}   ❌ VITE_SUPABASE_URL is missing${colors.reset}`)
    hasError = true
} else if (!supabaseUrl.startsWith('https://')) {
    console.warn(`${colors.yellow}   ⚠️  VITE_SUPABASE_URL should start with 'https://'${colors.reset}`)
} else {
    console.log(`${colors.green}   ✅ VITE_SUPABASE_URL found${colors.reset}`)
}

if (!supabaseAnonKey) {
    console.error(`${colors.red}   ❌ VITE_SUPABASE_ANON_KEY is missing${colors.reset}`)
    hasError = true
} else if (supabaseAnonKey.split('.').length !== 3) {
    console.warn(`${colors.yellow}   ⚠️  VITE_SUPABASE_ANON_KEY does not look like a valid JWT${colors.reset}`)
} else {
    console.log(`${colors.green}   ✅ VITE_SUPABASE_ANON_KEY found${colors.reset}`)
}

if (hasError) {
    console.error(`\n${colors.red}🛑 Stopping due to missing configuration.${colors.reset}`)
    process.exit(1)
}

// 2. Connection Test
console.log(`\n${colors.blue}🔌 Testing Connection to Supabase...${colors.reset}`)

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: false,
        autoRefreshToken: false,
    }
})

async function testConnection() {
    const start = performance.now()

    try {
        // Attempting to fetch a public table (categories being a good candidate as it usually exists and is public)
        // Using head: true to only fetch metadata/count, lighter on network
        const { count, error, status } = await supabase
            .from('categories')
            .select('*', { count: 'exact', head: true })

        const end = performance.now()
        const duration = (end - start).toFixed(2)

        if (error) {
            // If categories doesn't exist or RLS blocks it, try 'products' or just check if we got a reachable response usually 4xx/2xx means connection is OK
            // actually if error code is 'PGRST104' (relation not found), connection is OK but table missing. 
            // If code is 401/403 connection is OK but auth failed.
            // Only network errors (like FETCH_ERROR) are true connection failures.

            if (error.code === 'PGRST104' || (status >= 400 && status < 500)) {
                console.log(`${colors.yellow}   ⚠️  Connected, but received application error (likely robust): ${error.message} (Code: ${error.code})${colors.reset}`)
                console.log(`   ⏱️  Latency: ${duration}ms`)
                console.log(`\n${colors.green}✅ Connection Verified (Service is reachable)${colors.reset}`)
            } else {
                throw error
            }
        } else {
            console.log(`${colors.green}   ✅ Success! Accessed 'categories' table.${colors.reset}`)
            console.log(`   📊 Items count: ${count}`)
            console.log(`   ⏱️  Latency: ${duration}ms`)
            console.log(`\n${colors.green}🎉 SUPABASE CONNECTION IS WORKING PERFECTLY!${colors.reset}`)
        }

    } catch (err) {
        const end = performance.now()
        const duration = (end - start).toFixed(2)
        console.error(`\n${colors.red}❌ Connection Failed!${colors.reset}`)
        console.error(`${colors.red}   Error: ${err.message || err}${colors.reset}`)
        if (err.cause) console.error(`   Cause:`, err.cause)
        console.log(`   ⏱️  Latency: ${duration}ms`)
        process.exit(1)
    }
}

testConnection()
