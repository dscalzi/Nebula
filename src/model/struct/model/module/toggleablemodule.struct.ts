import { ModuleStructure } from './module.struct'
import { Type, Module } from 'helios-distribution-types'
import { Stats, mkdirs } from 'fs-extra'
import { resolve } from 'path'

export enum ToggleableNamespace {

    REQUIRED = 'required',
    OPTIONAL_ON = 'optionalon',
    OPTIONAL_OFF = 'optionaloff'

}

export abstract class ToggleableModuleStructure extends ModuleStructure {
    
    private activeNamespace: string | undefined

    constructor(
        absoluteRoot: string,
        relativeRoot: string,
        structRoot: string,
        baseUrl: string,
        protected type: Type,
        protected filter?: ((name: string, path: string, stats: Stats) => boolean)
    ) {
        super(absoluteRoot, relativeRoot, structRoot, baseUrl, type, filter)
    }

    public async init(): Promise<void> {
        await super.init()
        for(const namespace of Object.values(ToggleableNamespace)) {
            await mkdirs(resolve(this.containerDirectory, namespace))
        }
    }

    public async getSpecModel(): Promise<Module[]> {
        if (this.resolvedModels == null) {

            this.resolvedModels = []
            for(const value of Object.values(ToggleableNamespace)) {
                this.activeNamespace = value
                const models = await this._doModuleRetrieval(resolve(this.containerDirectory, value))
                models.forEach(this.getNamespaceMapper(value))
                this.resolvedModels = this.resolvedModels.concat(models)
            }
            this.activeNamespace = undefined

        }

        return this.resolvedModels
    }
    
    protected getActiveNamespace(): string {
        return this.activeNamespace || ''
    }

    protected getNamespaceMapper(namespace: ToggleableNamespace): (x: Module) => void {
        switch(namespace) {
            case ToggleableNamespace.REQUIRED:
                return () => { /* do nothing */ }
            case ToggleableNamespace.OPTIONAL_ON:
                return (x) => x.required = { value: false }
            case ToggleableNamespace.OPTIONAL_OFF:
                return (x) => x.required = { value: false, def: false }
        }
    }

}