/* tslint:disable:no-shadowed-variable */
import { resolve } from 'path'
import yargs from 'yargs'

function positionalRoot(yargs: yargs.Argv) {
    return yargs.positional('root', {
        describe: 'File structure root',
        type: 'string'
    })
}

// Registering yargs configuration.
// tslint:disable-next-line:no-unused-expression
yargs
.scriptName('')
.coerce({
    root: resolve
})
.command({
    command: 'generate server <root>',
    aliases: ['g'],
    describe: 'Generate a distribution.json',
    builder: (yargs) => {
        return positionalRoot(yargs)
    },
    handler: (argv) => {
        console.log(`got generate with root=${argv.root}`)
    }
})
.demandCommand()
.help()
.argv
