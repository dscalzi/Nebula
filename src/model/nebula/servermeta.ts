import { Server } from 'helios-distribution-types'

export interface ServerMetaOptions {
    forgeVersion?: string
    liteloaderVersion?: string
}

export function getDefaultServerMeta(id: string, version: string, options?: ServerMetaOptions): ServerMeta {

    const servMeta: ServerMeta = {
        meta: {
            version: '1.0.0',
            name: `${id} (Minecraft ${version})`,
            description: `${id} Running Minecraft ${version}`,
            address: 'localhost:25565',
            discord: {
                shortId: '<FILL IN OR REMOVE DISCORD OBJECT>',
                largeImageText: '<FILL IN OR REMOVE DISCORD OBJECT>',
                largeImageKey: '<FILL IN OR REMOVE DISCORD OBJECT>'
            },
            mainServer: false,
            autoconnect: false
        }
    }

    if(options?.forgeVersion) {
        servMeta.meta.description = `${servMeta.meta.description} (Forge v${options.forgeVersion})`
        servMeta.forge = {
            version: options.forgeVersion
        }
    }

    if(options?.liteloaderVersion) {
        servMeta.meta.description = `${servMeta.meta.description} (Liteloader v${options.liteloaderVersion})`
        servMeta.liteloader = {
            version: options.liteloaderVersion
        }
    }

    return servMeta
}

export interface ServerMeta {

    meta: {
        version: Server['version']
        name: Server['name']
        description: Server['description']
        address: Server['address']
        discord?: Server['discord']
        mainServer: Server['mainServer']
        autoconnect: Server['autoconnect']
    }

    forge?: {
        version: string
    }

    liteloader?: {
        version: string
    }

}
