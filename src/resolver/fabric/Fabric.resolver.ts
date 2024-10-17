import { mkdirs, pathExists } from 'fs-extra/esm'
import { lstat, readFile, writeFile } from 'fs/promises'
import { Module, Type } from 'helios-distribution-types'
import { dirname } from 'path'
import { FabricProfileJson } from '../../model/fabric/FabricMeta.js'
import { RepoStructure } from '../../structure/repo/Repo.struct.js'
import { LoggerUtil } from '../../util/LoggerUtil.js'
import { MavenUtil } from '../../util/MavenUtil.js'
import { MinecraftVersion } from '../../util/MinecraftVersion.js'
import { VersionUtil } from '../../util/VersionUtil.js'
import { BaseResolver } from '../BaseResolver.js'

export class FabricResolver extends BaseResolver {
    
    private static readonly log = LoggerUtil.getLogger('FabricResolver')

    protected repoStructure: RepoStructure

    public static isForVersion(_version: MinecraftVersion, _libraryVersion: string): boolean {
        // --fabric.addMods support was added in https://github.com/FabricMC/fabric-loader/commit/ce8405c22166ef850ae73c09ab513c17d121df5a
        return VersionUtil.versionGte(_libraryVersion, '0.12.3')
    }

    constructor(
        absoluteRoot: string,
        relativeRoot: string,
        baseUrl: string,
        protected loaderVersion: string,
        protected minecraftVersion: MinecraftVersion
    ) {
        super(absoluteRoot, relativeRoot, baseUrl)
        this.repoStructure = new RepoStructure(absoluteRoot, relativeRoot, 'fabric')
    }

    public async getModule(): Promise<Module> {
        return this.getFabricModule()
    }

    public isForVersion(version: MinecraftVersion, libraryVersion: string): boolean {
        return FabricResolver.isForVersion(version, libraryVersion)
    }

    public async getFabricModule(): Promise<Module> {

        const versionRepo = this.repoStructure.getVersionRepoStruct()
        const versionManifest = versionRepo.getVersionManifest(this.minecraftVersion, this.loaderVersion)

        FabricResolver.log.debug(`Checking for fabric profile json at ${versionManifest}..`)
        if(!await pathExists(versionManifest)) {
            FabricResolver.log.debug('Fabric profile not found locally, initializing download..')
            await mkdirs(dirname(versionManifest))
            const manifest = await VersionUtil.getFabricProfileJson(this.minecraftVersion.toString(), this.loaderVersion)
            await writeFile(versionManifest, JSON.stringify(manifest))
        }
        const profileJsonBuf = await readFile(versionManifest)
        const profileJson = JSON.parse(profileJsonBuf.toString()) as FabricProfileJson

        const libRepo = this.repoStructure.getLibRepoStruct()

        const modules: Module[] = [{
            id: versionRepo.getFileName(this.minecraftVersion, this.loaderVersion),
            name: 'Fabric (version.json)',
            type: Type.VersionManifest,
            artifact: this.generateArtifact(
                profileJsonBuf,
                await lstat(versionManifest),
                versionRepo.getVersionManifestURL(this.baseUrl, this.minecraftVersion, this.loaderVersion)
            )
        }]
        for (const lib of profileJson.libraries) {
            FabricResolver.log.debug(`Processing ${lib.name}..`)

            const localPath = libRepo.getArtifactById(lib.name)

            if (!await libRepo.artifactExists(localPath)) {
                FabricResolver.log.debug('Not found locally, downloading..')
                await libRepo.downloadArtifactById(lib.url, lib.name)
            } else {
                FabricResolver.log.debug('Using local copy.')
            }

            const libBuf = await readFile(localPath)
            const stats = await lstat(localPath)

            const mavenComponents = MavenUtil.getMavenComponents(lib.name)

            modules.push({
                id: lib.name,
                name: `Fabric (${mavenComponents.artifact})`,
                type: Type.Library,
                artifact: this.generateArtifact(
                    libBuf,
                    stats,
                    libRepo.getArtifactUrlByComponents(
                        this.baseUrl,
                        mavenComponents.group, mavenComponents.artifact,
                        mavenComponents.version, mavenComponents.classifier
                    )
                )
            })
        }

        // TODO Rework this
        let index = -1
        for(let i=0; i<modules.length; i++) {
            if(modules[i].id.startsWith('net.fabricmc:fabric-loader')) {
                index = i
                break
            }
        }

        const fabricModule = modules[index]
        fabricModule.type = Type.Fabric
        modules.splice(index)

        fabricModule.subModules = modules

        return fabricModule

    }

}