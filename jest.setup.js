import '@testing-library/jest-dom'

// Set test environment variables
process.env.DATABASE_URL ||= 'file:./test.db'
process.env.NEXTAUTH_SECRET ||= 'test-secret-key'
process.env.NEXTAUTH_URL ||= 'http://localhost:3000'
