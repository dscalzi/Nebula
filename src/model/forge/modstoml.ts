// https://github.com/MinecraftForge/MinecraftForge/blob/1.15.x/mdk/src/main/resources/META-INF/mods.toml

export interface ModsToml {

    modLoader: string
    loaderVersion: string
    issueTrackerURL?: string

    mods: Array<{
        modId: string
        version: string
        displayName: string
        updateJSONURL?: string
        displayURL?: string
        logoFile?: string
        credits?: string
        authors?: string
        description: string
    }>

    dependencies?: {[modId: string]: {
        modId: string
        mandatory: boolean
        versionRange: string
        ordering?: 'NONE' | 'BEFORE' | 'AFTER'
        side: 'BOTH' | 'CLIENT' | 'SERVER'
    }}

}
