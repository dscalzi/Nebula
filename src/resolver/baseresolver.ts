import { Module } from '../model/spec/module'
import { Resolver } from './resolver'

export abstract class BaseResolver implements Resolver {

    constructor(
        protected absoluteRoot: string,
        protected relativeRoot: string
    ) {}

    public abstract getModule(): Promise<Module>

}
