import { FileStructure } from '../FileStructure'

export interface ModelStructure<T> extends FileStructure {

    getSpecModel(): Promise<T>

}
