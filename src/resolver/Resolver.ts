import { Module } from 'helios-distribution-types'

export interface Resolver {

    getModule(): Promise<Module>

}
