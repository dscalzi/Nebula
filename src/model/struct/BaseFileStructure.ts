import { mkdirs } from 'fs-extra'
import { join, resolve } from 'path'
import { FileStructure } from './FileStructure'

export abstract class BaseFileStructure implements FileStructure {

    protected containerDirectory: string

    constructor(
        protected absoluteRoot: string,
        protected relativeRoot: string,
        protected structRoot: string
    ) {
        this.relativeRoot = join(relativeRoot, structRoot)
        this.containerDirectory = resolve(absoluteRoot, structRoot)
    }

    public async init(): Promise<void> {
        mkdirs(this.containerDirectory)
    }

}
