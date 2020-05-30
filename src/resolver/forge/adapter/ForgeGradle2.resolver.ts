import AdmZip from 'adm-zip'
import { createHash } from 'crypto'
import { copy, lstat, mkdirs, pathExists, readFile, remove } from 'fs-extra'
import { Module, Type } from 'helios-distribution-types'
import { basename, join } from 'path'
import { VersionManifestFG2 } from '../../../model/forge/VersionManifestFG2'
import { LibRepoStructure } from '../../../model/struct/repo/librepo.struct'
import { MavenUtil } from '../../../util/maven'
import { PackXZExtractWrapper } from '../../../util/PackXZExtractWrapper'
import { VersionUtil } from '../../../util/versionutil'
import { ForgeResolver } from '../forge.resolver'
import { MinecraftVersion } from '../../../util/MinecraftVersion'

type ArrayElement<A> = A extends readonly (infer T)[] ? T : never

export class ForgeGradle2Adapter extends ForgeResolver {

    public static isForVersion(version: MinecraftVersion): boolean {
        return VersionUtil.isVersionAcceptable(version, [7, 8, 9, 10, 11, 12])
    }

    protected readonly MOJANG_REMOTE_REPOSITORY = 'https://libraries.minecraft.net/'

    constructor(
        absoluteRoot: string,
        relativeRoot: string,
        baseUrl: string,
        minecraftVersion: MinecraftVersion,
        forgeVersion: string
    ) {
        super(absoluteRoot, relativeRoot, baseUrl, minecraftVersion, forgeVersion)
    }

    public async getModule(): Promise<Module> {
        return this.getForgeByVersion()
    }

    public isForVersion(version: MinecraftVersion): boolean {
        return ForgeGradle2Adapter.isForVersion(version)
    }

    public async getForgeByVersion(): Promise<Module> {
        const libRepo = this.repoStructure.getLibRepoStruct()
        const targetLocalPath = libRepo.getLocalForge(this.artifactVersion, 'universal')
        console.debug(`Checking for forge version at ${targetLocalPath}..`)
        if (!await libRepo.artifactExists(targetLocalPath)) {
            console.debug('Forge not found locally, initializing download..')
            await libRepo.downloadArtifactByComponents(
                this.REMOTE_REPOSITORY,
                LibRepoStructure.FORGE_GROUP,
                LibRepoStructure.FORGE_ARTIFACT,
                this.artifactVersion, 'universal', 'jar')
        } else {
            console.debug('Using locally discovered forge.')
        }
        console.debug(`Beginning processing of Forge v${this.forgeVersion} (Minecraft ${this.minecraftVersion})`)

        const forgeUniversalBuffer = await readFile(targetLocalPath)
        const zip = new AdmZip(forgeUniversalBuffer)
        const zipEntries = zip.getEntries()

        let versionManifest

        for (const entry of zipEntries) {
            if (entry.entryName === 'version.json') {
                versionManifest = zip.readAsText(entry)
                break
            }
        }

        if (!versionManifest) {
            throw new Error('Failed to find version.json in forge universal jar.')
        }

        versionManifest = JSON.parse(versionManifest) as VersionManifestFG2

        const forgeModule: Module = {
            id: MavenUtil.mavenComponentsToIdentifier(
                LibRepoStructure.FORGE_GROUP,
                LibRepoStructure.FORGE_ARTIFACT,
                this.artifactVersion, 'universal'
            ),
            name: 'Minecraft Forge',
            type: Type.ForgeHosted,
            artifact: this.generateArtifact(
                forgeUniversalBuffer,
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
            console.debug(`Processing ${lib.name}..`)

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
                            console.debug('Hashes do not match, redownloading..')
                            queueDownload = true
                        }
                    }
                }
            } else {
                console.debug('Not found locally, downloading..')
                queueDownload = true
            }

            if (queueDownload) {
                await libRepo.downloadArtifactById(lib.url || this.MOJANG_REMOTE_REPOSITORY, lib.name, extension)
                libBuf = await readFile(localPath)
            } else {
                console.debug('Using local copy.')
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
                console.error(`Error during post processing, could not update ${entry.id}`)
            }
        }

        return forgeModule
    }

    private async determineExtension(lib: ArrayElement<VersionManifestFG2['libraries']>, libRepo: LibRepoStructure): Promise<string> {
        if(lib.url == null) {
            return 'jar'
        }
        console.log('Determing extension..')
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

        console.debug('Spawning PackXZExtract.')
        await PackXZExtractWrapper.extractUnpack(files)
        console.debug('All files extracted, calculating hashes..')

        for (const entry of processingQueue) {
            const tmpFileName = basename(entry.localPath)
            const tmpFile = join(tempDir, tmpFileName.substring(0, tmpFileName.indexOf('.pack.xz')))
            const buf = await readFile(tmpFile)
            accumulator.push({
                id: entry.id,
                MD5: createHash('md5').update(buf).digest('hex')
            })
        }

        console.debug('Complete, removing temp directory..')

        await remove(tempDir)

        return accumulator
    }

}
