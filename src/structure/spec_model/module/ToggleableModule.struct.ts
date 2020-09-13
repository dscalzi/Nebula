import { ModuleStructure, ModuleCandidate } from './Module.struct'
import { Type, Module } from 'helios-distribution-types'
import { Stats, mkdirs } from 'fs-extra'
import { resolve } from 'path'
import { MinecraftVersion } from '../../../util/MinecraftVersion'

export enum ToggleableNamespace {

    REQUIRED = 'required',
    OPTIONAL_ON = 'optionalon',
    OPTIONAL_OFF = 'optionaloff'

}

export interface ToggleableModuleCandidate extends ModuleCandidate {
    namespace: ToggleableNamespace
}

export abstract class ToggleableModuleStructure extends ModuleStructure {
    
    private activeNamespace: string | undefined

    constructor(
        absoluteRoot: string,
        relativeRoot: string,
        structRoot: string,
        baseUrl: string,
        minecraftVersion: MinecraftVersion,
        type: Type,
        filter?: ((name: string, path: string, stats: Stats) => boolean)
    ) {
        super(absoluteRoot, relativeRoot, structRoot, baseUrl, minecraftVersion, type, filter)
    }

    public async init(): Promise<void> {
        await super.init()
        for(const namespace of Object.values(ToggleableNamespace)) {
            await mkdirs(resolve(this.containerDirectory, namespace))
        }
    }

    public async getSpecModel(): Promise<Module[]> {
        if (this.resolvedModels == null) {

            const moduleCandidates: ToggleableModuleCandidate[] = []
            for(const value of Object.values(ToggleableNamespace)) {
                moduleCandidates.push(...(await super._doModuleDiscovery(resolve(this.containerDirectory, value))).map(val => ({...val, namespace: value})))
            }

            this.resolvedModels = await this._doModuleRetrieval(moduleCandidates, {
                preProcess: (candidate) => {
                    this.activeNamespace = (candidate as ToggleableModuleCandidate).namespace
                },
                postProcess: (module) => {
                    this.getNamespaceMapper(this.activeNamespace as ToggleableNamespace)(module)
                }
            })

            // Cleanup
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