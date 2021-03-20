import { createHash } from 'crypto'
import { copy, lstat, mkdirs, pathExists, readFile, remove } from 'fs-extra'
import { Module, Type } from 'helios-distribution-types'
import { basename, join } from 'path'
import { VersionManifestFG2 } from '../../../model/forge/VersionManifestFG2'
import { LibRepoStructure } from '../../../structure/repo/LibRepo.struct'
import { MavenUtil } from '../../../util/maven'
import { PackXZExtractWrapper } from '../../../util/java/PackXZExtractWrapper'
import { VersionUtil } from '../../../util/versionutil'
import { ForgeResolver } from '../forge.resolver'
import { MinecraftVersion } from '../../../util/MinecraftVersion'
import { LoggerUtil } from '../../../util/LoggerUtil'

type ArrayElement<A> = A extends readonly (infer T)[] ? T : never

export class ForgeGradle2Adapter extends ForgeResolver {

    private static readonly logger = LoggerUtil.getLogger('FG2 Adapter')

    public static isForVersion(version: MinecraftVersion, libraryVersion: string): boolean {
        if(version.getMinor() === 12 && !VersionUtil.isOneDotTwelveFG2(libraryVersion)) {
            return false
        }
        return VersionUtil.isVersionAcceptable(version, [7, 8, 9, 10, 11, 12])
    }

    constructor(
        absoluteRoot: string,
        relativeRoot: string,
        baseUrl: string,
        minecraftVersion: MinecraftVersion,
        forgeVersion: string,
        discardOutput: boolean,
        invalidateCache: boolean
    ) {
        super(absoluteRoot, relativeRoot, baseUrl, minecraftVersion, forgeVersion, discardOutput, invalidateCache)
    }

    public async getModule(): Promise<Module> {
        return this.getForgeByVersion()
    }

    public isForVersion(version: MinecraftVersion, libraryVersion: string): boolean {
        return ForgeGradle2Adapter.isForVersion(version, libraryVersion)
    }

    public async getForgeByVersion(): Promise<Module> {
        const libRepo = this.repoStructure.getLibRepoStruct()
        const targetLocalPath = libRepo.getLocalForge(this.artifactVersion, 'universal')
        ForgeGradle2Adapter.logger.debug(`Checking for forge version at ${targetLocalPath}..`)
        if (!await libRepo.artifactExists(targetLocalPath)) {
            ForgeGradle2Adapter.logger.debug('Forge not found locally, initializing download..')
            await libRepo.downloadArtifactByComponents(
                this.REMOTE_REPOSITORY,
                LibRepoStructure.FORGE_GROUP,
                LibRepoStructure.FORGE_ARTIFACT,
                this.artifactVersion, 'universal', 'jar')
        } else {
            ForgeGradle2Adapter.logger.debug('Using locally discovered forge.')
        }
        ForgeGradle2Adapter.logger.debug(`Beginning processing of Forge v${this.forgeVersion} (Minecraft ${this.minecraftVersion})`)

        let versionManifestBuf: Buffer
        try {
            versionManifestBuf = await this.getVersionManifestFromJar(targetLocalPath)
        } catch(err) {
            throw new Error('Failed to find version.json in forge universal jar.')
        }

        const versionManifest = JSON.parse(versionManifestBuf.toString()) as VersionManifestFG2

        const forgeModule: Module = {
            id: MavenUtil.mavenComponentsToIdentifier(
                LibRepoStructure.FORGE_GROUP,
                LibRepoStructure.FORGE_ARTIFACT,
                this.artifactVersion, 'universal'
            ),
            name: 'Minecraft Forge',
            type: Type.ForgeHosted,
            artifact: this.generateArtifact(
                await readFile(targetLocalPath),
                await lstat(targetLocalPath),
                libRepo.getArtifactUrlByComponents(
                    this.baseUrl,
                    LibRepoStructure.FORGE_GROUP,
                    LibRepoStructure.FORGE_ARTIFACT,
                    this.artifactVersion, 'universal'
                )
            ),
            subModules: []
        }

        const postProcessQueue = []

        for (const lib of versionManifest.libraries) {
            if (lib.name.startsWith('net.minecraftforge:forge:')) {
                // We've already processed forge.
                continue
            }
            ForgeGradle2Adapter.logger.debug(`Processing ${lib.name}..`)

            const extension = await this.determineExtension(lib, libRepo)
            const localPath = libRepo.getArtifactById(lib.name, extension)

            const postProcess = extension === 'jar.pack.xz'

            let queueDownload = !await libRepo.artifactExists(localPath)
            let libBuf

            if (!queueDownload) {
                libBuf = await readFile(localPath)
                // VERIFY HASH
                if (!postProcess) { // Checksums for .pack.xz in the version.json are completely useless.
                    if (lib.checksums != null && lib.checksums.length == 1) {
                        const sha1 = createHash('sha1').update(libBuf).digest('hex')
                        if (sha1 !== lib.checksums[0]) {
                            ForgeGradle2Adapter.logger.debug('Hashes do not match, redownloading..')
                            queueDownload = true
                        }
                    }
                }
            } else {
                ForgeGradle2Adapter.logger.debug('Not found locally, downloading..')
                queueDownload = true
            }

            if (queueDownload) {
                await libRepo.downloadArtifactById(lib.url || this.MOJANG_REMOTE_REPOSITORY, lib.name, extension)
                libBuf = await readFile(localPath)
            } else {
                ForgeGradle2Adapter.logger.debug('Using local copy.')
            }

            const stats = await lstat(localPath)

            const mavenComponents = MavenUtil.getMavenComponents(lib.name)
            const properId = MavenUtil.mavenComponentsToIdentifier(
                mavenComponents.group, mavenComponents.artifact, mavenComponents.version,
                mavenComponents.classifier, extension
            )

            forgeModule.subModules?.push({
                id: properId,
                name: `Minecraft Forge (${mavenComponents?.artifact})`,
                type: Type.Library,
                artifact: this.generateArtifact(
                    libBuf as Buffer,
                    stats,
                    libRepo.getArtifactUrlByComponents(
                        this.baseUrl,
                        mavenComponents.group, mavenComponents.artifact,
                        mavenComponents.version, mavenComponents.classifier, extension
                    )
                )
            })

            if (postProcess) {
                postProcessQueue.push({
                    id: properId,
                    localPath
                })
            }

        }

        for (const entry of await this.processPackXZFiles(postProcessQueue)) {
            const el = forgeModule.subModules?.find((element) => element.id === entry.id)
            if (el != null) {
                el.artifact.MD5 = entry.MD5
            } else {
                ForgeGradle2Adapter.logger.error(`Error during post processing, could not update ${entry.id}`)
            }
        }

        return forgeModule
    }

    private async determineExtension(lib: ArrayElement<VersionManifestFG2['libraries']>, libRepo: LibRepoStructure): Promise<string> {
        if(lib.url == null) {
            return 'jar'
        }
        ForgeGradle2Adapter.logger.debug('Determing extension..')
        const possibleExt = [
            'jar.pack.xz',
            'jar'
        ]
        // Check locally.
        for(const ext of possibleExt) {
            const localPath = libRepo.getArtifactById(lib.name, ext)
            const exists = await libRepo.artifactExists(localPath)
            if(exists) {
                return ext
            }
        }
        // Check remote.
        for(const ext of possibleExt) {
            const exists = await libRepo.headArtifactById(this.REMOTE_REPOSITORY, lib.name, ext)
            if(exists) {
                return ext
            }
        }
        // Default to jar.
        return 'jar'
    }

    private async processPackXZFiles(
        processingQueue: Array<{id: string, localPath: string}>
    ): Promise<Array<{id: string, MD5: string}>> {

        if(processingQueue.length == 0) {
            return []
        }

        const accumulator = []

        const tempDir = this.repoStructure.getTempDirectory()

        if (await pathExists(tempDir)) {
            await remove(tempDir)
        }

        await mkdirs(tempDir)

        const files = []
        for (const entry of processingQueue) {
            const tmpFile = join(tempDir, basename(entry.localPath))
            await copy(entry.localPath, tmpFile)
            files.push(tmpFile)
        }

        ForgeGradle2Adapter.logger.debug('Spawning PackXZExtract.')
        const packXZExecutor = new PackXZExtractWrapper()
        await packXZExecutor.extractUnpack(files)
        ForgeGradle2Adapter.logger.debug('All files extracted, calculating hashes..')

        for (const entry of processingQueue) {
            const tmpFileName = basename(entry.localPath)
            const tmpFile = join(tempDir, tmpFileName.substring(0, tmpFileName.indexOf('.pack.xz')))
            const buf = await readFile(tmpFile)
            accumulator.push({
                id: entry.id,
                MD5: createHash('md5').update(buf).digest('hex')
            })
        }

        ForgeGradle2Adapter.logger.debug('Complete, removing temp directory..')

        await remove(tempDir)

        return accumulator
    }

}
