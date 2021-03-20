import { mkdirs } from 'fs-extra'
import { join } from 'path'
import { BaseFileStructure } from '../BaseFileStructure'
import { LibRepoStructure } from './LibRepo.struct'
import { VersionRepoStructure } from './VersionRepo.struct'

export class RepoStructure extends BaseFileStructure {

    private libRepoStruct: LibRepoStructure
    private versionRepoStruct: VersionRepoStructure

    constructor(
        absoluteRoot: string,
        relativeRoot: string
    ) {
        super(absoluteRoot, relativeRoot, 'repo')
        this.libRepoStruct = new LibRepoStructure(this.containerDirectory, this.relativeRoot)
        this.versionRepoStruct = new VersionRepoStructure(this.containerDirectory, this.relativeRoot)
    }

    public getLoggerName(): string {
        return 'RepoStructure'
    }

    public async init(): Promise<void> {
        super.init()
        await this.libRepoStruct.init()
        await this.versionRepoStruct.init()
        await mkdirs(this.getCacheDirectory())
    }

    public getLibRepoStruct(): LibRepoStructure {
        return this.libRepoStruct
    }

    public getVersionRepoStruct(): VersionRepoStructure {
        return this.versionRepoStruct
    }

    public getTempDirectory(): string {
        return join(this.absoluteRoot, 'temp')
    }

    public getWorkDirectory(): string {
        return join(this.absoluteRoot, 'work')
    }

    public getCacheDirectory(): string {
        return join(this.absoluteRoot, 'cache')
    }

    public getForgeCacheDirectory(artifactVersion: string): string {
        return join(this.getCacheDirectory(), 'forge', artifactVersion)
    }

}
