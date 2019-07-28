/* tslint:disable:no-shadowed-variable */
import { resolve } from 'path'
import yargs from 'yargs'

// Registering yargs configuration.
// tslint:disable-next-line:no-unused-expression
yargs
.scriptName('')
.coerce({
    root: resolve
})
.command({
    command: 'generate <root>',
    aliases: ['g'],
    describe: 'Generate a distribution.json',
    builder: (yargs) => {
        return yargs.positional('root', {
            describe: 'File structure root',
            type: 'string'
        })
    },
    handler: (argv) => {
        console.log(`got generate with root=${argv.root}`)
    }
})
.demandCommand()
.help()
.argv
