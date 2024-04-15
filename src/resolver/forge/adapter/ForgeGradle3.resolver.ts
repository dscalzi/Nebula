import { ForgeResolver } from '../Forge.resolver.js'
import { MinecraftVersion } from '../../../util/MinecraftVersion.js'
import { LoggerUtil } from '../../../util/LoggerUtil.js'
import { VersionUtil } from '../../../util/VersionUtil.js'
import { Module, Type } from 'helios-distribution-types'
import { LibRepoStructure } from '../../../structure/repo/LibRepo.struct.js'
import { mkdirs, writeJson } from 'fs-extra/esm'
import { lstat, readFile } from 'fs/promises'
import { dirname } from 'path'
import { VersionManifestFG3 } from '../../../model/forge/VersionManifestFG3.js'
import { MavenUtil } from '../../../util/MavenUtil.js'
import { createHash } from 'crypto'

export class ForgeGradle3Adapter extends ForgeResolver {

    private static readonly logger = LoggerUtil.getLogger('FG3 Adapter')

    public static isForVersion(version: MinecraftVersion, libraryVersion: string): boolean {
        if(version.getMinor() === 12 && VersionUtil.isOneDotTwelveFG2(libraryVersion)) {
            return false
        }
        return VersionUtil.isVersionAcceptable(version, [12, 13, 14, 15, 16, 17, 18, 19, 20])
    }

    private needsInstaller = false

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
        this.configure()
    }

    private configure(): void {

        // Configure for 13, 14, 15, 16, 17, 18, 19
        if(VersionUtil.isVersionAcceptable(this.minecraftVersion, [13, 14, 15, 16, 17, 18, 19, 20])) {
            this.needsInstaller = true
            return
        }

        // Configure for 12
        if(VersionUtil.isVersionAcceptable(this.minecraftVersion, [12])) {
            // NOTHING TO CONFIGURE
            return
        }
    }

    public async getModule(): Promise<Module> {
        return this.process()
    }

    public isForVersion(version: MinecraftVersion, libraryVersion: string): boolean {
        return ForgeGradle3Adapter.isForVersion(version, libraryVersion)
    }

    private async process(): Promise<Module> {
        const libRepo = this.repoStructure.getLibRepoStruct()

        // Get Installer
        const installerPath = libRepo.getLocalForge(this.artifactVersion, 'installer')
        ForgeGradle3Adapter.logger.debug(`Checking for forge installer at ${installerPath}..`)
        if (!await libRepo.artifactExists(installerPath)) {
            ForgeGradle3Adapter.logger.debug('Forge installer not found locally, initializing download..')
            await libRepo.downloadArtifactByComponents(
                this.REMOTE_REPOSITORY,
                LibRepoStructure.FORGE_GROUP,
                LibRepoStructure.FORGE_ARTIFACT,
                this.artifactVersion, 'installer', 'jar'
            )
        } else {
            ForgeGradle3Adapter.logger.debug('Using locally discovered forge installer.')
        }
        ForgeGradle3Adapter.logger.debug(`Beginning processing of Forge v${this.forgeVersion} (Minecraft ${this.minecraftVersion})`)

        if(this.needsInstaller) {
            // Run installer
            return this.processIncludeInstaller(installerPath)
        } else {
            // Installer not required
            return this.processWithoutInstaller(installerPath)
        }

    }

    private async processIncludeInstaller(installerPath: string): Promise<Module> {
        const libRepo = this.repoStructure.getLibRepoStruct()
        const forgeInstallerBuffer = await readFile(installerPath)
        const forgeModule: Module = {
            id: MavenUtil.mavenComponentsToIdentifier(
                LibRepoStructure.FORGE_GROUP,
                LibRepoStructure.FORGE_ARTIFACT,
                this.artifactVersion, 'installer'
            ),
            name: 'Minecraft Forge (installer)',
            type: Type.Forge,
            artifact: this.generateArtifact(
                forgeInstallerBuffer,
                await lstat(installerPath),
                libRepo.getArtifactUrlByComponents(
                    this.baseUrl,
                    LibRepoStructure.FORGE_GROUP,
                    LibRepoStructure.FORGE_ARTIFACT,
                    this.artifactVersion, 'installer'
                )
            ),
            subModules: []
        }

        return forgeModule
    }

    private async processWithoutInstaller(installerPath: string): Promise<Module> {

        // Extract version.json from installer.

        let versionManifestBuf: Buffer
        try {
            versionManifestBuf = await this.getVersionManifestFromJar(installerPath)
        } catch(err) {
            throw new Error('Failed to find version.json in forge installer jar.')
        }
        
        const versionManifest = JSON.parse(versionManifestBuf.toString()) as VersionManifestFG3

        // Save Version Manifest
        const versionManifestDest = this.repoStructure.getVersionRepoStruct().getVersionManifest(
            this.minecraftVersion,
            this.forgeVersion
        )
        await mkdirs(dirname(versionManifestDest))
        await writeJson(versionManifestDest, versionManifest, { spaces: 4 })

        const libRepo = this.repoStructure.getLibRepoStruct()
        const universalLocalPath = libRepo.getLocalForge(this.artifactVersion, 'universal')
        ForgeGradle3Adapter.logger.debug(`Checking for Forge Universal jar at ${universalLocalPath}..`)

        const forgeMdl = versionManifest.libraries.find(val => val.name.startsWith('net.minecraftforge:forge:'))

        if(forgeMdl == null) {
            throw new Error('Forge entry not found in version.json!')
        }

        let forgeUniversalBuffer

        // Check for local universal jar.
        if (await libRepo.artifactExists(universalLocalPath)) {
            const localUniBuf = await readFile(universalLocalPath)
            const sha1 = createHash('sha1').update(localUniBuf).digest('hex')
            if(sha1 !== forgeMdl.downloads.artifact.sha1) {
                ForgeGradle3Adapter.logger.debug('SHA-1 of local universal jar does not match version.json entry.')
                ForgeGradle3Adapter.logger.debug('Redownloading Forge Universal jar..')
            } else {
                ForgeGradle3Adapter.logger.debug('Using locally discovered forge.')
                forgeUniversalBuffer = localUniBuf
            }
        } else {
            ForgeGradle3Adapter.logger.debug('Forge Universal jar not found locally, initializing download..')
        }

        // Download if local is missing or corrupt
        if(!forgeUniversalBuffer) {
            await libRepo.downloadArtifactByComponents(
                this.REMOTE_REPOSITORY,
                LibRepoStructure.FORGE_GROUP,
                LibRepoStructure.FORGE_ARTIFACT,
                this.artifactVersion, 'universal', 'jar')
            forgeUniversalBuffer = await readFile(universalLocalPath)
        }

        ForgeGradle3Adapter.logger.debug(`Beginning processing of Forge v${this.forgeVersion} (Minecraft ${this.minecraftVersion})`)

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
                await lstat(universalLocalPath),
                libRepo.getArtifactUrlByComponents(
                    this.baseUrl,
                    LibRepoStructure.FORGE_GROUP,
                    LibRepoStructure.FORGE_ARTIFACT,
                    this.artifactVersion, 'universal'
                )
            ),
            subModules: []
        }
        
        // Attach Version Manifest module.
        forgeModule.subModules?.push({
            id: this.artifactVersion,
            name: 'Minecraft Forge (version.json)',
            type: Type.VersionManifest,
            artifact: this.generateArtifact(
                await readFile(versionManifestDest),
                await lstat(versionManifestDest),
                this.repoStructure.getVersionRepoStruct().getVersionManifestURL(
                    this.baseUrl, this.minecraftVersion, this.forgeVersion)
            )
        })

        for(const lib of versionManifest.libraries) {
            if (lib.name.startsWith('net.minecraftforge:forge:')) {
                // We've already processed forge.
                continue
            }
            ForgeGradle3Adapter.logger.debug(`Processing ${lib.name}..`)

            const extension = 'jar'
            const localPath = libRepo.getArtifactById(lib.name, extension)

            let queueDownload = !await libRepo.artifactExists(localPath)
            let libBuf

            if (!queueDownload) {
                libBuf = await readFile(localPath)
                const sha1 = createHash('sha1').update(libBuf).digest('hex')
                if (sha1 !== lib.downloads.artifact.sha1) {
                    ForgeGradle3Adapter.logger.debug('Hashes do not match, redownloading..')
                    queueDownload = true
                }
            } else {
                ForgeGradle3Adapter.logger.debug('Not found locally, downloading..')
                queueDownload = true
            }

            if (queueDownload) {
                await libRepo.downloadArtifactDirect(lib.downloads.artifact.url, lib.downloads.artifact.path)
                libBuf = await readFile(localPath)
            } else {
                ForgeGradle3Adapter.logger.debug('Using local copy.')
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
                    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
                    libBuf!,
                    stats,
                    libRepo.getArtifactUrlByComponents(
                        this.baseUrl,
                        mavenComponents.group, mavenComponents.artifact,
                        mavenComponents.version, mavenComponents.classifier, extension
                    )
                )
            })

        }

        return forgeModule

    }

}