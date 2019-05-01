import * as fs from 'fs'
import * as path from 'path'
import * as jsYaml from 'js-yaml'
import { executeMigration, selectMigrationFromList } from '@worldbrain/storex-schema-migrations'
import { MigrationSelection } from '@worldbrain/storex-schema-migrations/lib/types';
import { loadFixtures } from '@worldbrain/storex-data-tools/lib/test-fixtures/loading'
import { createStorage } from ".."
import migrations from './'

describe('Schema migrations: Version 2018-03-04', () => {
    it('should correctly execute', async () => {
        const storage = await createStorage({ backend: 'memory', dbName: 'unittest' })
        const fixtures = jsYaml.safeLoad(fs.readFileSync(path.join(__dirname, '2018-03-04.test.fixtures.yaml')).toString())
        await loadFixtures({ storageManager: storage.clientManager, fixtures: fixtures.base.objects })

        const migrationSelection : MigrationSelection = { fromVersion: new Date('2018-03-03'), toVersion: new Date('2018-03-04') }
        const migration = selectMigrationFromList(migrationSelection, migrations)
        await executeMigration(storage.clientManager.registry, storage.clientManager, migrationSelection, migration.config, { data: true })
    })
})
