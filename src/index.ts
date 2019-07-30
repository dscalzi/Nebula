/* tslint:disable:no-shadowed-variable */
import { resolve } from 'path'
import yargs from 'yargs'

function rootOption(yargs: yargs.Argv) {
    return yargs.option('root', {
        describe: 'File structure root.',
        type: 'string',
        demandOption: true,
        global: true
    })
    .coerce({
        root: resolve
    })
}

function namePositional(yargs: yargs.Argv) {
    return yargs.option('name', {
        describe: 'Distribution index file name.',
        type: 'string',
        default: 'distribution'
    })
}

// -------------
// Init Commands

const initRootCommand: yargs.CommandModule = {
    command: 'root',
    describe: 'Generate an empty standard file structure.',
    builder: (yargs) => {
        yargs = rootOption(yargs)
        return yargs
    },
    handler: (argv) => {
        console.log(`Root set to ${argv.root}`)
        console.log('Invoked init root.')
    }
}

const initCommand: yargs.CommandModule = {
    command: 'init',
    aliases: ['i'],
    describe: 'Base init command.',
    builder: (yargs) => {
        return yargs
        .command(initRootCommand)
    },
    handler: (argv) => {
        argv._handled = true
    }
}

// -----------------
// Generate Commands

const generateServerCommand: yargs.CommandModule = {
    command: 'server <id> <version>',
    describe: 'Generate a new server configuration.',
    builder: (yargs) => {
        yargs = rootOption(yargs)
        return yargs
        .positional('id', {
            describe: 'Server id.',
            type: 'string'
        })
        .positional('version', {
            describe: 'Minecraft version.',
            type: 'string'
        })
        .option('forge', {
            describe: 'Include Forge.',
            type: 'boolean',
            default: true
        })
        .option('liteloader', {
            describe: 'Include liteloader.',
            type: 'boolean',
            default: false
        })
    },
    handler: (argv) => {
        console.log(`Root set to ${argv.root}`)
        console.log(`Generating server ${argv.id} for Minecraft ${argv.version}.`,
        `\n\t├ Include forge: ${argv.forge}`,
        `\n\t└ Include liteloader: ${argv.liteloader}`)
    }
}

const generateDistroCommand: yargs.CommandModule = {
    command: 'distro [name]',
    describe: 'Generate a distribution index from the root file structure.',
    builder: (yargs) => {
        yargs = rootOption(yargs)
        yargs = namePositional(yargs)
        return yargs
    },
    handler: (argv) => {
        console.log(`Root set to ${argv.root}`)
        console.log(`Invoked generate distro name ${argv.name}.json.`)
    }
}

const generateCommand: yargs.CommandModule = {
    command: 'generate',
    aliases: ['g'],
    describe: 'Base generate command.',
    builder: (yargs) => {
        return yargs
        .command(generateServerCommand)
        .command(generateDistroCommand)
    },
    handler: (argv) => {
        argv._handled = true
    }
}

const validateCommand: yargs.CommandModule = {
    command: 'validate [name]',
    describe: 'Validate a distribution.json against the spec.',
    builder: (yargs) => {
        return namePositional(yargs)
    },
    handler: (argv) => {
        console.log(`Invoked validate with name ${argv.name}.json`)
    }
}

// Registering yargs configuration.
// tslint:disable-next-line:no-unused-expression
yargs
.version(false)
.scriptName('')
.command(initCommand)
.command(generateCommand)
.command(validateCommand)
.demandCommand()
.help()
.argv
