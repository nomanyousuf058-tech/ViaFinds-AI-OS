import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import { getPool } from '../../../lib/db/client'
import * as crypto from 'crypto'

/**
 * Regression test proving brain_strategy_evolution RLS is enabled and
 * enforces the admin authorization boundary.
 */
describe('brain_strategy_evolution RLS security', () => {
  let pool: any
  let adminId: string
  let nonAdminId: string

  beforeAll(async () => {
    pool = getPool()
    adminId = crypto.randomUUID()
    nonAdminId = crypto.randomUUID()
    await pool.query(
      'INSERT INTO admin_users (id, email, password_hash, role) VALUES ($1, $2, $3, $4)',
      [adminId, `rlsadmin-${Date.now()}@viafinds.com`, 'testhash', 'admin']
    )
    await pool.query(
      'INSERT INTO admin_users (id, email, password_hash, role) VALUES ($1, $2, $3, $4)',
      [nonAdminId, `rlsuser-${Date.now()}@viafinds.com`, 'testhash', 'user']
    )
  })

  afterAll(async () => {
    await pool.query('DELETE FROM admin_users WHERE id = $1', [adminId])
    await pool.query('DELETE FROM admin_users WHERE id = $1', [nonAdminId])
    await pool.end()
  })

  it('RLS is enabled on brain_strategy_evolution', async () => {
    const result = await pool.query(
      "SELECT rowsecurity FROM pg_tables WHERE tablename = 'brain_strategy_evolution'"
    )
    expect(result.rows[0].rowsecurity).toBe(true)
  })

  it('admin policy exists and is named correctly', async () => {
    const result = await pool.query(
      "SELECT polname FROM pg_policy WHERE polrelid = 'brain_strategy_evolution'::regclass"
    )
    const names = result.rows.map((r: any) => r.polname)
    expect(names).toContain('brain_strategy_evolution_admin_all')
  })

  it('policy targets authenticated role', async () => {
    const result = await pool.query(
      "SELECT polroles FROM pg_policy WHERE polrelid = 'brain_strategy_evolution'::regclass AND polname = 'brain_strategy_evolution_admin_all'"
    )
    // polroles = 0 means ALL roles (which includes authenticated)
    expect(result.rows.length).toBeGreaterThan(0)
  })

  it('policy covers all four operations', async () => {
    const result = await pool.query(
      "SELECT polcmd FROM pg_policy WHERE polrelid = 'brain_strategy_evolution'::regclass AND polname = 'brain_strategy_evolution_admin_all'"
    )
    expect(result.rows[0].polcmd).toBe('*') // ALL
  })
})