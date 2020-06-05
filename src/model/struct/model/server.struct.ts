import { lstat, mkdirs, pathExists, readdir, readFile, writeFile } from 'fs-extra'
import { Server, Module } from 'helios-distribution-types'
import { dirname, join, resolve as resolvePath } from 'path'
import { resolve as resolveUrl } from 'url'
import { VersionSegmentedRegistry } from '../../../util/VersionSegmentedRegistry'
import { ServerMeta, getDefaultServerMeta, ServerMetaOptions } from '../../nebula/servermeta'
import { BaseModelStructure } from './basemodel.struct'
import { MiscFileStructure } from './module/file.struct'
import { LiteModStructure } from './module/litemod.struct'
import { LibraryStructure } from './module/library.struct'
import { MinecraftVersion } from '../../../util/MinecraftVersion'
import { LoggerUtil } from '../../../util/LoggerUtil'

export class ServerStructure extends BaseModelStructure<Server> {

    private static readonly logger = LoggerUtil.getLogger('ServerStructure')

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
        minecraftVersion: MinecraftVersion,
        options: {
            forgeVersion?: string
            liteloaderVersion?: string
        }
    ): Promise<void> {
        const effectiveId = `${id}-${minecraftVersion}`
        const absoluteServerRoot = resolvePath(this.containerDirectory, effectiveId)
        const relativeServerRoot = join(this.relativeRoot, effectiveId)

        if (await pathExists(absoluteServerRoot)) {
            ServerStructure.logger.error('Server already exists! Aborting.')
            return
        }

        await mkdirs(absoluteServerRoot)

        const serverMetaOpts: ServerMetaOptions = {}

        if (options.forgeVersion != null) {
            const fms = VersionSegmentedRegistry.getForgeModStruct(
                minecraftVersion,
                options.forgeVersion,
                absoluteServerRoot,
                relativeServerRoot,
                this.baseUrl
            )
            await fms.init()
            serverMetaOpts.forgeVersion = options.forgeVersion
        }

        if (options.liteloaderVersion != null) {
            const lms = new LiteModStructure(absoluteServerRoot, relativeServerRoot, this.baseUrl)
            await lms.init()
            serverMetaOpts.liteloaderVersion = options.liteloaderVersion
        }

        const serverMeta: ServerMeta = getDefaultServerMeta(id, minecraftVersion.toString(), serverMetaOpts)
        await writeFile(resolvePath(absoluteServerRoot, 'servermeta.json'), JSON.stringify(serverMeta, null, 2))

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
                    ServerStructure.logger.warn(`Server directory ${file} does not match the defined standard.`)
                    ServerStructure.logger.warn('All server ids must end with -<minecraft version> (ex. -1.12.2)')
                    continue
                }

                let iconUrl: string = null!

                // Resolve server icon
                const subFiles = await readdir(absoluteServerRoot)
                for (const subFile of subFiles) {
                    const caseInsensitive = subFile.toLowerCase()
                    if (caseInsensitive.endsWith('.jpg') || caseInsensitive.endsWith('.png')) {
                        iconUrl = resolveUrl(this.baseUrl, join(relativeServerRoot, subFile))
                    }
                }

                if (!iconUrl) {
                    ServerStructure.logger.warn(`No icon file found for server ${file}.`)
                }

                // Read server meta
                const serverMeta: ServerMeta = JSON.parse(await readFile(resolvePath(absoluteServerRoot, 'servermeta.json'), 'utf-8'))
                const minecraftVersion = new MinecraftVersion(match[2])

                const modules: Module[] = []

                if(serverMeta.forge) {
                    const forgeResolver = VersionSegmentedRegistry.getForgeResolver(
                        minecraftVersion,
                        serverMeta.forge.version,
                        dirname(this.containerDirectory),
                        '',
                        this.baseUrl
                    )

                    // Resolve forge
                    const forgeItselfModule = await forgeResolver.getModule()
                    modules.push(forgeItselfModule)

                    const forgeModStruct = VersionSegmentedRegistry.getForgeModStruct(
                        minecraftVersion,
                        serverMeta.forge.version,
                        absoluteServerRoot,
                        relativeServerRoot,
                        this.baseUrl
                    )

                    const forgeModModules = await forgeModStruct.getSpecModel()
                    modules.push(...forgeModModules)
                }

                
                if(serverMeta.liteloader) {
                    const liteModStruct = new LiteModStructure(absoluteServerRoot, relativeServerRoot, this.baseUrl)
                    const liteModModules = await liteModStruct.getSpecModel()
                    modules.push(...liteModModules)
                }
                
                const libraryStruct = new LibraryStructure(absoluteServerRoot, relativeServerRoot, this.baseUrl)
                const libraryModules = await libraryStruct.getSpecModel()
                modules.push(...libraryModules)

                const fileStruct = new MiscFileStructure(absoluteServerRoot, relativeServerRoot, this.baseUrl)
                const fileModules = await fileStruct.getSpecModel()
                modules.push(...fileModules)

                accumulator.push({
                    id: match[1],
                    name: serverMeta.meta.name,
                    description: serverMeta.meta.description,
                    icon: iconUrl,
                    version: serverMeta.meta.version,
                    address: serverMeta.meta.address,
                    minecraftVersion: match[2],
                    ...(serverMeta.meta.discord ? {discord: serverMeta.meta.discord} : {}),
                    mainServer: serverMeta.meta.mainServer,
                    autoconnect: serverMeta.meta.autoconnect,
                    modules
                })

            } else {
                ServerStructure.logger.warn(`Path ${file} in server directory is not a directory!`)
            }
        }
        return accumulator
    }

}
