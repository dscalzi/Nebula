export interface FabricVersionMeta {
    version: string
    stable: boolean
}

export interface FabricLoaderMeta extends FabricVersionMeta {
    separator: string
    build: number
    maven: string
}

export interface FabricInstallerMeta extends FabricVersionMeta {
    url: string
    maven: string
}

// This is really a mojang format, but it's currently only used here for Fabric.
export interface FabricProfileJson {
    id: string
    inheritsFrom: string
    releaseTime: string
    time: string
    type: string
    mainClass: string
    arguments: {
        game: string[]
        jvm: string[]
    }
    libraries: {
        name: string // Maven identifier
        url: string
    }[]
}