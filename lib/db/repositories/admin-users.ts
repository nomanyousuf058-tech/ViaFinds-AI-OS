import { Pool } from 'pg'
import { getPool } from '../client'
import bcrypt from 'bcryptjs'

export type AdminUserRow = {
  id: string
  email: string
  password_hash: string
  role: string
  active: boolean
  last_login_at: string | null
  created_at: string
  updated_at: string | null
}

export class AdminUsersRepository {
  private pool: Pool | null = null

  private async getPool(): Promise<Pool> {
    if (!this.pool) {
      this.pool = getPool()
    }
    return this.pool
  }

  async findByEmail(email: string): Promise<AdminUserRow | null> {
    const pool = await this.getPool()
    const result = await pool.query(`SELECT * FROM admin_users WHERE email = $1 AND active = true LIMIT 1`, [email])
    return result.rows[0] || null
  }

  async create(data: { email: string; password_hash: string; role?: string }): Promise<AdminUserRow | null> {
    const pool = await this.getPool()
    const result = await pool.query(
      `INSERT INTO admin_users (email, password_hash, role, active) VALUES ($1, $2, $3, true) RETURNING *`,
      [data.email, data.password_hash, data.role || 'admin']
    )
    return result.rows[0] || null
  }

  async updateLastLogin(id: string): Promise<void> {
    const pool = await this.getPool()
    await pool.query(`UPDATE admin_users SET last_login_at = NOW(), updated_at = NOW() WHERE id = $1`, [id])
  }

  async verifyPassword(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash)
  }
}

export const adminUsersRepository = new AdminUsersRepository()
