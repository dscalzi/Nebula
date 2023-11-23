import { mkdirs, pathExists, readJson } from 'fs-extra/esm'
import { lstat, readFile, writeFile } from 'fs/promises'
import { Module, Type } from 'helios-distribution-types'
import { dirname, resolve } from 'path'
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

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public static isForVersion(_version: MinecraftVersion, _libraryVersion: string): boolean {
        // TODO Loader version check, I think only 0.12.0+ could be supported?
        return true
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

        const localProfileJson = resolve(this.repoStructure.getFabricCacheDirectory(this.loaderVersion, this.minecraftVersion), 'profile.json')
        FabricResolver.log.debug(`Checking for fabric profile json at ${localProfileJson}..`)
        let profileJson: FabricProfileJson
        if(!await pathExists(localProfileJson)) {
            FabricResolver.log.debug('Fabric profile not found locally, initializing download..')
            await mkdirs(dirname(localProfileJson))
            profileJson = await VersionUtil.getFabricProfileJson(this.minecraftVersion.toString(), this.loaderVersion)
            await writeFile(localProfileJson, JSON.stringify(profileJson))
        } else {
            profileJson = await readJson(localProfileJson)
        }

        const libRepo = this.repoStructure.getLibRepoStruct()

        const modules: Module[] = []
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
                    libBuf as Buffer,
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
        modules.splice(index)

        fabricModule.subModules = modules

        return fabricModule

    }

}