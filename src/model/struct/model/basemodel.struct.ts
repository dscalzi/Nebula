import { BaseFileStructure } from '../BaseFileStructure'
import { ModelStructure } from './ModelStructure'

export abstract class BaseModelStructure<T> extends BaseFileStructure implements ModelStructure<T[]> {

    protected resolvedModels: T[] | undefined

    constructor(
        absoluteRoot: string,
        relativeRoot: string,
        structRoot: string,
        protected baseUrl: string
    ) {
        super(absoluteRoot, relativeRoot, structRoot)
    }

    public abstract async getSpecModel(): Promise<T[]>

}
