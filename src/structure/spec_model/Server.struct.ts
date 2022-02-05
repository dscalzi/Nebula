import { lstat, mkdirs, pathExists, readdir, readFile, writeFile } from 'fs-extra'
import { Server, Module } from 'helios-distribution-types'
import { dirname, join, resolve as resolvePath } from 'path'
import { URL } from 'url'
import { VersionSegmentedRegistry } from '../../util/VersionSegmentedRegistry'
import { ServerMeta, getDefaultServerMeta, ServerMetaOptions, UntrackedFilesOption } from '../../model/nebula/servermeta'
import { BaseModelStructure } from './BaseModel.struct'
import { MiscFileStructure } from './module/File.struct'
import { LibraryStructure } from './module/Library.struct'
import { MinecraftVersion } from '../../util/MinecraftVersion'
import { addSchemaToObject, SchemaTypes } from '../../util/SchemaUtil'

export class ServerStructure extends BaseModelStructure<Server> {

    private readonly ID_REGEX = /(.+-(.+)$)/
    private readonly SERVER_META_FILE = 'servermeta.json'

    constructor(
        absoluteRoot: string,
        baseUrl: string,
        private discardOutput: boolean,
        private invalidateCache: boolean
    ) {
        super(absoluteRoot, '', 'servers', baseUrl)
    }

    public getLoggerName(): string {
        return 'ServerStructure'
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
        }
    ): Promise<void> {
        const effectiveId = `${id}-${minecraftVersion}`
        const absoluteServerRoot = resolvePath(this.containerDirectory, effectiveId)
        const relativeServerRoot = join(this.relativeRoot, effectiveId)

        if (await pathExists(absoluteServerRoot)) {
            this.logger.error('Server already exists! Aborting.')
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
                this.baseUrl,
                []
            )
            await fms.init()
            serverMetaOpts.forgeVersion = options.forgeVersion
        }

        const serverMeta: ServerMeta = addSchemaToObject(
            getDefaultServerMeta(id, minecraftVersion.toString(), serverMetaOpts),
            SchemaTypes.ServerMetaSchema,
            this.absoluteRoot
        )
        await writeFile(resolvePath(absoluteServerRoot, this.SERVER_META_FILE), JSON.stringify(serverMeta, null, 2))

        const libS = new LibraryStructure(absoluteServerRoot, relativeServerRoot, this.baseUrl, minecraftVersion, [])
        await libS.init()

        const mfs = new MiscFileStructure(absoluteServerRoot, relativeServerRoot, this.baseUrl, minecraftVersion, [])
        await mfs.init()

    }

    private async _doSeverRetrieval(): Promise<Server[]> {

        const accumulator: Server[] = []
        const files = await readdir(this.containerDirectory)
        for (const file of files) {
            const absoluteServerRoot = resolvePath(this.containerDirectory, file)
            const relativeServerRoot = join(this.relativeRoot, file)
            if ((await lstat(absoluteServerRoot)).isDirectory()) {

                this.logger.info(`Beginning processing of ${file}.`)

                const match = this.ID_REGEX.exec(file)
                if (match == null) {
                    this.logger.warn(`Server directory ${file} does not match the defined standard.`)
                    this.logger.warn('All server ids must end with -<minecraft version> (ex. -1.12.2)')
                    continue
                }

                let iconUrl: string = null!

                // Resolve server icon
                const subFiles = await readdir(absoluteServerRoot)
                for (const subFile of subFiles) {
                    const caseInsensitive = subFile.toLowerCase()
                    if (caseInsensitive.endsWith('.jpg') || caseInsensitive.endsWith('.png')) {
                        iconUrl = new URL(join(relativeServerRoot, subFile), this.baseUrl).toString()
                    }
                }

                if (!iconUrl) {
                    this.logger.warn(`No icon file found for server ${file}.`)
                }

                // Read server meta
                const serverMeta: ServerMeta = JSON.parse(await readFile(resolvePath(absoluteServerRoot, this.SERVER_META_FILE), 'utf-8'))
                const minecraftVersion = new MinecraftVersion(match[2])
                const untrackedFiles: UntrackedFilesOption[] = serverMeta.untrackedFiles || []

                const modules: Module[] = []

                if(serverMeta.forge) {
                    const forgeResolver = VersionSegmentedRegistry.getForgeResolver(
                        minecraftVersion,
                        serverMeta.forge.version,
                        dirname(this.containerDirectory),
                        '',
                        this.baseUrl,
                        this.discardOutput,
                        this.invalidateCache
                    )

                    // Resolve forge
                    const forgeItselfModule = await forgeResolver.getModule()
                    modules.push(forgeItselfModule)

                    const forgeModStruct = VersionSegmentedRegistry.getForgeModStruct(
                        minecraftVersion,
                        serverMeta.forge.version,
                        absoluteServerRoot,
                        relativeServerRoot,
                        this.baseUrl,
                        untrackedFiles
                    )

                    const forgeModModules = await forgeModStruct.getSpecModel()
                    modules.push(...forgeModModules)
                }

                const libraryStruct = new LibraryStructure(absoluteServerRoot, relativeServerRoot, this.baseUrl, minecraftVersion, untrackedFiles)
                const libraryModules = await libraryStruct.getSpecModel()
                modules.push(...libraryModules)

                const fileStruct = new MiscFileStructure(absoluteServerRoot, relativeServerRoot, this.baseUrl, minecraftVersion, untrackedFiles)
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
                this.logger.warn(`Path ${file} in server directory is not a directory!`)
            }
        }
        return accumulator
    }

}
