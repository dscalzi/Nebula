/* tslint:disable:no-shadowed-variable */
import { writeFile } from 'fs-extra'
import { resolve as resolvePath } from 'path'
import { URL } from 'url'
import yargs from 'yargs'
import { DistributionStructure } from './model/struct/model/distribution.struct'
import { ResolverRegistry } from './resolver/ResolverRegistry'

function rootOption(yargs: yargs.Argv) {
    return yargs.option('root', {
        describe: 'File structure root.',
        type: 'string',
        demandOption: true,
        global: true
    })
    .coerce({
        root: resolvePath
    })
}

function baseUrlOption(yargs: yargs.Argv) {
    return yargs.option('baseUrl', {
        describe: 'Base url of your file host.',
        type: 'string',
        demandOption: true,
        global: true
    })
    .coerce({
        baseUrl: (arg: string) => {
            // Users must provide protocol in all other instances.
            if (arg.indexOf('//') === -1) {
                if (arg.toLowerCase().startsWith('localhost')) {
                    arg = 'http://' + arg
                } else {
                    throw new TypeError('Please provide a URL protocol (ex. http:// or https://)')
                }
            }
            return (new URL(arg)).toString()
        }
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
    handler: async (argv) => {
        console.debug(`Root set to ${argv.root}`)
        console.debug('Invoked init root.')
        try {
            await new DistributionStructure(argv.root as string, '').init()
            console.log(`Successfully created new root at ${argv.root}`)
        } catch (error) {
            console.error(`Failed to init new root at ${argv.root}`, error)
        }
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
        console.debug(`Root set to ${argv.root}`)
        console.debug(`Generating server ${argv.id} for Minecraft ${argv.version}.`,
        `\n\t├ Include forge: ${argv.forge}`,
        `\n\t└ Include liteloader: ${argv.liteloader}`)
    }
}

const generateDistroCommand: yargs.CommandModule = {
    command: 'distro [name]',
    describe: 'Generate a distribution index from the root file structure.',
    builder: (yargs) => {
        yargs = rootOption(yargs)
        yargs = baseUrlOption(yargs)
        yargs = namePositional(yargs)
        return yargs
    },
    handler: async (argv) => {
        console.debug(`Root set to ${argv.root}`)
        console.debug(`Base Url set to ${argv.baseUrl}`)
        console.debug(`Invoked generate distro name ${argv.name}.json.`)
        try {
            const distributionStruct = new DistributionStructure(argv.root as string, argv.baseUrl as string)
            const distro = await distributionStruct.getSpecModel()
            writeFile(resolvePath(argv.root as string, `${argv.name}.json`), JSON.stringify(distro, null, 2))
            console.log(distro)
        } catch (error) {
            console.error(`Failed to generate distribution with root ${argv.root}.`, error)
        }
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
        console.debug(`Invoked validate with name ${argv.name}.json`)
    }
}

const testCommand: yargs.CommandModule = {
    command: 'test <mcVer> <forgeVer>',
    describe: 'Validate a distribution.json against the spec.',
    builder: (yargs) => {
        return namePositional(yargs)
    },
    handler: async (argv) => {
        console.debug(`Invoked test with mcVer ${argv.mcVer} forgeVer ${argv.forgeVer}`)
        const resolver = ResolverRegistry.getForgeResolver('1.12.2', '14.23.5.2847', 'D:/TestRoot2', 'D:/TestRoot2')
        if (resolver != null) {
            const mdl = await resolver.getModule()
            console.log(mdl)
        }
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
.command(testCommand)
.demandCommand()
.help()
.argv
