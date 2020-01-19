import { spawn } from 'child_process'
import { copy, lstat, mkdirs, move, pathExists, readFile, remove, writeFile } from 'fs-extra'
import { basename, dirname, join } from 'path'
import { VersionManifest113 } from '../../../model/forge/versionmanifest113'
import { Module } from '../../../model/spec/module'
import { Type } from '../../../model/spec/type'
import { LibRepoStructure } from '../../../model/struct/repo/librepo.struct'
import { JavaUtil } from '../../../util/javautil'
import { MavenUtil } from '../../../util/maven'
import { VersionUtil } from '../../../util/versionutil'
import { ForgeResolver } from '../forge.resolver'

export class Forge113Adapter extends ForgeResolver {

    public static isForVersion(version: string) {
        return VersionUtil.isVersionAcceptable(version, [13, 14, 15])
    }

    constructor(
        absoluteRoot: string,
        relativeRoot: string,
        baseUrl: string,
        minecraftVersion: string,
        forgeVersion: string
    ) {
        super(absoluteRoot, relativeRoot, baseUrl, minecraftVersion, forgeVersion)
    }

    public async getModule(): Promise<Module> {
        return this.process()
    }

    public isForVersion(version: string): boolean {
        return Forge113Adapter.isForVersion(version)
    }

    private async process() {
        const libRepo = this.repoStructure.getLibRepoStruct()
        const installerPath = libRepo.getLocalForge(this.artifactVersion, 'installer')
        console.debug(`Checking for forge installer at ${installerPath}..`)
        if (!await libRepo.artifactExists(installerPath)) {
            console.debug(`Forge installer not found locally, initializing download..`)
            await libRepo.downloadArtifactByComponents(
                this.REMOTE_REPOSITORY,
                LibRepoStructure.FORGE_GROUP,
                LibRepoStructure.FORGE_ARTIFACT,
                this.artifactVersion, 'installer', 'jar'
            )
        } else {
            console.debug('Using locally discovered forge installer.')
        }
        console.debug(`Beginning processing of Forge v${this.forgeVersion} (Minecraft ${this.minecraftVersion})`)

        const workDir = this.repoStructure.getWorkDirectory()
        if (await pathExists(workDir)) {
            await remove(workDir)
        }

        await mkdirs(workDir)

        const workingInstaller = join(workDir, basename(installerPath))

        await copy(installerPath, workingInstaller)

        // Required for the installer to function.
        await writeFile(join(workDir, 'launcher_profiles.json'), JSON.stringify({}))

        console.debug(`Spawning forge installer`)

        console.log('============== [ IMPORTANT ] ==============')
        console.log('When the installer opens please set the client installation directory to:')
        console.log(workDir)
        console.log('===========================================')

        await this.executeInstaller(workingInstaller)

        console.debug('Installer finished, beginning processing..')

        console.debug('Processing Version Manifest')
        const versionManifestTuple = await this.processVersionManifest()
        const versionManifest = versionManifestTuple[0] as VersionManifest113

        console.debug('Processing generated forge files.')
        const forgeModule = await this.processForgeModule(versionManifest)

        // Attach version.json module.
        forgeModule.subModules?.unshift(versionManifestTuple[1] as Module)

        console.debug('Processing Libraries')
        const libs = await this.processLibraries(versionManifest)

        forgeModule.subModules = forgeModule.subModules?.concat(libs)

        await remove(workDir)

        return forgeModule
    }

    private async processLibraries(manifest: VersionManifest113) {

        const libDir = join(this.repoStructure.getWorkDirectory(), 'libraries')
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

                await move(targetLocalPath, destination, {overwrite: true})

            }
        }

        return mdls

    }

    private async processForgeModule(versionManifest: VersionManifest113) {

        const libDir = join(this.repoStructure.getWorkDirectory(), 'libraries')
        const mcpVersion = this.getMCPVersion(versionManifest.arguments.game)

        const generatedFiles = [
            {
                name: 'base jar',
                group: LibRepoStructure.FORGE_GROUP,
                artifact: LibRepoStructure.FORGE_ARTIFACT,
                version: this.artifactVersion,
                classifier: undefined
            },
            {
                name: 'universal jar',
                group: LibRepoStructure.FORGE_GROUP,
                artifact: LibRepoStructure.FORGE_ARTIFACT,
                version: this.artifactVersion,
                classifier: 'universal'
            },
            {
                name: 'client jar',
                group: LibRepoStructure.FORGE_GROUP,
                artifact: LibRepoStructure.FORGE_ARTIFACT,
                version: this.artifactVersion,
                classifier: 'client'
            },
            {
                name: 'client slim',
                group: LibRepoStructure.MINECRAFT_GROUP,
                artifact: LibRepoStructure.MINECRAFT_CLIENT_ARTIFACT,
                version: this.minecraftVersion,
                classifier: 'slim'
            },
            {
                name: 'client data',
                group: LibRepoStructure.MINECRAFT_GROUP,
                artifact: LibRepoStructure.MINECRAFT_CLIENT_ARTIFACT,
                version: this.minecraftVersion,
                classifier: 'data',
                skipIfNotPresent: true
            },
            {
                name: 'client extra',
                group: LibRepoStructure.MINECRAFT_GROUP,
                artifact: LibRepoStructure.MINECRAFT_CLIENT_ARTIFACT,
                version: this.minecraftVersion,
                classifier: 'extra'
            },
            {
                name: 'client srg',
                group: LibRepoStructure.MINECRAFT_GROUP,
                artifact: LibRepoStructure.MINECRAFT_CLIENT_ARTIFACT,
                version: `${this.minecraftVersion}-${mcpVersion}`,
                classifier: 'srg'
            }
        ]

        const mdls: Module[] = []

        for (const entry of generatedFiles) {

            const targetLocalPath = join(
                libDir,
                MavenUtil.mavenComponentsToPath(entry.group, entry.artifact, entry.version, entry.classifier)
            )

            const exists = await pathExists(targetLocalPath)
            if (exists) {

                mdls.push({
                    id: MavenUtil.mavenComponentsToIdentifier(
                        entry.group,
                        entry.artifact,
                        entry.version,
                        entry.classifier
                    ),
                    name: `Minecraft Forge (${entry.name})`,
                    type: Type.Library,
                    artifact: this.generateArtifact(
                        await readFile(targetLocalPath),
                        await lstat(targetLocalPath),
                        this.repoStructure.getLibRepoStruct().getArtifactUrlByComponents(
                            this.baseUrl,
                            entry.group,
                            entry.artifact,
                            entry.version,
                            entry.classifier
                        )
                    ),
                    subModules: []
                })

                const destination = this.repoStructure.getLibRepoStruct().getArtifactByComponents(
                    entry.group,
                    entry.artifact,
                    entry.version,
                    entry.classifier
                )

                await move(targetLocalPath, destination, {overwrite: true})

            } else {
                if (!entry.skipIfNotPresent) {
                    throw new Error(`Required file ${entry.name} not found at expected location ${targetLocalPath}!`)
                }
            }

        }

        const forgeModule = mdls.shift() as Module
        forgeModule.type = Type.ForgeHosted
        forgeModule.subModules = mdls

        return forgeModule
    }

    private async processVersionManifest() {
        const workDir = this.repoStructure.getWorkDirectory()
        const versionRepo = this.repoStructure.getVersionRepoStruct()
        const versionName = versionRepo.getFileName(this.minecraftVersion, this.forgeVersion)
        const versionManifestPath = join(workDir, 'versions', versionName, `${versionName}.json`)

        const versionManifestBuf = await readFile(versionManifestPath)
        const versionManifest = JSON.parse(versionManifestBuf.toString()) as VersionManifest113

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

        const destination = this.repoStructure.getVersionRepoStruct().getVersionManifest(
            this.minecraftVersion,
            this.forgeVersion
        )

        await move(versionManifestPath, destination, {overwrite: true})

        return [versionManifest, versionManifestModule]
    }

    private executeInstaller(installerExec: string) {
        return new Promise((resolve, reject) => {
            const child = spawn(JavaUtil.getJavaExecutable(), [
                '-jar',
                installerExec
            ], {
                cwd: dirname(installerExec)
            })
            child.stdout.on('data', (data) => console.log('[Forge Installer]', data.toString('utf8').trim()))
            child.stderr.on('data', (data) => console.error('[Forge Installer]', data.toString('utf8').trim()))
            child.on('close', (code, signal) => {
                console.log('[Forge Installer]', 'Exited with code', code)
                resolve()
            })
        })
    }

    private getMCPVersion(args: string[]) {
        for (let i = 0; i < args.length; i++) {
            if (args[i] === '--fml.mcpVersion') {
                return args[i + 1]
            }
        }
        return null
    }

}
