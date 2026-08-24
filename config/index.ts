export { DIGITAL_PRODUCTS_NICHE } from './niche'
export type { NicheConfig } from './niche'

export const config = {
  logLevel: (process.env.LOG_LEVEL as 'debug' | 'info' | 'warn' | 'error') || 'info',
}
