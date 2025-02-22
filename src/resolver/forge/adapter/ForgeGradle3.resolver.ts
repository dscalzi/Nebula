import { ForgeResolver } from '../Forge.resolver.js'
import { MinecraftVersion } from '../../../util/MinecraftVersion.js'
import { LoggerUtil } from '../../../util/LoggerUtil.js'
import { VersionUtil } from '../../../util/VersionUtil.js'
import { Module, Type } from 'helios-distribution-types'
import { LibRepoStructure } from '../../../structure/repo/LibRepo.struct.js'
import { pathExists, remove, mkdirs, copy, writeJson } from 'fs-extra/esm'
import { lstat, readFile, writeFile } from 'fs/promises'
import { join, basename, dirname } from 'path'
import { spawn } from 'child_process'
import { JavaUtil } from '../../../util/java/JavaUtil.js'
import { VersionManifestFG3 } from '../../../model/forge/VersionManifestFG3.js'
import { MavenUtil } from '../../../util/MavenUtil.js'
import { createHash } from 'crypto'

interface GeneratedFile {
    name: string
    group: string
    artifact: string
    version: string
    classifiers: string[] | [undefined]
    skipIfNotPresent?: boolean
    classpath?: boolean
}

export class ForgeGradle3Adapter extends ForgeResolver {

    private static readonly logger = LoggerUtil.getLogger('FG3 Adapter')

    private static readonly WILDCARD_MCP_VERSION = '${mcpVersion}'

    public static isForVersion(version: MinecraftVersion, libraryVersion: string): boolean {
        if(version.getMinor() === 12 && VersionUtil.isOneDotTwelveFG2(libraryVersion)) {
            return false
        }
        return VersionUtil.isVersionAcceptable(version, [12, 13, 14, 15, 16, 17, 18, 19, 20, 21])
    }

    public static isExecutableJar(version: MinecraftVersion): boolean {
        return version.isGreaterThanOrEqualTo(new MinecraftVersion('1.20.3'))
    }

    private generatedFiles: GeneratedFile[] | undefined
    private wildcardsInUse: string[] | undefined

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

        if(ForgeGradle3Adapter.isExecutableJar(this.minecraftVersion)) {
            
            // Separate block for 1.20.4+

            this.generatedFiles = [
                {
                    name: 'universal jar',
                    group: LibRepoStructure.FORGE_GROUP,
                    artifact: LibRepoStructure.FORGE_ARTIFACT,
                    version: this.artifactVersion,
                    classifiers: ['universal'],
                },
                {
                    name: 'client jar',
                    group: LibRepoStructure.FORGE_GROUP,
                    artifact: LibRepoStructure.FORGE_ARTIFACT,
                    version: this.artifactVersion,
                    classifiers: ['client']
                },
                {
                    name: 'client shim',
                    group: LibRepoStructure.FORGE_GROUP,
                    artifact: LibRepoStructure.FORGE_ARTIFACT,
                    version: this.artifactVersion,
                    classifiers: ['shim'],
                    classpath: false
                },
                {
                    name: 'fmlcore',
                    group: LibRepoStructure.FORGE_GROUP,
                    artifact: LibRepoStructure.FMLCORE_ARTIFACT,
                    version: this.artifactVersion,
                    classifiers: [undefined]
                },
                {
                    name: 'javafmllanguage',
                    group: LibRepoStructure.FORGE_GROUP,
                    artifact: LibRepoStructure.JAVAFMLLANGUAGE_ARTIFACT,
                    version: this.artifactVersion,
                    classifiers: [undefined]
                },
                {
                    name: 'mclanguage',
                    group: LibRepoStructure.FORGE_GROUP,
                    artifact: LibRepoStructure.MCLANGUAGE_ARTIFACT,
                    version: this.artifactVersion,
                    classifiers: [undefined]
                },
                {
                    name: 'lowcodelanguage',
                    group: LibRepoStructure.FORGE_GROUP,
                    artifact: LibRepoStructure.LOWCODELANGUAGE_ARTIFACT,
                    version: this.artifactVersion,
                    classifiers: [undefined]
                }
            ]

            return
        }

        // Configure for 13, 14, 15, 16, 17, 18, 19
        if(VersionUtil.isVersionAcceptable(this.minecraftVersion, [13, 14, 15, 16, 17, 18, 19, 20])) {

            // https://github.com/MinecraftForge/MinecraftForge/commit/97d4652f5fe15931b980117efabdff332f9f6428
            const mcpUnifiedVersion = `${this.minecraftVersion}-${ForgeGradle3Adapter.WILDCARD_MCP_VERSION}`

            this.generatedFiles = [
                {
                    name: 'universal jar',
                    group: LibRepoStructure.FORGE_GROUP,
                    artifact: LibRepoStructure.FORGE_ARTIFACT,
                    version: this.artifactVersion,
                    classifiers: ['universal'],
                    classpath: false
                },
                {
                    name: 'client jar',
                    group: LibRepoStructure.FORGE_GROUP,
                    artifact: LibRepoStructure.FORGE_ARTIFACT,
                    version: this.artifactVersion,
                    classifiers: ['client'],
                    classpath: false
                },
                {
                    name: 'client data',
                    group: LibRepoStructure.MINECRAFT_GROUP,
                    artifact: LibRepoStructure.MINECRAFT_CLIENT_ARTIFACT,
                    version: this.minecraftVersion.toString(),
                    classifiers: ['data'],
                    skipIfNotPresent: true,
                    classpath: false
                },
                {
                    name: 'client srg',
                    group: LibRepoStructure.MINECRAFT_GROUP,
                    artifact: LibRepoStructure.MINECRAFT_CLIENT_ARTIFACT,
                    version: mcpUnifiedVersion,
                    classifiers: ['srg'],
                    classpath: false
                }
            ]
            this.wildcardsInUse = [
                ForgeGradle3Adapter.WILDCARD_MCP_VERSION
            ]

            if(VersionUtil.isVersionAcceptable(this.minecraftVersion, [13, 14, 15, 16])) {

                // Base jar present for 1.13-1.16

                this.generatedFiles.unshift(
                    {
                        name: 'base jar',
                        group: LibRepoStructure.FORGE_GROUP,
                        artifact: LibRepoStructure.FORGE_ARTIFACT,
                        version: this.artifactVersion,
                        classifiers: [undefined]
                    }
                )
            }

            if(VersionUtil.isVersionAcceptable(this.minecraftVersion, [17, 18, 19, 20])) {

                // Added in 1.17+

                this.generatedFiles.unshift(
                    {
                        name: 'fmlcore',
                        group: LibRepoStructure.FORGE_GROUP,
                        artifact: LibRepoStructure.FMLCORE_ARTIFACT,
                        version: this.artifactVersion,
                        classifiers: [undefined]
                    },
                    {
                        name: 'javafmllanguage',
                        group: LibRepoStructure.FORGE_GROUP,
                        artifact: LibRepoStructure.JAVAFMLLANGUAGE_ARTIFACT,
                        version: this.artifactVersion,
                        classifiers: [undefined]
                    },
                    {
                        name: 'mclanguage',
                        group: LibRepoStructure.FORGE_GROUP,
                        artifact: LibRepoStructure.MCLANGUAGE_ARTIFACT,
                        version: this.artifactVersion,
                        classifiers: [undefined]
                    }
                )
            }

            if (VersionUtil.isVersionAcceptable(this.minecraftVersion, [18, 19, 20])) {

                // Added in 1.18+

                this.generatedFiles.unshift(
                    {
                        name: 'lowcodelanguage',
                        group: LibRepoStructure.FORGE_GROUP,
                        artifact: LibRepoStructure.LOWCODELANGUAGE_ARTIFACT,
                        version: this.artifactVersion,
                        classifiers: [undefined]
                    }
                )
            }

            if(VersionUtil.isVersionAcceptable(this.minecraftVersion, [13, 14, 15])) {

                // 13, 14, 15 use just the MC version.

                this.generatedFiles.push(
                    {
                        name: 'client slim',
                        group: LibRepoStructure.MINECRAFT_GROUP,
                        artifact: LibRepoStructure.MINECRAFT_CLIENT_ARTIFACT,
                        version: this.minecraftVersion.toString(),
                        classifiers: [
                            'slim',
                            'slim-stable'
                        ]
                    },
                    {
                        name: 'client extra',
                        group: LibRepoStructure.MINECRAFT_GROUP,
                        artifact: LibRepoStructure.MINECRAFT_CLIENT_ARTIFACT,
                        version: this.minecraftVersion.toString(),
                        classifiers: [
                            'extra',
                            'extra-stable'
                        ]
                    }
                )
            } else {

                // 16+ uses the mcp unified version.

                this.generatedFiles.push(
                    {
                        name: 'client slim',
                        group: LibRepoStructure.MINECRAFT_GROUP,
                        artifact: LibRepoStructure.MINECRAFT_CLIENT_ARTIFACT,
                        version: mcpUnifiedVersion,
                        classifiers: [
                            'slim',
                            'slim-stable'
                        ],
                        classpath: false
                    },
                    {
                        name: 'client extra',
                        group: LibRepoStructure.MINECRAFT_GROUP,
                        artifact: LibRepoStructure.MINECRAFT_CLIENT_ARTIFACT,
                        version: mcpUnifiedVersion,
                        classifiers: [
                            'extra',
                            'extra-stable'
                        ],
                        classpath: false
                    }
                )

            }


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

        if(this.generatedFiles != null && this.generatedFiles.length > 0) {
            // Run installer
            return this.processWithInstaller(installerPath)
        } else {
            // Installer not required
            return this.processWithoutInstaller(installerPath)
        }

    }

    private async processWithInstaller(installerPath: string): Promise<Module> {

        let doInstall = true
        // Check cache.
        const cacheDir = this.repoStructure.getForgeCacheDirectory(this.artifactVersion)
        if (await pathExists(cacheDir)) {
            if(this.invalidateCache) {
                ForgeGradle3Adapter.logger.info(`Removing existing cache ${cacheDir}..`)
                await remove(cacheDir)
            } else {
                // Use cache.
                doInstall = false
                ForgeGradle3Adapter.logger.info(`Using cached results at ${cacheDir}.`)
            }
        } else {
            await mkdirs(cacheDir)
        }
        const installerOutputDir = cacheDir

        if(doInstall) {
            const workingInstaller = join(installerOutputDir, basename(installerPath))

            await copy(installerPath, workingInstaller)
    
            // Required for the installer to function.
            await writeFile(join(installerOutputDir, 'launcher_profiles.json'), JSON.stringify({}))
    
            ForgeGradle3Adapter.logger.debug('Spawning forge installer')
    
            ForgeGradle3Adapter.logger.info('============== [ IMPORTANT ] ==============')
            ForgeGradle3Adapter.logger.info('When the installer opens please set the client installation directory to:')
            ForgeGradle3Adapter.logger.info(installerOutputDir)
            ForgeGradle3Adapter.logger.info('===========================================')
    
            await this.executeInstaller(workingInstaller)
    
            ForgeGradle3Adapter.logger.debug('Installer finished, beginning processing..')
        }

        await this.verifyInstallerRan(installerOutputDir)

        ForgeGradle3Adapter.logger.debug('Processing Version Manifest')
        const versionManifestTuple = await this.processVersionManifest(installerOutputDir)
        const versionManifest = versionManifestTuple[0]

        ForgeGradle3Adapter.logger.debug('Processing generated forge files.')
        const forgeModule = await this.processForgeModule(versionManifest, installerOutputDir)

        // Attach version.json module.
        forgeModule.subModules?.unshift(versionManifestTuple[1])

        ForgeGradle3Adapter.logger.debug('Processing Libraries')
        const libs = await this.processLibraries(versionManifest, installerOutputDir)

        forgeModule.subModules = forgeModule.subModules?.concat(libs)

        if(this.discardOutput) {
            ForgeGradle3Adapter.logger.info(`Removing installer output at ${installerOutputDir}..`)
            await remove(installerOutputDir)
            ForgeGradle3Adapter.logger.info('Removed successfully.')
        }

        return forgeModule

    }

    private getVersionManifestPath(installerOutputDir: string): string {
        const versionRepo = this.repoStructure.getVersionRepoStruct()
        const versionName = versionRepo.getFileName(this.minecraftVersion, this.forgeVersion)
        return join(installerOutputDir, 'versions', versionName, `${versionName}.json`)
    }

    private async verifyInstallerRan(installerOutputDir: string): Promise<void> {
        const versionManifestPath = this.getVersionManifestPath(installerOutputDir)

        if(!await pathExists(versionManifestPath)) {
            await remove(installerOutputDir)
            throw new Error(`Forge was either not installed or installed to the wrong location. When the forge installer opens, you MUST set the installation directory to ${installerOutputDir}`)
        }
    }

    private async processVersionManifest(installerOutputDir: string): Promise<[VersionManifestFG3, Module]> {
        const versionRepo = this.repoStructure.getVersionRepoStruct()
        const versionManifestPath = this.getVersionManifestPath(installerOutputDir)

        const versionManifestBuf = await readFile(versionManifestPath)
        const versionManifest = JSON.parse(versionManifestBuf.toString()) as VersionManifestFG3

        const versionManifestModule: Module = {
            id: this.artifactVersion,
            name: 'Minecraft Forge (version.json)',
            type: Type.VersionManifest,
            artifact: this.generateArtifact(
                versionManifestBuf,
                await lstat(versionManifestPath),
                versionRepo.getVersionManifestURL(this.baseUrl, this.minecraftVersion, this.forgeVersion)
            )
        }

        const destination = versionRepo.getVersionManifest(
            this.minecraftVersion,
            this.forgeVersion
        )

        await copy(versionManifestPath, destination, {overwrite: true})

        return [versionManifest, versionManifestModule]
    }

    private async processForgeModule(versionManifest: VersionManifestFG3, installerOutputDir: string): Promise<Module> {

        const libDir = join(installerOutputDir, 'libraries')
        
        if(this.wildcardsInUse) {
            if(this.wildcardsInUse.includes(ForgeGradle3Adapter.WILDCARD_MCP_VERSION)) {

                const mcpVersion = this.getMCPVersion(versionManifest.arguments.game)
                if(mcpVersion == null) {
                    throw new Error('MCP Version not found.. did forge change their format?')
                }

                this.generatedFiles = this.generatedFiles!.map(f => {
                    if(f.version.includes(ForgeGradle3Adapter.WILDCARD_MCP_VERSION)) {
                        return {
                            ...f,
                            version: f.version.replace(ForgeGradle3Adapter.WILDCARD_MCP_VERSION, mcpVersion)
                        }
                    }
                    return f
                })

            }
        }

        const mdls: Module[] = []

        for (const entry of this.generatedFiles!) {

            const targetLocations: string[] = []
            let located = false

            classifierLoop:
            for (const _classifier of entry.classifiers) {

                const targetLocalPath = join(
                    libDir,
                    MavenUtil.mavenComponentsAsNormalizedPath(entry.group, entry.artifact, entry.version, _classifier)
                )

                targetLocations.push(targetLocalPath)

                const exists = await pathExists(targetLocalPath)
                if (exists) {

                    mdls.push({
                        id: MavenUtil.mavenComponentsToIdentifier(
                            entry.group,
                            entry.artifact,
                            entry.version,
                            _classifier
                        ),
                        name: `Minecraft Forge (${entry.name})`,
                        type: Type.Library,
                        classpath: entry.classpath ?? true,
                        artifact: this.generateArtifact(
                            await readFile(targetLocalPath),
                            await lstat(targetLocalPath),
                            this.repoStructure.getLibRepoStruct().getArtifactUrlByComponents(
                                this.baseUrl,
                                entry.group,
                                entry.artifact,
                                entry.version,
                                _classifier
                            )
                        ),
                        subModules: []
                    })

                    const destination = this.repoStructure.getLibRepoStruct().getArtifactByComponents(
                        entry.group,
                        entry.artifact,
                        entry.version,
                        _classifier
                    )

                    await copy(targetLocalPath, destination, {overwrite: true})

                    located = true
                    break classifierLoop

                }

            }

            if (!entry.skipIfNotPresent && !located) {
                throw new Error(`Required file ${entry.name} not found at any expected location:\n\t${targetLocations.join('\n\t')}`)
            }

        }

        const forgeModule = mdls.shift()!
        forgeModule.type = Type.ForgeHosted
        forgeModule.subModules = mdls

        return forgeModule
    }

    private async processLibraries(manifest: VersionManifestFG3, installerOutputDir: string): Promise<Module[]> {

        const libDir = join(installerOutputDir, 'libraries')
        const libRepo = this.repoStructure.getLibRepoStruct()

        const mdls: Module[] = []

        for (const entry of manifest.libraries) {
            const artifact = entry.downloads.artifact
            if (artifact.url) {

                const targetLocalPath = join(libDir, artifact.path)

                if (!await pathExists(targetLocalPath)) {
                    throw new Error(`Expected library ${entry.name} not found!`)
                }

                const components = MavenUtil.getMavenComponents(entry.name)

                mdls.push({
                    id: entry.name,
                    name: `Minecraft Forge (${components.artifact})`,
                    type: Type.Library,
                    artifact: this.generateArtifact(
                        await readFile(targetLocalPath),
                        await lstat(targetLocalPath),
                        libRepo.getArtifactUrlByComponents(
                            this.baseUrl,
                            components.group,
                            components.artifact,
                            components.version,
                            components.classifier,
                            components.extension
                        )
                    )
                })
                const destination = libRepo.getArtifactByComponents(
                    components.group,
                    components.artifact,
                    components.version,
                    components.classifier,
                    components.extension
                )

                await copy(targetLocalPath, destination, {overwrite: true})

            }
        }

        return mdls

    }

    private executeInstaller(installerExec: string): Promise<void> {
        return new Promise(resolve => {
            const fiLogger = LoggerUtil.getLogger('Forge Installer')
            const child = spawn(JavaUtil.getJavaExecutable(), [
                '-jar',
                installerExec
            ], {
                cwd: dirname(installerExec)
            })
            child.stdout.on('data', (data) => fiLogger.info(data.toString('utf8').trim()))
            child.stderr.on('data', (data) => fiLogger.error(data.toString('utf8').trim()))
            child.on('close', code => {
                if(code === 0) {
                    fiLogger.info('Exited with code', code)
                } else {
                    fiLogger.error('Exited with code', code)
                }
                
                resolve()
            })
        })
    }

    private getMCPVersion(args: string[]): string | null {
        for (let i = 0; i < args.length; i++) {
            if (args[i] === '--fml.mcpVersion') {
                return args[i + 1]
            }
        }
        return null
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