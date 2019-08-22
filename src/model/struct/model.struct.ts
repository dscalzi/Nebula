export interface ModelStructure<T> {

    init(): void

    getSpecModel(): Promise<T>

}
