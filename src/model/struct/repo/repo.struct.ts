import { join } from 'path'
import { BaseFileStructure } from '../BaseFileStructure'
import { ForgeRepoStructure } from './forgerepo.struct'
import { LibRepoStructure } from './librepo.struct'
import { LiteLoaderRepoStructure } from './liteloaderrepo.struct'

export class RepoStructure extends BaseFileStructure {

    private forgeRepoStruct: ForgeRepoStructure
    private liteloaderRepoStruct: LiteLoaderRepoStructure
    private libRepoStruct: LibRepoStructure

    constructor(
        absoluteRoot: string,
        relativeRoot: string
    ) {
        super(absoluteRoot, relativeRoot, 'repo')
        this.forgeRepoStruct = new ForgeRepoStructure(this.containerDirectory, this.relativeRoot)
        this.liteloaderRepoStruct = new LiteLoaderRepoStructure(this.containerDirectory, this.relativeRoot)
        this.libRepoStruct = new LibRepoStructure(this.containerDirectory, this.relativeRoot)
    }

    public async init() {
        super.init()
        await this.forgeRepoStruct.init()
        await this.liteloaderRepoStruct.init()
        await this.libRepoStruct.init()
    }

    public getForgeRepoStruct() {
        return this.forgeRepoStruct
    }

    public getLiteLoaderRepoStruct() {
        return this.liteloaderRepoStruct
    }

    public getLibRepoStruct() {
        return this.libRepoStruct
    }

    public getTempDirectory() {
        return join(this.absoluteRoot, 'temp')
    }

    public getWorkDirectory() {
        return join(this.absoluteRoot, 'work')
    }

}
