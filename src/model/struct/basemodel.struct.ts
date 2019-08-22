import { mkdirs } from 'fs-extra'
import { join, resolve } from 'path'
import { ModelStructure } from './model.struct'

export abstract class BaseModelStructure<T> implements ModelStructure<T[]> {

    protected resolvedModels: T[] | undefined
    protected containerDirectory: string

    constructor(
        protected absoluteRoot: string,
        protected relativeRoot: string,
        protected structRoot: string,
        protected baseUrl: string
    ) {
        this.relativeRoot = join(relativeRoot, structRoot)
        this.containerDirectory = resolve(absoluteRoot, structRoot)
    }

    public async init() {
        mkdirs(this.containerDirectory)
    }

    public abstract async getSpecModel(): Promise<T[]>

}
