import { Module } from '../model/spec/module'

export interface Resolver {

    getModule(): Promise<Module>

}
