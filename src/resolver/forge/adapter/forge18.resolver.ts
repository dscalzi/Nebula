import { Module } from '../../../model/spec/module'
import { ForgeRepoStructure } from '../../../model/struct/repo/forgerepo.struct'
import { ForgeResolver } from '../forge.resolver'

export class Forge18Adapter extends ForgeResolver {

    public static isForVersion(version: string) {
        return Forge18Adapter.isVersionAcceptable(version, [8, 9, 10, 11, 12])
    }

    constructor(
        absoluteRoot: string,
        relativeRoot: string,
        minecraftVersion: string,
        forgeVersion: string
    ) {
        super(absoluteRoot, relativeRoot, minecraftVersion, forgeVersion)
    }

    public async getModule(): Promise<Module> {
        await this.getForgeByVersion()
        return null as unknown as Module
    }

    public isForVersion(version: string) {
        return Forge18Adapter.isForVersion(version)
    }

    public async getForgeByVersion() {
        const forgeRepo = this.repoStructure.getForgeRepoStruct()
        const artifactVersion = `${this.minecraftVersion}-${this.forgeVersion}`
        const targetLocalPath = forgeRepo.getLocalForge(artifactVersion, 'universal')
        console.debug(`Checking for forge version at ${targetLocalPath}..`)
        if (!await forgeRepo.artifactExists(targetLocalPath)) {
            console.debug(`Forge not found locally, initializing download..`)
            await forgeRepo.downloadArtifact(
                this.REMOTE_REPOSITORY,
                ForgeRepoStructure.FORGE_GROUP,
                ForgeRepoStructure.FORGE_ARTIFACT,
                artifactVersion, 'universal', 'jar')
        } else {
            console.debug('Using locally discovered forge.')
        }
        console.debug(`Beginning processing of Forge v${this.forgeVersion} (Minecraft ${this.minecraftVersion})`)
    }

    // TODO
    // extract manifest
    // parse manifest
    // return module

}
