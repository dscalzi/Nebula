import { ForgeResolver } from '../Forge.resolver.js'
import { MinecraftVersion } from '../../../util/MinecraftVersion.js'
import { LoggerUtil } from '../../../util/LoggerUtil.js'
import { VersionUtil } from '../../../util/VersionUtil.js'
import { Module, Type } from 'helios-distribution-types'
import { LibRepoStructure } from '../../../structure/repo/LibRepo.struct.js'
import { pathExists, remove, mkdirs, copy, writeJson, move } from 'fs-extra/esm'
import { lstat, readFile } from 'fs/promises'
import { join, dirname } from 'path'
import { VersionManifestFG3 } from '../../../model/forge/VersionManifestFG3.js'
import { MavenUtil } from '../../../util/MavenUtil.js'
import { createHash } from 'crypto'
import AdmZip from 'adm-zip'
import { InstallerManifestFG3 } from '../../../model/forge/InstallerManifestFG3.js'
import { exists } from 'fs-extra'

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
        if (version.getMinor() === 12 && VersionUtil.isOneDotTwelveFG2(libraryVersion)) {
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

        if (ForgeGradle3Adapter.isExecutableJar(this.minecraftVersion)) {

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
        if (VersionUtil.isVersionAcceptable(this.minecraftVersion, [13, 14, 15, 16, 17, 18, 19, 20])) {

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

            if (VersionUtil.isVersionAcceptable(this.minecraftVersion, [13, 14, 15, 16])) {

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

            if (VersionUtil.isVersionAcceptable(this.minecraftVersion, [17, 18, 19, 20])) {

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

            if (VersionUtil.isVersionAcceptable(this.minecraftVersion, [13, 14, 15])) {

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
        if (VersionUtil.isVersionAcceptable(this.minecraftVersion, [12])) {
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
        const cacheDir = this.repoStructure.getForgeCacheDirectory(this.artifactVersion)

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

        if (this.generatedFiles != null && this.generatedFiles.length > 0) {
            let shouldExtractInstaller: boolean = false;

            // Check cache.
            if (await pathExists(cacheDir)) {
                if (this.invalidateCache) {
                    ForgeGradle3Adapter.logger.info(`Removing existing cache ${cacheDir}..`)
                    await remove(cacheDir)
                    shouldExtractInstaller = true;
                } else {
                    // Use cache.
                    ForgeGradle3Adapter.logger.info(`Using cached results at ${cacheDir}.`)
                }
            } else {
                await mkdirs(cacheDir)
                shouldExtractInstaller = true;
            }

            // Extract the required data from the installer
            if (shouldExtractInstaller) await this.extractInstaller(installerPath, cacheDir)
            // Read the install_profile file to figure out how to patch Forge
            const installerManifest = await readFile(join(cacheDir, 'install_profile.json'))
            const installerJson = JSON.parse(installerManifest.toString()) as InstallerManifestFG3
            // Then process the version.json file and resolve installer libraries later.
            const [versionJson, versionJsonModule] = await this.processVersionManifest(join(cacheDir, 'version.json'));


            ForgeGradle3Adapter.logger.debug('Processing Forge Module')
            const forgeModule = {
                type: Type.Forge,
                name: `Minecraft Forge (${this.forgeVersion})`,
                id: `net.minecraftforge:forge:${this.artifactVersion}:client`,
                subModules: [],
                artifact: {
                    size: 0,
                    url: '',
                },
                installerModules: []
            } satisfies Module as Module

            forgeModule.subModules?.unshift(versionJsonModule)

            // Some Forge versions includes a jar only embedded in the installer.
            const commonLib = join(cacheDir, 'maven', 'net', 'minecraftforge', 'forge', this.artifactVersion, `forge-${this.artifactVersion}.jar`);
            const commonLibExists = await exists(commonLib);

            if (commonLibExists) {
                const libBuf = await readFile(commonLib)
                const stats = await lstat(commonLib)
                const libName = `net.minecraftforge:forge:${this.artifactVersion}`
                const mavenComponents = MavenUtil.getMavenComponents(libName)
                forgeModule.subModules?.push({
                    id: libName,
                    type: Type.Library,
                    artifact: this.generateArtifact(
                        libBuf,
                        stats,
                        libRepo.getArtifactUrlByComponents(
                            this.baseUrl,
                            mavenComponents.group, mavenComponents.artifact,
                            mavenComponents.version, mavenComponents.classifier, mavenComponents.extension
                        )
                    ),
                    name: libName
                })
                const destination = this.repoStructure.getLibRepoStruct().getArtifactByComponents(
                    mavenComponents.group,
                    mavenComponents.artifact,
                    mavenComponents.version,
                    mavenComponents.classifier,
                    mavenComponents.extension
                )

                await copy(commonLib, destination, { overwrite: true })
            }
            // Then download the dependencies used by the installer to patch the Minecraft JAR
            for (const lib of installerJson.libraries) {
                ForgeGradle3Adapter.logger.debug(`Processing ${lib.name}..`)

                const extension = 'jar'
                const localPath = libRepo.getArtifactById(lib.name, extension)

                let queueDownload = !await libRepo.artifactExists(localPath)
                let libBuf!: Buffer

                if (!queueDownload) {
                    libBuf = await readFile(localPath)
                    const sha1 = createHash('sha1').update(libBuf).digest('hex')
                    if (sha1 !== lib.downloads.artifact.sha1) {
                        ForgeGradle3Adapter.logger.debug('Hashes do not match, redownloading..')
                        queueDownload = true
                    }
                } else {
                    ForgeGradle3Adapter.logger.debug('Not found locally, downloading..')
                }

                if (queueDownload) {
                    // It looks like older Forge versions aren't supplying a maven URL for the universal jar.
                    // This should fix the issue by deriving the artifact URL from its Maven coordinates.
                    this.ensureUniversalForgeUrl(lib)
                    if (!lib.downloads.artifact.url) {
                        throw new Error(`Missing download URL for ${lib.name}`)
                    }
                    await libRepo.downloadArtifactDirect(lib.downloads.artifact.url, lib.downloads.artifact.path)
                    libBuf = await readFile(localPath)
                } else {
                    ForgeGradle3Adapter.logger.debug('Using local copy.')
                }

                const stats = await lstat(localPath)

                const mavenComponents = MavenUtil.getMavenComponents(lib.name)

                forgeModule.installerModules?.push({
                    id: lib.name,
                    type: Type.Library,
                    artifact: this.generateArtifact(
                        libBuf,
                        stats,
                        libRepo.getArtifactUrlByComponents(
                            this.baseUrl,
                            mavenComponents.group, mavenComponents.artifact,
                            mavenComponents.version, mavenComponents.classifier, mavenComponents.extension
                        )
                    ),
                    name: lib.name
                } satisfies Module);

            }

            // Processors are the steps used by the forge installer to actually patch the Minecraft JAR
            // A processor declaration might include either a client side, a server side or both. It might also declare no side.
            // Since Helios is a client launcher, we don't need the server side processors
            const relevantProcessors = installerJson.processors.filter((p) => !("sides" in p) || p.sides?.includes("client"));
            forgeModule.processors = relevantProcessors

            const patchLocation = join(this.absoluteRoot, 'repo', 'lib', MavenUtil.mavenComponentsAsPath("net.minecraftforge", "forge", this.artifactVersion, "client", "lzma"));

            // Inject the client.lzma patch
            if (shouldExtractInstaller) await move(join(this.repoStructure.getForgeCacheDirectory(this.artifactVersion), "data", "client.lzma"), patchLocation, { overwrite: true });
            forgeModule.clientPatch = {
                id: MavenUtil.mavenComponentsToIdentifier("net.minecraftforge", "forge", this.artifactVersion, "client", "lzma"),
                type: Type.ForgeHosted,
                name: "Minecraft Forge (client patch)",
                artifact: this.generateArtifact(await readFile(patchLocation), await lstat(patchLocation), libRepo.getArtifactUrlByComponents(this.baseUrl, "net.minecraftforge", "forge", this.artifactVersion, "client", "lzma"))
            }

            for (const lib of versionJson.libraries.filter(lib => lib.downloads.artifact.url !== "")) { // Some forge versions embed their metadata into their version.json file for Client
                ForgeGradle3Adapter.logger.debug(`Processing ${lib.name}..`)

                const localPath = libRepo.getArtifactById(lib.name)

                if (!await libRepo.artifactExists(localPath)) {
                    ForgeGradle3Adapter.logger.debug('Not found locally, downloading..')
                    await libRepo.downloadArtifactDirect(lib.downloads.artifact.url, lib.downloads.artifact.path)
                } else {
                    ForgeGradle3Adapter.logger.debug('Using local copy.')
                }

                const libBuf = await readFile(localPath)
                const stats = await lstat(localPath)

                const mavenComponents = MavenUtil.getMavenComponents(lib.name)

                forgeModule.subModules?.push({
                    id: lib.name,
                    type: Type.Library,
                    artifact: this.generateArtifact(
                        libBuf,
                        stats,
                        libRepo.getArtifactUrlByComponents(
                            this.baseUrl,
                            mavenComponents.group, mavenComponents.artifact,
                            mavenComponents.version, mavenComponents.classifier
                        )
                    ),
                    name: lib.name
                } satisfies Module);

            }

            // Finally, inject the installer-required values
            const variablesStore: Record<string, string> = {};
            for (const [key, value] of Object.entries(installerJson.data)) {
                variablesStore[key] = value.client
            }
            forgeModule.installerVariables = variablesStore

            return forgeModule
        } else {
            // Installer not required
            return this.processWithoutInstaller(installerPath)
        }

    }

    private async extractInstaller(installerPath: string, installerOutputDir: string): Promise<void> {
        const installerFiles = new AdmZip(installerPath)
        const filesToExtract: (string)[] = [
            'data/client.lzma',
            'version.json',
            'install_profile.json',
            `maven/net/minecraftforge/forge/${this.artifactVersion}/forge-${this.artifactVersion}.jar`,
            `maven/net/minecraftforge/forge/${this.artifactVersion}/forge-${this.artifactVersion}-universal.jar`
        ]
        const matchedFiles = installerFiles.getEntries().filter(f => filesToExtract.includes(f.entryName))
        for (const file of matchedFiles) {
            installerFiles.extractEntryTo(file.entryName, installerOutputDir, true, true)
            ForgeGradle3Adapter.logger.debug(`Extracted installer file to ${installerOutputDir}, ${join(installerOutputDir, file.entryName)}`)
        }
    }

    private ensureUniversalForgeUrl(lib: { name: string, downloads: { artifact: { url: string } } }): void {
        // Fix missing URL for Forge universal jar artifacts by constructing the URL from the Maven identifier.
        const libComponents = MavenUtil.getMavenComponents(lib.name)
        if (libComponents.group === LibRepoStructure.FORGE_GROUP && libComponents.artifact === LibRepoStructure.FORGE_ARTIFACT && libComponents.classifier === 'universal' && !lib.downloads.artifact.url) {
            ForgeGradle3Adapter.logger.debug('Forge universal jar with missing URL detected, constructing URL from maven coordinates..')
            lib.downloads.artifact.url = this.REMOTE_REPOSITORY + MavenUtil.mavenIdentifierAsPath(lib.name)
        }
    }

    private async processVersionManifest(versionManifestPath: string): Promise<[VersionManifestFG3, Module]> {
        const versionRepo = this.repoStructure.getVersionRepoStruct()

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

        await copy(versionManifestPath, destination, { overwrite: true })

        return [versionManifest, versionManifestModule]
    }

    private async processWithoutInstaller(installerPath: string): Promise<Module> {

        // Extract version.json from installer.

        let versionManifestBuf: Buffer
        try {
            versionManifestBuf = await this.getVersionManifestFromJar(installerPath)
        } catch (err) {
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

        if (forgeMdl == null) {
            throw new Error('Forge entry not found in version.json!')
        }

        let forgeUniversalBuffer

        // Check for local universal jar.
        if (await libRepo.artifactExists(universalLocalPath)) {
            const localUniBuf = await readFile(universalLocalPath)
            const sha1 = createHash('sha1').update(localUniBuf).digest('hex')
            if (sha1 !== forgeMdl.downloads.artifact.sha1) {
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
        if (!forgeUniversalBuffer) {
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

        for (const lib of versionManifest.libraries) {
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