import { lstat, mkdirs, pathExists, readdir, readFile, writeFile } from 'fs-extra'
import { Server } from 'helios-distribution-types'
import { dirname, join, resolve as resolvePath } from 'path'
import { resolve as resolveUrl } from 'url'
import { VersionSegmentedRegistry } from '../../../util/VersionSegmentedRegistry'
import { ServerMeta } from '../../nebula/servermeta'
import { BaseModelStructure } from './basemodel.struct'
import { MiscFileStructure } from './module/file.struct'
import { LiteModStructure } from './module/litemod.struct'
import { LibraryStructure } from './module/library.struct'

export class ServerStructure extends BaseModelStructure<Server> {

    private readonly ID_REGEX = /(.+-(.+)$)/

    constructor(
        absoluteRoot: string,
        baseUrl: string
    ) {
        super(absoluteRoot, '', 'servers', baseUrl)
    }

    public async getSpecModel(): Promise<Server[]> {
        if (this.resolvedModels == null) {
            this.resolvedModels = await this._doSeverRetrieval()
        }
        return this.resolvedModels
    }

    public async createServer(
        id: string,
        minecraftVersion: string,
        options: {
            forgeVersion?: string
            liteloaderVersion?: string
        }
    ): Promise<void> {
        const effectiveId = `${id}-${minecraftVersion}`
        const absoluteServerRoot = resolvePath(this.containerDirectory, effectiveId)
        const relativeServerRoot = join(this.relativeRoot, effectiveId)

        if (await pathExists(absoluteServerRoot)) {
            console.error('Server already exists! Aborting.')
            return
        }

        await mkdirs(absoluteServerRoot)

        if (options.forgeVersion != null) {
            const fms = VersionSegmentedRegistry.getForgeModStruct(
                minecraftVersion,
                absoluteServerRoot,
                relativeServerRoot,
                this.baseUrl
            )
            await fms.init()
            const serverMeta: ServerMeta = {
                forgeVersion: options.forgeVersion
            }
            await writeFile(resolvePath(absoluteServerRoot, 'servermeta.json'), JSON.stringify(serverMeta, null, 2))
        }

        if (options.liteloaderVersion != null) {
            const lms = new LiteModStructure(absoluteServerRoot, relativeServerRoot, this.baseUrl)
            await lms.init()
        }

        const libS = new LibraryStructure(absoluteServerRoot, relativeServerRoot, this.baseUrl)
        await libS.init()

        const mfs = new MiscFileStructure(absoluteServerRoot, relativeServerRoot, this.baseUrl)
        await mfs.init()

    }

    private async _doSeverRetrieval(): Promise<Server[]> {

        const accumulator: Server[] = []
        const files = await readdir(this.containerDirectory)
        for (const file of files) {
            const absoluteServerRoot = resolvePath(this.containerDirectory, file)
            const relativeServerRoot = join(this.relativeRoot, file)
            if ((await lstat(absoluteServerRoot)).isDirectory()) {

                const match = this.ID_REGEX.exec(file)
                if (match == null) {
                    console.warn(`Server directory ${file} does not match the defined standard.`)
                    console.warn('All server ids must end with -<minecraft version> (ex. -1.12.2)')
                    continue
                }

                let iconUrl

                // Resolve server icon
                const subFiles = await readdir(absoluteServerRoot)
                for (const subFile of subFiles) {
                    const caseInsensitive = subFile.toLowerCase()
                    if (caseInsensitive.endsWith('.jpg') || caseInsensitive.endsWith('.png')) {
                        iconUrl = resolveUrl(this.baseUrl, join(relativeServerRoot, subFile))
                    }
                }

                if (!iconUrl) {
                    console.warn(`No icon file found for server ${file}.`)
                    iconUrl = '<FILL IN MANUALLY>'
                }

                // Read server meta
                const serverMeta: ServerMeta = JSON.parse(await readFile(resolvePath(absoluteServerRoot, 'servermeta.json'), 'utf-8'))
                const minecraftVersion = match[2]

                const forgeResolver = VersionSegmentedRegistry.getForgeResolver(
                    minecraftVersion,
                    serverMeta.forgeVersion,
                    dirname(this.containerDirectory),
                    '',
                    this.baseUrl
                )

                // Resolve forge
                const forgeItselfModule = await forgeResolver.getModule()

                const forgeModStruct = VersionSegmentedRegistry.getForgeModStruct(
                    minecraftVersion,
                    absoluteServerRoot,
                    relativeServerRoot,
                    this.baseUrl
                )
                const forgeModModules = await forgeModStruct.getSpecModel()

                const liteModStruct = new LiteModStructure(absoluteServerRoot, relativeServerRoot, this.baseUrl)
                const liteModModules = await liteModStruct.getSpecModel()

                const fileStruct = new MiscFileStructure(absoluteServerRoot, relativeServerRoot, this.baseUrl)
                const fileModules = await fileStruct.getSpecModel()

                const libraryStruct = new LibraryStructure(absoluteServerRoot, relativeServerRoot, this.baseUrl)
                const libraryModules = await libraryStruct.getSpecModel()

                const modules = [
                    forgeItselfModule,
                    ...libraryModules,
                    ...forgeModModules,
                    ...liteModModules,
                    ...fileModules
                ]

                accumulator.push({
                    id: match[1],
                    name: '<FILL IN MANUALLY>',
                    description: '<FILL IN MANUALLY>',
                    icon: iconUrl,
                    version: '1.0.0',
                    address: '<FILL IN MANUALLY>',
                    minecraftVersion: match[2],
                    discord: {
                        shortId: '<FILL IN MANUALLY OR REMOVE>',
                        largeImageText: '<FILL IN MANUALLY OR REMOVE>',
                        largeImageKey: '<FILL IN MANUALLY OR REMOVE>'
                    },
                    mainServer: false,
                    autoconnect: false,
                    modules
                })

            } else {
                console.warn(`Path ${file} in server directory is not a directory!`)
            }
        }
        return accumulator
    }

}
