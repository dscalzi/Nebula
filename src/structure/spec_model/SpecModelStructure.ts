import { FileStructure } from '../FileStructure'

export interface SpecModelStructure<T> extends FileStructure {

    getSpecModel(): Promise<T>

}
