import { Module } from 'helios-distribution-types'
import { VersionSegmented } from '../util/VersionSegmented'
import { Resolver } from './resolver'

export abstract class BaseResolver implements Resolver, VersionSegmented {

    constructor(
        protected absoluteRoot: string,
        protected relativeRoot: string,
        protected baseUrl: string
    ) {}

    public abstract getModule(): Promise<Module>

    public abstract isForVersion(version: string): boolean

}
