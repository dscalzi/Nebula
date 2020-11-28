import { BaseFileStructure } from '../BaseFileStructure'
import { SpecModelStructure } from './SpecModelStructure'

export abstract class BaseModelStructure<T> extends BaseFileStructure implements SpecModelStructure<T[]> {

    protected resolvedModels: T[] | undefined

    constructor(
        absoluteRoot: string,
        relativeRoot: string,
        structRoot: string,
        protected baseUrl: string
    ) {
        super(absoluteRoot, relativeRoot, structRoot)
    }

    public abstract getSpecModel(): Promise<T[]>

}
