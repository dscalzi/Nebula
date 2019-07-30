export const Types: {[property: string]: Type} = {

    Library: {
        id: 'Library',
        defaultExtension: 'jar'
    },
    /**
     * @deprecated Will be replaced by Types.Forge.
     */
    ForgeHosted: {
        id: 'ForgeHosted',
        defaultExtension: 'jar'
    },
    Forge: {
        id: 'Forge',
        defaultExtension: 'jar'
    },
    LiteLoader: {
        id: 'LiteLoader',
        defaultExtension: 'jar'
    },
    ForgeMod: {
        id: 'ForgeMod',
        defaultExtension: 'jar'
    },
    LiteMod: {
        id: 'LiteMod',
        defaultExtension: 'litemod'
    },
    File: {
        id: 'File'
    },
    VersionManifest: {
        id: 'VersionManifest',
        defaultExtension: 'json'
    }

}

export interface Type {

    id: string
    defaultExtension?: string

}
