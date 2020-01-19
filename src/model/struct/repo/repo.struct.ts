import { join } from 'path'
import { BaseFileStructure } from '../BaseFileStructure'
import { LibRepoStructure } from './librepo.struct'
import { VersionRepoStructure } from './versionrepo.struct'

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

    public async init() {
        super.init()
        await this.libRepoStruct.init()
        await this.versionRepoStruct.init()
    }

    public getLibRepoStruct() {
        return this.libRepoStruct
    }

    public getVersionRepoStruct() {
        return this.versionRepoStruct
    }

    public getTempDirectory() {
        return join(this.absoluteRoot, 'temp')
    }

    public getWorkDirectory() {
        return join(this.absoluteRoot, 'work')
    }

}
