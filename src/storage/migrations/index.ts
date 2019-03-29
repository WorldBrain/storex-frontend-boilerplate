import { MigrationList } from '@worldbrain/storex-schema-migrations/lib/types'

const MIGRATIONS : MigrationList = [
    require('./2018-03-04').default
]

export default MIGRATIONS
