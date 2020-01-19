/* tslint:disable:no-shadowed-variable */
import dotenv from 'dotenv'
import { writeFile } from 'fs-extra'
import { resolve as resolvePath } from 'path'
import { URL } from 'url'
import { inspect } from 'util'
import yargs from 'yargs'
import { DistributionStructure } from './model/struct/model/distribution.struct'
import { ServerStructure } from './model/struct/model/server.struct'
import { VersionSegmentedRegistry } from './util/VersionSegmentedRegistry'

dotenv.config()

function getRoot() {
    return resolvePath(process.env.ROOT as string)
}

function getBaseURL() {
    let baseUrl = process.env.BASE_URL as string
    // Users must provide protocol in all other instances.
    if (baseUrl.indexOf('//') === -1) {
        if (baseUrl.toLowerCase().startsWith('localhost')) {
            baseUrl = 'http://' + baseUrl
        } else {
            throw new TypeError('Please provide a URL protocol (ex. http:// or https://)')
        }
    }
    return (new URL(baseUrl)).toString()
}

// function rootOption(yargs: yargs.Argv) {
//     return yargs.option('root', {
//         describe: 'File structure root.',
//         type: 'string',
//         demandOption: true,
//         global: true
//     })
//     .coerce({
//         root: resolvePath
//     })
// }

// function baseUrlOption(yargs: yargs.Argv) {
//     return yargs.option('baseUrl', {
//         describe: 'Base url of your file host.',
//         type: 'string',
//         demandOption: true,
//         global: true
//     })
//     .coerce({
//         baseUrl: (arg: string) => {
//             // Users must provide protocol in all other instances.
//             if (arg.indexOf('//') === -1) {
//                 if (arg.toLowerCase().startsWith('localhost')) {
//                     arg = 'http://' + arg
//                 } else {
//                     throw new TypeError('Please provide a URL protocol (ex. http:// or https://)')
//                 }
//             }
//             return (new URL(arg)).toString()
//         }
//     })
// }

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
        // yargs = rootOption(yargs)
        return yargs
    },
    handler: async (argv) => {
        argv.root = getRoot()

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
        // yargs = rootOption(yargs)
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
            describe: 'Forge version.',
            type: 'string',
            default: null
        })
        .option('liteloader', {
            describe: 'LiteLoader version.',
            type: 'string',
            default: null
        })
    },
    handler: (argv) => {
        argv.root = getRoot()

        console.debug(`Root set to ${argv.root}`)
        console.debug(`Generating server ${argv.id} for Minecraft ${argv.version}.`,
        `\n\t├ Forge version: ${argv.forge}`,
        `\n\t└ LiteLoader version: ${argv.liteloader}`)

        const serverStruct = new ServerStructure(argv.root as string, getBaseURL())
        serverStruct.createServer(
            argv.id as string,
            argv.version as string,
            {
                forgeVersion: argv.forge as string,
                liteloaderVersion: argv.liteloader as string
            }
        )

    }
}

const generateDistroCommand: yargs.CommandModule = {
    command: 'distro [name]',
    describe: 'Generate a distribution index from the root file structure.',
    builder: (yargs) => {
        // yargs = rootOption(yargs)
        // yargs = baseUrlOption(yargs)
        yargs = namePositional(yargs)
        return yargs
    },
    handler: async (argv) => {
        argv.root = getRoot()
        argv.baseUrl = getBaseURL()

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
        console.log(process.cwd())
        const resolver = VersionSegmentedRegistry.getForgeResolver(argv.mcVer as string,
            argv.forgeVer as string, getRoot(), '', getBaseURL())
        if (resolver != null) {
            const mdl = await resolver.getModule()
            console.log(inspect(mdl, false, null, true))
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
