import yargs from 'yargs'
import { resolve } from 'path'

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